import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { randomUUID } from 'crypto'

const db = new PrismaClient({
  log: ['query'],
}).$extends(withAccelerate())

async function generateSampleData() {
  try {
    console.log('Generating sample data...')
    
    // Generate sample dataset
    const sampleData = []
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

    console.log('Generated', sampleData.length, 'data points')

    // Store in database
    const dataset = await db.dataset.create({
      data: {
        id: randomUUID(),
        name: 'sample_clustering_data_' + Date.now(),
        filename: 'sample_dataset.csv',
        rows: sampleData.length,
        columns: 4,
        data: JSON.stringify({
          columns: ['feature1', 'feature2', 'feature3', 'feature4'],
          data: sampleData
        })
      }
    })

    console.log('✅ Sample data created successfully with ID:', dataset.id)
    console.log('Dataset name:', dataset.name)
    
  } catch (error) {
    console.error('❌ Sample generation error:', error.message)
    console.error('Full error:', error)
  } finally {
    await db.$disconnect()
  }
}

generateSampleData()