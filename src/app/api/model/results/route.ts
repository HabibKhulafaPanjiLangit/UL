import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    
    if (modelId) {
      // Get specific model result
      const model = await db.model.findUnique({
        where: { id: modelId },
        include: {
          dataset: {
            select: {
              name: true,
              columns: true
            }
          },
          evaluations: {
            select: {
              metric: true,
              value: true,
              createdAt: true
            }
          }
        }
      })

      if (!model) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 })
      }

      const resultData = model.resultData ? JSON.parse(model.resultData) : []
      
      return NextResponse.json({
        model: {
          id: model.id,
          name: model.name,
          algorithm: model.algorithm,
          parameters: JSON.parse(model.parameters),
          numClusters: model.numClusters,
          silhouetteScore: model.silhouetteScore,
          inertia: model.inertia,
          status: model.status,
          data: resultData,
          createdAt: model.createdAt,
          dataset: model.dataset,
          evaluations: model.evaluations
        }
      })
    } else {
      // Get all models
      const models = await db.model.findMany({
        select: {
          id: true,
          name: true,
          algorithm: true,
          numClusters: true,
          silhouetteScore: true,
          inertia: true,
          status: true,
          createdAt: true,
          dataset: {
            select: {
              name: true,
              rows: true,
              columns: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({ models })
    }
  } catch (error) {
    console.error('Fetch results error:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    
    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    await db.model.delete({
      where: { id: modelId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete model error:', error)
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 })
  }
}