import { NextRequest, NextResponse } from 'next/server'
import { 
  evaluateClustering, 
  calculateElbowMethod,
  EvaluationResult
} from '@/lib/evaluation'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, labels, modelId, includeElbow = false } = body

    if (!data || !labels) {
      return NextResponse.json({ 
        error: 'Data and labels are required' 
      }, { status: 400 })
    }

    // Convert data to proper format
    const numericData: number[][] = data.map((row: any) => {
      if (Array.isArray(row)) {
        return row.map(Number)
      }
      // If row is object, extract numeric values
      return Object.values(row).map(Number)
    })

    const numericLabels: number[] = labels.map(Number)

    // Perform evaluation
    const evaluationResults = evaluateClustering(numericData, numericLabels)
    
    // Add elbow method if requested
    let elbowResults: EvaluationResult[] = []
    if (includeElbow) {
      elbowResults = calculateElbowMethod(numericData)
    }

    // Store evaluation results in database if modelId provided
    if (modelId) {
      for (const result of evaluationResults) {
        await db.modelEvaluation.create({
          data: {
            modelId,
            metric: result.metric,
            value: result.value,
            parameters: JSON.stringify({
              description: result.description,
              interpretation: result.interpretation
            })
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      evaluations: evaluationResults,
      elbow: elbowResults,
      summary: {
        totalPoints: numericData.length,
        numberOfClusters: [...new Set(numericLabels)].length,
        features: numericData[0]?.length || 0
      }
    })

  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate clustering results' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')

    if (!modelId) {
      return NextResponse.json({ 
        error: 'Model ID is required' 
      }, { status: 400 })
    }

    // Get evaluation history for a model
    const evaluations = await db.modelEvaluation.findMany({
      where: { modelId },
      orderBy: { createdAt: 'desc' }
    })

    const formattedEvaluations = evaluations.map(evaluation => ({
      id: evaluation.id,
      metric: evaluation.metric,
      value: evaluation.value,
      parameters: JSON.parse(evaluation.parameters),
      createdAt: evaluation.createdAt
    }))

    return NextResponse.json({
      success: true,
      evaluations: formattedEvaluations
    })

  } catch (error) {
    console.error('Get evaluations error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve evaluation results' },
      { status: 500 }
    )
  }
}