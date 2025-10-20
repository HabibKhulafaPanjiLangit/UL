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

    // Convert to numeric data
    const numericData = records.map(record => {
      const numericRecord: any = {}
      const typedRecord = record as Record<string, any>
      numericColumns.forEach(col => {
        numericRecord[col] = parseFloat(typedRecord[col])
      })
      return numericRecord
    })

    // Store in database
    const dataset = await db.dataset.create({
      data: {
        id: randomUUID(),
        name: file.name.replace('.csv', ''),
        filename: file.name,
        rows: records.length,
        columns: numericColumns.length,
        data: JSON.stringify({
          columns: numericColumns,
          data: numericData
        })
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
      }
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