import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalRows: number
    totalColumns: number
    numericColumns: number
    categoricalColumns: number
    missingValues: number
    duplicateRows: number
  }
  cleanedData?: any[]
  columnTypes?: { [key: string]: 'numeric' | 'categorical' | 'mixed' }
}

export interface DataCleaningOptions {
  removeDuplicates?: boolean
  handleMissingValues?: 'remove' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'backward_fill'
  normalizeNumeric?: boolean
  convertTypes?: boolean
  removeOutliers?: boolean
  outlierMethod?: 'iqr' | 'zscore'
  outlierThreshold?: number
}

/**
 * Parse different file formats
 */
export function parseFile(file: File): Promise<{ data: any[], format: string }> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result

        switch (extension) {
          case 'csv':
            parseCsv(content as string, resolve, reject)
            break
          case 'json':
            parseJson(content as string, resolve, reject)
            break
          case 'xlsx':
          case 'xls':
            parseExcel(content as ArrayBuffer, resolve, reject)
            break
          default:
            reject(new Error(`Unsupported file format: ${extension}`))
        }
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))

    if (extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  })
}

function parseCsv(content: string, resolve: Function, reject: Function) {
  Papa.parse(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (result) => {
      if (result.errors.length > 0) {
        const errorMessages = result.errors
          .map(e => typeof e === 'object' && 'message' in e ? e.message : String(e))
          .join(', ');
        reject(new Error(`CSV parsing errors: ${errorMessages}`))
      } else {
        resolve({ data: result.data, format: 'csv' })
      }
    },
    error: (error) => reject(new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
  })
}

function parseJson(content: string, resolve: Function, reject: Function) {
  try {
    const data = JSON.parse(content)
    
    // Handle different JSON structures
    let parsedData = data
    if (Array.isArray(data)) {
      parsedData = data
    } else if (data.data && Array.isArray(data.data)) {
      parsedData = data.data
    } else if (typeof data === 'object') {
      // Convert object to array of key-value pairs
      parsedData = Object.entries(data).map(([key, value]) => ({ key, value }))
    }
    
    resolve({ data: parsedData, format: 'json' })
  } catch (error) {
    reject(new Error('Invalid JSON format'))
  }
}

function parseExcel(content: ArrayBuffer, resolve: Function, reject: Function) {
  try {
    const workbook = XLSX.read(content, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    
    if (!sheetName) {
      reject(new Error('No sheets found in Excel file'))
      return
    }
    
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    })
    
    // Convert to object format with headers
    if (data.length > 0) {
      const headers = data[0] as string[]
      const rows = data.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = (row as any[])[index] || null
        })
        return obj
      })
      
      resolve({ data: rows, format: 'excel' })
    } else {
      resolve({ data: [], format: 'excel' })
    }
  } catch (error) {
    reject(new Error('Failed to parse Excel file'))
  }
}

/**
 * Validate and analyze data quality
 */
export function validateData(data: any[]): DataValidationResult {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalRows: 0,
      totalColumns: 0,
      numericColumns: 0,
      categoricalColumns: 0,
      missingValues: 0,
      duplicateRows: 0
    },
    columnTypes: {}
  }

  if (!Array.isArray(data) || data.length === 0) {
    result.isValid = false
    result.errors.push('Data is empty or not an array')
    return result
  }

  const firstRow = data[0]
  if (typeof firstRow !== 'object' || firstRow === null) {
    result.isValid = false
    result.errors.push('Data should contain objects/rows')
    return result
  }

  const columns = Object.keys(firstRow)
  result.summary.totalRows = data.length
  result.summary.totalColumns = columns.length

  // Analyze each column
  for (const column of columns) {
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '')
    const nonEmptyValues = values.length
    const missingCount = data.length - nonEmptyValues

    result.summary.missingValues += missingCount

    if (missingCount > data.length * 0.5) {
      result.warnings.push(`Column '${column}' has more than 50% missing values`)
    }

    // Determine column type
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)))
    const isNumeric = numericValues.length / nonEmptyValues > 0.8

    if (isNumeric) {
      result.columnTypes![column] = 'numeric'
      result.summary.numericColumns++
    } else {
      result.columnTypes![column] = 'categorical'
      result.summary.categoricalColumns++
    }

    // Check for unique values (potential ID columns)
    const uniqueValues = new Set(values)
    if (uniqueValues.size === nonEmptyValues && nonEmptyValues > 0) {
      result.warnings.push(`Column '${column}' appears to be a unique identifier`)
    }
  }

  // Check for duplicate rows
  const rowStrings = data.map(row => JSON.stringify(row))
  const uniqueRows = new Set(rowStrings)
  result.summary.duplicateRows = data.length - uniqueRows.size

  if (result.summary.duplicateRows > 0) {
    result.warnings.push(`Found ${result.summary.duplicateRows} duplicate rows`)
  }

  // Validation checks
  if (result.summary.numericColumns === 0) {
    result.errors.push('No numeric columns found - clustering requires numeric data')
    result.isValid = false
  }

  if (result.summary.totalRows < 10) {
    result.warnings.push('Dataset is very small (less than 10 rows) - results may not be meaningful')
  }

  if (result.summary.missingValues > data.length * columns.length * 0.3) {
    result.warnings.push('Dataset has more than 30% missing values')
  }

  return result
}

/**
 * Clean and preprocess data
 */
