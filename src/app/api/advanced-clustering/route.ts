import { NextRequest, NextResponse } from 'next/server'
import { 
  dbscan,
  meanShift,
  gaussianMixture,
  spectralClustering,
  optics,
  ClusteringResult
} from '@/lib/advanced-clustering'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, algorithm, parameters, datasetId, userId = null } = body

    if (!data || !algorithm) {
      return NextResponse.json({ 
        error: 'Data and algorithm are required' 
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

    let result: ClusteringResult

    // Execute clustering algorithm based on type
    switch (algorithm.toLowerCase()) {
      case 'dbscan':
        result = dbscan(
          numericData, 
          parameters.eps || 0.5, 
          parameters.minPts || 5
        )
        break

      case 'meanshift':
        result = meanShift(
          numericData,
          parameters.bandwidth || 1.0,
          parameters.maxIterations || 100
        )
        break

      case 'gaussian_mixture':
      case 'gmm':
        result = gaussianMixture(
          numericData,
          parameters.k || 3,
          parameters.maxIterations || 100,
          parameters.tolerance || 1e-6
        )
        break

      case 'spectral':
        result = spectralClustering(
          numericData,
          parameters.k || 3,
          parameters.sigma || 1.0
        )
        break

      case 'optics':
        result = optics(
          numericData,
          parameters.minPts || 5,
          parameters.maxEps || Infinity
        )
        break

      default:
        return NextResponse.json({
          error: `Unsupported algorithm: ${algorithm}`
        }, { status: 400 })
    }

    // Calculate basic metrics
    const uniqueLabels = [...new Set(result.labels)]
    const numClusters = uniqueLabels.filter(label => label !== -1).length // Exclude noise (-1)
    const noisePoints = result.labels.filter(label => label === -1).length

    // Store results in database if datasetId provided
    let modelId: string | null = null
    if (datasetId) {
      const model = await db.model.create({
        data: {
          id: randomUUID(),
          name: `${algorithm.toUpperCase()} Clustering`,
          algorithm: result.algorithm,
          parameters: JSON.stringify(result.parameters),
          numClusters,
          silhouetteScore: 0, // Will be calculated separately
          inertia: 0, // Will be calculated separately
          status: 'completed',
          resultData: JSON.stringify({
            labels: result.labels,
            centroids: result.centroids,
            noisePoints,
            totalPoints: numericData.length
          }),
          datasetId
        }
      })
      modelId = model.id
    }

    return NextResponse.json({
      success: true,
      modelId,
      result: {
        labels: result.labels,
        centroids: result.centroids,
        algorithm: result.algorithm,
        parameters: result.parameters,
        metrics: {
          numClusters,
          noisePoints,
          totalPoints: numericData.length,
          clusterSizes: uniqueLabels.map(label => 
            result.labels.filter(l => l === label).length
          )
        }
      }
    })

  } catch (error) {
    console.error('Advanced clustering error:', error)
    return NextResponse.json(
      { error: 'Failed to perform advanced clustering' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const algorithm = searchParams.get('algorithm')

    // Return algorithm information and parameters
    const algorithms = {
      dbscan: {
        name: 'DBSCAN',
        description: 'Density-Based Spatial Clustering of Applications with Noise',
        parameters: {
          eps: { type: 'number', default: 0.5, description: 'Maximum distance between points' },
          minPts: { type: 'number', default: 5, description: 'Minimum points in neighborhood' }
        },
        advantages: ['Finds arbitrary shaped clusters', 'Handles noise', 'No need to specify number of clusters'],
        disadvantages: ['Sensitive to parameters', 'Struggles with varying densities']
      },
      meanshift: {
        name: 'Mean Shift',
        description: 'Mode-seeking algorithm for clustering',
        parameters: {
          bandwidth: { type: 'number', default: 1.0, description: 'Kernel bandwidth' },
          maxIterations: { type: 'number', default: 100, description: 'Maximum iterations' }
        },
        advantages: ['Automatically determines number of clusters', 'Finds arbitrary shaped clusters'],
        disadvantages: ['Computationally expensive', 'Sensitive to bandwidth parameter']
      },
      gaussian_mixture: {
        name: 'Gaussian Mixture Model',
        description: 'Probabilistic clustering using EM algorithm',
        parameters: {
          k: { type: 'number', default: 3, description: 'Number of components' },
          maxIterations: { type: 'number', default: 100, description: 'Maximum iterations' },
          tolerance: { type: 'number', default: 1e-6, description: 'Convergence tolerance' }
        },
        advantages: ['Soft clustering', 'Provides cluster probabilities', 'Good for overlapping clusters'],
        disadvantages: ['Assumes Gaussian distributions', 'Needs number of clusters']
      },
      spectral: {
        name: 'Spectral Clustering',
        description: 'Graph-based clustering using eigenvalues',
        parameters: {
          k: { type: 'number', default: 3, description: 'Number of clusters' },
          sigma: { type: 'number', default: 1.0, description: 'Gaussian kernel parameter' }
        },
        advantages: ['Handles non-convex clusters', 'Works well with manifolds'],
        disadvantages: ['Computationally expensive', 'Sensitive to parameters']
      },
      optics: {
        name: 'OPTICS',
        description: 'Ordering Points To Identify Clustering Structure',
        parameters: {
          minPts: { type: 'number', default: 5, description: 'Minimum points in neighborhood' },
          maxEps: { type: 'number', default: Infinity, description: 'Maximum epsilon value' }
        },
        advantages: ['Finds clusters of varying densities', 'Creates reachability plot'],
        disadvantages: ['More complex than DBSCAN', 'Requires post-processing']
      }
    }

    if (algorithm) {
      const alg = algorithms[algorithm.toLowerCase() as keyof typeof algorithms]
      if (!alg) {
        return NextResponse.json({
          error: `Algorithm '${algorithm}' not found`
        }, { status: 404 })
      }
      return NextResponse.json({ algorithm: alg })
    }

    return NextResponse.json({
      success: true,
      availableAlgorithms: Object.keys(algorithms),
      algorithms
    })

  } catch (error) {
    console.error('Get algorithms error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve algorithm information' },
      { status: 500 }
    )
  }
}