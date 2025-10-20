import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const db = new PrismaClient({
  log: ['query'],
}).$extends(withAccelerate())

async function testDatabase() {
  try {
    console.log('Testing database connection...')

    // Test database connection
    await db.$connect()
    console.log('✅ Database connected successfully')

    // Test basic query
    const count = await db.dataset.count()
    console.log('✅ Dataset count:', count)

    // Test creating a record
    const testDataset = {
      id: 'test-' + Date.now(),
      name: 'test_dataset',
      filename: 'test.csv',
      rows: 10,
      columns: 3,
      data: JSON.stringify({
        columns: ['col1', 'col2', 'col3'],
        data: [{ col1: 1, col2: 2, col3: 3 }]
      })
    }

    const result = await db.dataset.create({
      data: testDataset
    })

    console.log('✅ Created test dataset:', result.id)

    // Clean up
    await db.dataset.delete({
      where: { id: result.id }
    })

    console.log('✅ Cleaned up test dataset')

  } catch (error) {
    console.error('❌ Database error:', error.message)
    console.error('Full error:', error)
  } finally {
    await db.$disconnect()
  }
}

testDatabase()