export function cleanData(data: any[], options: DataCleaningOptions = {}): any[] {
  let cleanedData = [...data]

  // Remove duplicates
  if (options.removeDuplicates) {
    const seen = new Set()
    cleanedData = cleanedData.filter(row => {
      const key = JSON.stringify(row)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Get numeric columns
  const firstRow = cleanedData[0]
  if (!firstRow) return cleanedData

  const numericColumns = Object.keys(firstRow).filter(col => {
    const values = cleanedData.map(row => row[col]).filter(v => v !== null && v !== undefined)
    return values.some(v => typeof v === 'number' || !isNaN(Number(v)))
  })

  // Handle missing values
  if (options.handleMissingValues && options.handleMissingValues !== 'remove') {
    for (const column of numericColumns) {
      const values = cleanedData.map(row => {
        const val = row[column]
        return (val !== null && val !== undefined && val !== '') ? Number(val) : null
      }).filter(v => v !== null) as number[]

      let fillValue = 0
      switch (options.handleMissingValues) {
        case 'mean':
          fillValue = values.reduce((sum, val) => sum + val, 0) / values.length
          break
        case 'median':
          const sorted = [...values].sort((a, b) => a - b)
          fillValue = sorted[Math.floor(sorted.length / 2)]
          break
        case 'mode':
          const freq: { [key: number]: number } = {}
          values.forEach(val => freq[val] = (freq[val] || 0) + 1)
          fillValue = Number(Object.keys(freq).reduce((a, b) => freq[Number(a)] > freq[Number(b)] ? a : b))
          break
      }

      cleanedData = cleanedData.map(row => ({
        ...row,
        [column]: (row[column] !== null && row[column] !== undefined && row[column] !== '') 
          ? Number(row[column]) 
          : fillValue
      }))
    }
  } else if (options.handleMissingValues === 'remove') {
    cleanedData = cleanedData.filter(row => {
      return numericColumns.every(col => {
        const val = row[col]
        return val !== null && val !== undefined && val !== ''
      })
    })
  }

  // Convert types
  if (options.convertTypes) {
    cleanedData = cleanedData.map(row => {
      const newRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        if (numericColumns.includes(key)) {
          newRow[key] = Number(value)
        } else {
          newRow[key] = value
        }
      }
      return newRow
    })
  }

  // Remove outliers
  if (options.removeOutliers && options.outlierMethod) {
    for (const column of numericColumns) {
      const values = cleanedData.map(row => Number(row[column])).filter(v => !isNaN(v))
      
      let outlierIndices: number[] = []
      
      if (options.outlierMethod === 'iqr') {
        const sorted = [...values].sort((a, b) => a - b)
        const q1 = sorted[Math.floor(sorted.length * 0.25)]
        const q3 = sorted[Math.floor(sorted.length * 0.75)]
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        
        cleanedData.forEach((row, index) => {
          const val = Number(row[column])
          if (val < lowerBound || val > upperBound) {
            outlierIndices.push(index)
          }
        })
      } else if (options.outlierMethod === 'zscore') {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const std = Math.sqrt(values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length)
        const threshold = options.outlierThreshold || 3
        
        cleanedData.forEach((row, index) => {
          const val = Number(row[column])
          const zscore = Math.abs((val - mean) / std)
          if (zscore > threshold) {
            outlierIndices.push(index)
          }
        })
      }
      
      // Remove outliers (only if not too many)
      if (outlierIndices.length < cleanedData.length * 0.1) {
        cleanedData = cleanedData.filter((_, index) => !outlierIndices.includes(index))
      }
    }
  }

  // Normalize numeric data
  if (options.normalizeNumeric) {
    const stats: { [key: string]: { min: number; max: number } } = {}
    
    // Calculate min/max for each numeric column
    for (const column of numericColumns) {
      const values = cleanedData.map(row => Number(row[column])).filter(v => !isNaN(v))
      stats[column] = {
        min: Math.min(...values),
        max: Math.max(...values)
      }
    }
    
    // Normalize to 0-1 range
    cleanedData = cleanedData.map(row => {
      const newRow = { ...row }
      for (const column of numericColumns) {
        const val = Number(row[column])
        const { min, max } = stats[column]
        if (max > min) {
          newRow[column] = (val - min) / (max - min)
        }
      }
      return newRow
    })
  }

  return cleanedData
}

/**
 * Export data to different formats
 */
export function exportData(data: any[], format: 'csv' | 'json' | 'xlsx', filename?: string): Blob {
  switch (format) {
    case 'csv':
      return exportToCsv(data, filename)
    case 'json':
      return exportToJson(data)
    case 'xlsx':
      return exportToExcel(data, filename)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

function exportToCsv(data: any[], filename?: string): Blob {
  const csv = Papa.unparse(data, {
    header: true,
    delimiter: ','
  })
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
}

function exportToJson(data: any[]): Blob {
  const json = JSON.stringify(data, null, 2)
  return new Blob([json], { type: 'application/json' })
}

function exportToExcel(data: any[], filename?: string): Blob {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  })
  
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
}

/**
 * Generate data sample for preview
 */
export function generateDataSample(data: any[], sampleSize: number = 100): any[] {
  if (data.length <= sampleSize) {
    return data
  }
  
  // Random sampling
  const indices = new Set<number>()
  while (indices.size < sampleSize) {
    indices.add(Math.floor(Math.random() * data.length))
  }
  
  return Array.from(indices).map(i => data[i])
}