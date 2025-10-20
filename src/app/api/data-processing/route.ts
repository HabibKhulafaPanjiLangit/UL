import { NextRequest, NextResponse } from 'next/server'
import { validateData, cleanData, DataCleaningOptions } from '@/lib/data-processing'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const cleaningOptions = formData.get('cleaningOptions') as string
    const validateOnly = formData.get('validateOnly') === 'true'

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { status: 400 })
    }

    // Parse cleaning options
    let options: DataCleaningOptions = {}
    if (cleaningOptions) {
      try {
        options = JSON.parse(cleaningOptions)
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid cleaning options format'
        }, { status: 400 })
      }
    }

    // Parse file based on extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    let data: any[] = []

    try {
      const fileContent = await file.text()
      
      switch (extension) {
        case 'csv':
          const csvResult = Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
          })
          if (csvResult.errors.length > 0) {
            return NextResponse.json({
              error: `CSV parsing errors: ${csvResult.errors.map(e => e.message).join(', ')}`
            }, { status: 400 })
          }
          data = csvResult.data as any[]
          break

        case 'json':
          const jsonData = JSON.parse(fileContent)
          if (Array.isArray(jsonData)) {
            data = jsonData
          } else if (jsonData.data && Array.isArray(jsonData.data)) {
            data = jsonData.data
          } else {
            return NextResponse.json({
              error: 'JSON should contain an array of objects'
            }, { status: 400 })
          }
          break

        case 'xlsx':
        case 'xls':
          const fileBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(fileBuffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          
          if (!sheetName) {
            return NextResponse.json({
              error: 'No sheets found in Excel file'
            }, { status: 400 })
          }
          
          const worksheet = workbook.Sheets[sheetName]
          const excelData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: null 
          })
          
          if (excelData.length > 0) {
            const headers = excelData[0] as string[]
            data = excelData.slice(1).map(row => {
              const obj: any = {}
              headers.forEach((header, index) => {
                obj[header] = (row as any[])[index] || null
              })
              return obj
            })
          }
          break

        default:
          return NextResponse.json({
            error: `Unsupported file format: ${extension}`
          }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({
        error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 })
    }

    // Validate data
    const validation = validateData(data)

    if (validateOnly) {
      return NextResponse.json({
        success: true,
        validation,
        sampleData: data.slice(0, 5) // Return first 5 rows as sample
      })
    }

    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Data validation failed',
        validation
      }, { status: 400 })
    }

    // Clean data if options provided
    let processedData = data
    if (Object.keys(options).length > 0) {
      processedData = cleanData(data, options)
      
      // Validate cleaned data
      const cleanedValidation = validateData(processedData)
      if (!cleanedValidation.isValid) {
        return NextResponse.json({
          error: 'Cleaned data validation failed',
          validation: cleanedValidation
        }, { status: 400 })
      }
    }

    // Store in database
    const dataset = await db.dataset.create({
      data: {
        id: randomUUID(),
        name: file.name,
        filename: file.name,
        rows: processedData.length,
        columns: Object.keys(processedData[0] || {}).length,
        data: JSON.stringify(processedData)
      }
    })

    // Create data profile
    await createDataProfile(dataset.id, processedData, validation)

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      validation,
      originalRows: data.length,
      processedRows: processedData.length,
      cleaningApplied: Object.keys(options).length > 0,
      sampleData: processedData.slice(0, 10)
    })

  } catch (error) {
    console.error('Enhanced import error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const datasetId = searchParams.get('datasetId')
    const format = searchParams.get('format') as 'csv' | 'json' | 'xlsx' | null

    if (!datasetId) {
      return NextResponse.json({ 
        error: 'Dataset ID is required' 
      }, { status: 400 })
    }

    // Get dataset from database
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId }
    })

    if (!dataset) {
      return NextResponse.json({
        error: 'Dataset not found'
      }, { status: 404 })
    }

    const data = JSON.parse(dataset.data)

    if (!format) {
      // Return dataset info
      return NextResponse.json({
        success: true,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          filename: dataset.filename,
          rows: dataset.rows,
          columns: dataset.columns,
          uploadedAt: dataset.uploadedAt,
          sampleData: data.slice(0, 10)
        }
      })
    }

    // Export data in requested format
    let content: string
    let mimeType: string
    let filename: string

    switch (format) {
      case 'csv':
        content = Papa.unparse(data, { header: true })
        mimeType = 'text/csv'
        filename = `${dataset.name.replace(/\.[^/.]+$/, '')}.csv`
        break

      case 'json':
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        filename = `${dataset.name.replace(/\.[^/.]+$/, '')}.json`
        break

      case 'xlsx':
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
        
        const buffer = XLSX.write(workbook, { 
          bookType: 'xlsx', 
          type: 'buffer' 
        })
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${dataset.name.replace(/\.[^/.]+$/, '')}.xlsx"`
          }
        })

      default:
        return NextResponse.json({
          error: `Unsupported format: ${format}`
        }, { status: 400 })
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Enhanced export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

