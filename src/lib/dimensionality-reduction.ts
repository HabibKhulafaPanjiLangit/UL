import { Matrix } from 'ml-matrix'
import { PCA } from 'ml-pca'

export interface DimensionalityReductionResult {
  reducedData: number[][]
  originalDimensions: number
  reducedDimensions: number
  technique: string
  parameters: any
  explainedVariance?: number[]
  cumulativeVariance?: number[]
}

/**
 * Principal Component Analysis (PCA)
 */
export function performPCA(data: number[][], components: number = 2): DimensionalityReductionResult {
  try {
    const matrix = new Matrix(data)
    const pca = new PCA(matrix, {
      center: true,
      scale: false
    })

    // Get the desired number of components
    const reducedMatrix = pca.predict(matrix, { nComponents: components })
    const reducedData = reducedMatrix.to2DArray()

    // Get explained variance
    const explainedVariance = pca.getExplainedVariance().slice(0, components)
    const cumulativeVariance: number[] = []
    let cumsum = 0
    for (const variance of explainedVariance) {
      cumsum += variance
      cumulativeVariance.push(cumsum)
    }

    return {
      reducedData,
      originalDimensions: data[0].length,
      reducedDimensions: components,
      technique: 'pca',
      parameters: { components, center: true, scale: false },
      explainedVariance,
      cumulativeVariance
    }
  } catch (error) {
    console.error('PCA Error:', error)
    throw new Error(`PCA computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * t-SNE Algorithm (Simplified Implementation)
 */
export function performTSNE(
  data: number[][],
  dimensions: number = 2,
  perplexity: number = 30,
  maxIterations: number = 1000,
  learningRate: number = 200
): DimensionalityReductionResult {
  const n = data.length
  const originalDims = data[0].length

  // Initialize output coordinates randomly
  let Y = new Array(n).fill(0).map(() =>
    new Array(dimensions).fill(0).map(() => (Math.random() - 0.5) * 1e-4)
  )

  // Calculate pairwise distances in high-dimensional space
  const distances = calculatePairwiseDistances(data)

  // Convert distances to probabilities
  const P = calculateAffinities(distances, perplexity)

  // t-SNE optimization loop
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate pairwise distances in low-dimensional space
    const distancesY = calculatePairwiseDistances(Y)

    // Calculate Q matrix (t-distribution)
    const Q = calculateQMatrix(distancesY)

    // Calculate gradient
    const gradient = calculateGradient(Y, P, Q)

    // Update Y coordinates
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dimensions; j++) {
        Y[i][j] -= learningRate * gradient[i][j]
      }
    }

    // Simple momentum and learning rate decay
    if (iter % 100 === 0) {
      learningRate *= 0.99
    }
  }

  return {
    reducedData: Y,
    originalDimensions: originalDims,
    reducedDimensions: dimensions,
    technique: 'tsne',
    parameters: {
      dimensions,
      perplexity,
      maxIterations,
      learningRate: 200
    }
  }
}

/**
 * UMAP Algorithm (Simplified Implementation)
 */
export function performUMAP(
  data: number[][],
  nNeighbors: number = 15,
  minDist: number = 0.1,
  nComponents: number = 2,
  nEpochs: number = 200
): DimensionalityReductionResult {
  const n = data.length
  const originalDims = data[0].length

  // Build k-nearest neighbor graph
  const knnGraph = buildKNNGraph(data, nNeighbors)

  // Initialize embedding randomly
  let embedding = new Array(n).fill(0).map(() =>
    new Array(nComponents).fill(0).map(() => (Math.random() - 0.5) * 10)
  )

  // UMAP optimization
  for (let epoch = 0; epoch < nEpochs; epoch++) {
    const alpha = 1.0 - epoch / nEpochs // Learning rate decay

    // Positive sampling
    for (let i = 0; i < n; i++) {
      for (const neighbor of knnGraph[i]) {
        const force = calculateAttractionForce(embedding[i], embedding[neighbor], minDist)
        updateEmbedding(embedding, i, neighbor, force, alpha)
      }
    }

    // Negative sampling
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 5; k++) { // 5 negative samples per positive
        const j = Math.floor(Math.random() * n)
        if (i !== j) {
          const force = calculateRepulsionForce(embedding[i], embedding[j], minDist)
          updateEmbedding(embedding, i, j, force, alpha)
        }
      }
    }
  }

  return {
    reducedData: embedding,
    originalDimensions: originalDims,
    reducedDimensions: nComponents,
    technique: 'umap',
    parameters: {
      nNeighbors,
      minDist,
      nComponents,
      nEpochs
    }
  }
}

// Helper functions for dimensionality reduction

function calculatePairwiseDistances(data: number[][]): number[][] {
  const n = data.length
  const distances = new Array(n).fill(0).map(() => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances[i][j] = euclideanDistance(data[i], data[j])
      }
    }
  }

  return distances
}

function calculateAffinities(distances: number[][], perplexity: number): number[][] {
  const n = distances.length
  const P = new Array(n).fill(0).map(() => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    // Binary search for sigma that gives desired perplexity
    let sigma = 1.0
    let minSigma = 0
    let maxSigma = Infinity

    for (let iter = 0; iter < 50; iter++) {
      // Calculate conditional probabilities
      let sumP = 0
      let entropy = 0

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          P[i][j] = Math.exp((-(distances[i][j] ** 2)) / (2 * (sigma ** 2)))
          sumP += P[i][j]
        }
      }

      // Normalize and calculate entropy
      for (let j = 0; j < n; j++) {
        if (i !== j && sumP > 0) {
          P[i][j] /= sumP
          if (P[i][j] > 1e-12) {
            entropy -= P[i][j] * Math.log2(P[i][j])
          }
        }
      }

      const currentPerplexity = Math.pow(2, entropy)

      if (Math.abs(currentPerplexity - perplexity) < 1e-5) {
        break
      }

      if (currentPerplexity > perplexity) {
        maxSigma = sigma
        sigma = (sigma + minSigma) / 2
      } else {
        minSigma = sigma
        sigma = maxSigma === Infinity ? sigma * 2 : (sigma + maxSigma) / 2
      }
    }
  }

  // Symmetrize probabilities
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / (2 * n)
    }
  }

  return P
}

function calculateQMatrix(distances: number[][]): number[][] {
  const n = distances.length
  const Q = new Array(n).fill(0).map(() => new Array(n).fill(0))
  let sumQ = 0

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        Q[i][j] = 1 / (1 + distances[i][j] ** 2)
        sumQ += Q[i][j]
      }
    }
  }

  // Normalize
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (sumQ > 0) {
        Q[i][j] = Math.max(Q[i][j] / sumQ, 1e-12)
      }
    }
  }

  return Q
}

function calculateGradient(Y: number[][], P: number[][], Q: number[][]): number[][] {
  const n = Y.length
  const dimensions = Y[0].length
  const gradient = new Array(n).fill(0).map(() => new Array(dimensions).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const diff = (P[i][j] - Q[i][j]) * (1 / (1 + euclideanDistance(Y[i], Y[j]) ** 2))

        for (let d = 0; d < dimensions; d++) {
          gradient[i][d] += 4 * diff * (Y[i][d] - Y[j][d])
        }
      }
    }
  }

  return gradient
}

function buildKNNGraph(data: number[][], k: number): number[][] {
  const n = data.length
  const graph: number[][] = new Array(n).fill(0).map(() => [])

  for (let i = 0; i < n; i++) {
    const distances: { idx: number; dist: number }[] = []

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push({
          idx: j,
          dist: euclideanDistance(data[i], data[j])
        })
      }
    }

    distances.sort((a, b) => a.dist - b.dist)
    graph[i] = distances.slice(0, k).map(d => d.idx)
  }

  return graph
}

function calculateAttractionForce(point1: number[], point2: number[], minDist: number): number[] {
  const dist = Math.max(euclideanDistance(point1, point2), 1e-10)
  const force: number[] = []

  for (let i = 0; i < point1.length; i++) {
    const diff = point2[i] - point1[i]
    force.push(diff * Math.max(0, dist - minDist) / dist)
  }

  return force
}

function calculateRepulsionForce(point1: number[], point2: number[], minDist: number): number[] {
  const dist = Math.max(euclideanDistance(point1, point2), 1e-10)
  const force: number[] = []

  for (let i = 0; i < point1.length; i++) {
    const diff = point1[i] - point2[i]
    force.push(diff * minDist / (dist * (dist + minDist)))
  }

  return force
}

function updateEmbedding(
  embedding: number[][],
  i: number,
  j: number,
  force: number[],
  alpha: number
) {
  for (let d = 0; d < embedding[i].length; d++) {
    embedding[i][d] += alpha * force[d] * 0.01
    embedding[j][d] -= alpha * force[d] * 0.01
  }
}

function euclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(
    point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
  )
}

/**
 * Auto-select best dimensionality reduction technique
 */
export function autoSelectTechnique(
  data: number[][],
  targetDimensions: number = 2
): { technique: string; reason: string } {
  const n = data.length
  const d = data[0].length

  if (d <= 3) {
    return {
      technique: 'none',
      reason: 'Data already low-dimensional'
    }
  }

  if (n < 50) {
    return {
      technique: 'pca',
      reason: 'Small dataset - PCA is most reliable'
    }
  }

  if (d > 50 && n > 1000) {
    return {
      technique: 'umap',
      reason: 'High-dimensional data with many samples - UMAP preserves both local and global structure'
    }
  }

  if (n > 500) {
    return {
      technique: 'tsne',
      reason: 'Medium-sized dataset - t-SNE good for visualization'
    }
  }

  return {
    technique: 'pca',
    reason: 'Default choice for linear dimensionality reduction'
  }
}
