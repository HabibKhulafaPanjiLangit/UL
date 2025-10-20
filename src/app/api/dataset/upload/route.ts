import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parse } from 'csv-parse/sync'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Check file size before processing (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 50MB.` 
      }, { status: 413 })
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const csvContent = buffer.toString('utf-8')

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    // Validate data
    if (records.length === 0) {
      return NextResponse.json({ error: 'Empty CSV file' }, { status: 400 })
    }

    // Extract numeric columns
    const numericColumns = Object.keys(records[0] as Record<string, any>).filter(key => {
      return records.every(record => {
        const value = parseFloat((record as Record<string, any>)[key])
        return !isNaN(value)
      })
    })

    if (numericColumns.length === 0) {
      return NextResponse.json({ error: 'No numeric columns found in CSV' }, { status: 400 })
    }

    // Check dataset size - limit to prevent database overflow
    const MAX_ROWS = 10000; // Limit rows to prevent large datasets
    const limitedRecords = records.slice(0, MAX_ROWS);
    
    if (records.length > MAX_ROWS) {
      console.warn(`Dataset truncated from ${records.length} to ${MAX_ROWS} rows to prevent database overflow`);
    }

    // Convert to numeric data
    const numericData = limitedRecords.map(record => {
      const numericRecord: any = {}
      const typedRecord = record as Record<string, any>
      numericColumns.forEach(col => {
        const value = parseFloat(typedRecord[col])
        numericRecord[col] = isNaN(value) ? 0 : value // Handle NaN values
      })
      return numericRecord
    })

    // Check final data size before storing
    const dataString = JSON.stringify({
      columns: numericColumns,
      data: numericData
    });
    
    const dataSizeInMB = Buffer.byteLength(dataString, 'utf8') / (1024 * 1024);
    if (dataSizeInMB > 4) { // Keep under 4MB to be safe
      return NextResponse.json({ 
        error: `Dataset too large (${dataSizeInMB.toFixed(2)}MB). Please use a smaller dataset (max 4MB).` 
      }, { status: 413 })
    }

    // Store in database
    const dataset = await db.dataset.create({
      data: {
        id: randomUUID(),
        name: file.name.replace('.csv', ''),
        filename: file.name,
        rows: limitedRecords.length,
        columns: numericColumns.length,
        data: dataString
      }
    })

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        rows: dataset.rows,
        columns: dataset.columns,
        uploadedAt: dataset.uploadedAt
      },
      warning: records.length > MAX_ROWS ? `Dataset was truncated to ${MAX_ROWS} rows` : undefined
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const datasets = await db.dataset.findMany({
      select: {
        id: true,
        name: true,
        rows: true,
        columns: true,
        uploadedAt: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json({ datasets })
  } catch (error) {
    console.error('Fetch datasets error:', error)
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 })
  }
}