async function createDataProfile(datasetId: string, data: any[], validation: any) {
  try {
    // Calculate basic statistics
    const numericColumns = Object.keys(validation.columnTypes || {}).filter(
      col => validation.columnTypes![col] === 'numeric'
    )

    const statistics: any = {}
    const correlations: any = {}
    const distributions: any = {}

    // Calculate statistics for numeric columns
    for (const column of numericColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
      
      if (values.length > 0) {
        values.sort((a, b) => a - b)
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const median = values[Math.floor(values.length / 2)]
        const min = values[0]
        const max = values[values.length - 1]
        const std = Math.sqrt(values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length)
        
        statistics[column] = {
          count: values.length,
          mean: Math.round(mean * 10000) / 10000,
          median: Math.round(median * 10000) / 10000,
          min,
          max,
          std: Math.round(std * 10000) / 10000,
          q25: values[Math.floor(values.length * 0.25)],
          q75: values[Math.floor(values.length * 0.75)]
        }

        // Create histogram data for distributions
        const bins = 10
        const binSize = (max - min) / bins
        const histogram = new Array(bins).fill(0)
        
        values.forEach(val => {
          const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1)
          histogram[binIndex]++
        })
        
        distributions[column] = {
          histogram,
          bins: bins,
          binSize,
          min,
          max
        }
      }
    }

    // Calculate correlations between numeric columns
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i; j < numericColumns.length; j++) {
        const col1 = numericColumns[i]
        const col2 = numericColumns[j]
        
        if (col1 === col2) {
          correlations[`${col1}_${col2}`] = 1
          continue
        }

        const values1 = data.map(row => Number(row[col1])).filter(v => !isNaN(v))
        const values2 = data.map(row => Number(row[col2])).filter(v => !isNaN(v))
        
        if (values1.length === values2.length && values1.length > 1) {
          const correlation = calculateCorrelation(values1, values2)
          correlations[`${col1}_${col2}`] = Math.round(correlation * 10000) / 10000
          correlations[`${col2}_${col1}`] = Math.round(correlation * 10000) / 10000
        }
      }
    }

    // Simple outlier detection using IQR
    const outliers: any = {}
    for (const column of numericColumns) {
      const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
      
      if (values.length > 0) {
        values.sort((a, b) => a - b)
        const q1 = values[Math.floor(values.length * 0.25)]
        const q3 = values[Math.floor(values.length * 0.75)]
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        
        outliers[column] = values.filter(v => v < lowerBound || v > upperBound).length
      }
    }

    await (db as any).dataProfile.create({
      data: {
        datasetId,
        statistics: JSON.stringify(statistics),
        correlations: JSON.stringify(correlations),
        distributions: JSON.stringify(distributions),
        outliers: JSON.stringify(outliers),
        missingData: JSON.stringify(validation.summary)
      }
    })
  } catch (error) {
    console.error('Failed to create data profile:', error)
    // Don't throw error, profiling is optional
  }
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n === 0) return 0

  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}