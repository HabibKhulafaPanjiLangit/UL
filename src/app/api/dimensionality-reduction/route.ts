import { NextRequest, NextResponse } from 'next/server'
import { 
  performPCA,
  performTSNE,
  performUMAP,
  autoSelectTechnique,
  DimensionalityReductionResult
} from '@/lib/dimensionality-reduction'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      data, 
      technique, 
      parameters = {}, 
      datasetId, 
      autoSelect = false 
    } = body

    if (!data) {
      return NextResponse.json({ 
        error: 'Data is required' 
      }, { status: 400 })
    }

    // Convert data to proper format
    const numericData: number[][] = data.map((row: any) => {
      if (Array.isArray(row)) {
        return row.map(Number)
      }
      return Object.values(row).map(Number)
    })

    let selectedTechnique = technique
    let selectionReason = ''

    // Auto-select technique if requested
    if (autoSelect || !technique) {
      const autoResult = autoSelectTechnique(numericData, parameters.components || 2)
      selectedTechnique = autoResult.technique
      selectionReason = autoResult.reason
    }

    let result: DimensionalityReductionResult

    // Execute dimensionality reduction based on technique
    switch (selectedTechnique.toLowerCase()) {
      case 'pca':
        result = performPCA(
          numericData,
          parameters.components || 2
        )
        break

      case 'tsne':
        result = performTSNE(
          numericData,
          parameters.dimensions || 2,
          parameters.perplexity || 30,
          parameters.maxIterations || 1000,
          parameters.learningRate || 200
        )
        break

      case 'umap':
        result = performUMAP(
          numericData,
          parameters.nNeighbors || 15,
          parameters.minDist || 0.1,
          parameters.nComponents || 2,
          parameters.nEpochs || 200
        )
        break

      case 'none':
        result = {
          reducedData: numericData,
          originalDimensions: numericData[0].length,
          reducedDimensions: numericData[0].length,
          technique: 'none',
          parameters: {}
        }
        break

      default:
        return NextResponse.json({
          error: `Unsupported technique: ${selectedTechnique}`
        }, { status: 400 })
    }

    // Store results in database if datasetId provided
    let reductionId: string | null = null
    if (datasetId && selectedTechnique !== 'none') {
      const reduction = await (db as any).dimensionalityReduction.create({
        data: {
          id: randomUUID(),
          technique: result.technique,
          parameters: JSON.stringify(result.parameters),
          originalDims: result.originalDimensions,
          reducedDims: result.reducedDimensions,
          inputData: JSON.stringify(numericData),
          outputData: JSON.stringify(result.reducedData),
          explainedVariance: result.explainedVariance ? JSON.stringify(result.explainedVariance) : null,
          datasetId
        }
      })
      reductionId = reduction.id
    }

    return NextResponse.json({
      success: true,
      reductionId,
      result,
      autoSelection: autoSelect ? {
        selectedTechnique,
        reason: selectionReason
      } : null,
      metadata: {
        originalPoints: numericData.length,
        originalDimensions: result.originalDimensions,
        reducedDimensions: result.reducedDimensions,
        varianceExplained: result.cumulativeVariance ? 
          result.cumulativeVariance[result.cumulativeVariance.length - 1] : null
      }
    })

  } catch (error) {
    console.error('Dimensionality reduction error:', error)
    return NextResponse.json(
      { error: 'Failed to perform dimensionality reduction' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const technique = searchParams.get('technique')
    const datasetId = searchParams.get('datasetId')

    if (datasetId) {
      // Get reduction history for a dataset
      const reductions = await (db as any).dimensionalityReduction.findMany({
        where: { datasetId },
        orderBy: { createdAt: 'desc' }
      })

      const formattedReductions = reductions.map(reduction => ({
        id: reduction.id,
        technique: reduction.technique,
        parameters: JSON.parse(reduction.parameters),
        originalDims: reduction.originalDims,
        reducedDims: reduction.reducedDims,
        explainedVariance: reduction.explainedVariance ? 
          JSON.parse(reduction.explainedVariance) : null,
        createdAt: reduction.createdAt
      }))

      return NextResponse.json({
        success: true,
        reductions: formattedReductions
      })
    }

    // Return technique information
    const techniques = {
      pca: {
        name: 'Principal Component Analysis',
        description: 'Linear dimensionality reduction preserving maximum variance',
        parameters: {
          components: { 
            type: 'number', 
            default: 2, 
            description: 'Number of principal components to keep',
            min: 1
          }
        },
        advantages: [
          'Fast and deterministic',
          'Preserves global structure',
          'Provides explained variance',
          'Good for linear relationships'
        ],
        disadvantages: [
          'Only captures linear relationships',
          'May not preserve local structure',
          'Assumes linear combinations'
        ],
        bestFor: 'High-dimensional data with linear structure, feature reduction'
      },
      tsne: {
        name: 't-Distributed Stochastic Neighbor Embedding',
        description: 'Non-linear dimensionality reduction for visualization',
        parameters: {
          dimensions: { 
            type: 'number', 
            default: 2, 
            description: 'Output dimensions',
            min: 1, 
            max: 3 
          },
          perplexity: { 
            type: 'number', 
            default: 30, 
            description: 'Balance between local and global aspects',
            min: 5, 
            max: 50 
          },
          maxIterations: { 
            type: 'number', 
            default: 1000, 
            description: 'Maximum optimization iterations',
            min: 100 
          },
          learningRate: { 
            type: 'number', 
            default: 200, 
            description: 'Learning rate for optimization',
            min: 10, 
            max: 1000 
          }
        },
        advantages: [
          'Excellent for visualization',
          'Preserves local structure',
          'Reveals clusters and patterns',
          'Non-linear dimensionality reduction'
        ],
        disadvantages: [
          'Computationally expensive',
          'Non-deterministic',
          'Can create artificial clusters',
          'Not suitable for new data projection'
        ],
        bestFor: 'Data visualization, cluster analysis, exploratory analysis'
      },
      umap: {
        name: 'Uniform Manifold Approximation and Projection',
        description: 'Preserves both local and global structure',
        parameters: {
          nNeighbors: { 
            type: 'number', 
            default: 15, 
            description: 'Number of neighbors for local approximation',
            min: 2, 
            max: 100 
          },
          minDist: { 
            type: 'number', 
            default: 0.1, 
            description: 'Minimum distance between embedded points',
            min: 0.001, 
            max: 0.99 
          },
          nComponents: { 
            type: 'number', 
            default: 2, 
            description: 'Number of output dimensions',
            min: 1 
          },
          nEpochs: { 
            type: 'number', 
            default: 200, 
            description: 'Number of training epochs',
            min: 50 
          }
        },
        advantages: [
          'Preserves both local and global structure',
          'Faster than t-SNE',
          'Better for new data projection',
          'Maintains distances better'
        ],
        disadvantages: [
          'More complex parameters',
          'Still computationally intensive',
          'Newer technique with less validation'
        ],
        bestFor: 'Large datasets, preserving global structure, projection of new data'
      }
    }

    if (technique) {
      const tech = techniques[technique.toLowerCase() as keyof typeof techniques]
      if (!tech) {
        return NextResponse.json({
          error: `Technique '${technique}' not found`
        }, { status: 404 })
      }
      return NextResponse.json({ technique: tech })
    }

    return NextResponse.json({
      success: true,
      availableTechniques: Object.keys(techniques),
      techniques,
      recommendations: {
        visualization: 'tsne or umap',
        featureReduction: 'pca',
        largeDatasets: 'umap',
        linearData: 'pca',
        nonLinearData: 'tsne or umap'
      }
    })

  } catch (error) {
    console.error('Get dimensionality reduction info error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve dimensionality reduction information' },
      { status: 500 }
    )
  }
}