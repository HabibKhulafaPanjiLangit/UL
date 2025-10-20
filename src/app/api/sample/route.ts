import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    // Generate sample dataset
    const sampleData: Array<{
      feature1: number;
      feature2: number;
      feature3: number;
      feature4: number;
    }> = []
    const clusters = 3
    const pointsPerCluster = 30
    
    for (let c = 0; c < clusters; c++) {
      const centerX = (c + 1) * 3
      const centerY = (c + 1) * 3
      
      for (let i = 0; i < pointsPerCluster; i++) {
        sampleData.push({
          feature1: centerX + (Math.random() - 0.5) * 2,
          feature2: centerY + (Math.random() - 0.5) * 2,
          feature3: (c + 1) * 2 + (Math.random() - 0.5) * 1.5,
          feature4: (c + 1) * 2.5 + (Math.random() - 0.5) * 1.8
        })
      }
    }
    
    // Store in database
    const dataset = await db.dataset.create({
      data: {
        id: randomUUID(),
        name: 'sample_clustering_data',
        filename: 'sample_dataset.csv',
        rows: sampleData.length,
        columns: 4,
        data: JSON.stringify({
          columns: ['feature1', 'feature2', 'feature3', 'feature4'],
          data: sampleData
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
    console.error('Sample generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to generate sample data', 
      details: errorMessage 
    }, { status: 500 })
  }
}