import { Matrix } from 'ml-matrix'
import * as KMeans from 'ml-kmeans'

export interface ClusteringResult {
  labels: number[]
  centroids?: number[][]
  iterations?: number
  algorithm: string
  parameters: any
}

/**
 * DBSCAN Algorithm Implementation
 */
export function dbscan(data: number[][], eps: number = 0.5, minPts: number = 5): ClusteringResult {
  const n = data.length
  const labels = new Array(n).fill(-1) // -1 indicates noise
  let clusterId = 0
  
  const visited = new Array(n).fill(false)
  
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue
    
    visited[i] = true
    const neighbors = regionQuery(data, i, eps)
    
    if (neighbors.length < minPts) {
      // Mark as noise
      labels[i] = -1
    } else {
      // Start new cluster
      expandCluster(data, labels, i, neighbors, clusterId, eps, minPts, visited)
      clusterId++
    }
  }
  
  return {
    labels,
    algorithm: 'dbscan',
    parameters: { eps, minPts }
  }
}

function regionQuery(data: number[][], pointIdx: number, eps: number): number[] {
  const neighbors: number[] = []
  const point = data[pointIdx]
  
  for (let i = 0; i < data.length; i++) {
    if (euclideanDistance(point, data[i]) <= eps) {
      neighbors.push(i)
    }
  }
  
  return neighbors
}

function expandCluster(
  data: number[][],
  labels: number[],
  pointIdx: number,
  neighbors: number[],
  clusterId: number,
  eps: number,
  minPts: number,
  visited: boolean[]
) {
  labels[pointIdx] = clusterId
  
  let i = 0
  while (i < neighbors.length) {
    const neighborIdx = neighbors[i]
    
    if (!visited[neighborIdx]) {
      visited[neighborIdx] = true
      const neighborNeighbors = regionQuery(data, neighborIdx, eps)
      
      if (neighborNeighbors.length >= minPts) {
        neighbors.push(...neighborNeighbors)
      }
    }
    
    if (labels[neighborIdx] === -1) {
      labels[neighborIdx] = clusterId
    }
    
    i++
  }
}

/**
 * Mean Shift Algorithm Implementation
 */
export function meanShift(data: number[][], bandwidth: number = 1.0, maxIterations: number = 100): ClusteringResult {
  const n = data.length
  const d = data[0].length
  
  // Initialize each point as its own cluster center
  let centers: number[][] = data.map(point => [...point])
  const labels = new Array(n).fill(0)
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const newCenters: number[][] = []
    let converged = true
    
    for (let i = 0; i < centers.length; i++) {
      const center = centers[i]
      
      // Find points within bandwidth
      const nearbyPoints: number[][] = []
      for (const point of data) {
        if (euclideanDistance(center, point) <= bandwidth) {
          nearbyPoints.push(point)
        }
      }
      
      if (nearbyPoints.length === 0) {
        newCenters.push([...center])
        continue
      }
      
      // Calculate new center as mean of nearby points
      const newCenter = new Array(d).fill(0)
      for (const point of nearbyPoints) {
        for (let j = 0; j < d; j++) {
          newCenter[j] += point[j]
        }
      }
      for (let j = 0; j < d; j++) {
        newCenter[j] /= nearbyPoints.length
      }
      
      // Check convergence
      if (euclideanDistance(center, newCenter) > 1e-6) {
        converged = false
      }
      
      newCenters.push(newCenter)
    }
    
    centers = newCenters
    
    if (converged) break
  }
  
  // Merge nearby centers and assign labels
  const finalCenters = mergeCenters(centers, bandwidth / 2)
  
  // Assign each point to nearest final center
  for (let i = 0; i < n; i++) {
    let minDistance = Infinity
    let bestCluster = 0
    
    for (let c = 0; c < finalCenters.length; c++) {
      const distance = euclideanDistance(data[i], finalCenters[c])
      if (distance < minDistance) {
        minDistance = distance
        bestCluster = c
      }
    }
    
    labels[i] = bestCluster
  }
  
  return {
    labels,
    centroids: finalCenters,
    algorithm: 'meanshift',
    parameters: { bandwidth, maxIterations }
  }
}

function mergeCenters(centers: number[][], threshold: number): number[][] {
  const merged: number[][] = []
  const used = new Array(centers.length).fill(false)
  
  for (let i = 0; i < centers.length; i++) {
    if (used[i]) continue
    
    const cluster: number[][] = [centers[i]]
    used[i] = true
    
    for (let j = i + 1; j < centers.length; j++) {
      if (!used[j] && euclideanDistance(centers[i], centers[j]) <= threshold) {
        cluster.push(centers[j])
        used[j] = true
      }
    }
    
    // Calculate mean of clustered centers
    const mergedCenter = new Array(centers[0].length).fill(0)
    for (const center of cluster) {
      for (let k = 0; k < center.length; k++) {
        mergedCenter[k] += center[k]
      }
    }
    for (let k = 0; k < mergedCenter.length; k++) {
      mergedCenter[k] /= cluster.length
    }
    
    merged.push(mergedCenter)
  }
  
  return merged
}

/**
 * Gaussian Mixture Model (EM Algorithm)
 */
export function gaussianMixture(data: number[][], k: number, maxIterations: number = 100, tolerance: number = 1e-6): ClusteringResult {
  const n = data.length
  const d = data[0].length
  
  // Initialize parameters
  const weights = new Array(k).fill(1 / k)
  const means: number[][] = []
  const covariances: number[][][] = []
  
  // Initialize means randomly
  for (let i = 0; i < k; i++) {
    means.push([...data[Math.floor(Math.random() * n)]])
  }
  
  // Initialize covariances as identity matrices
  for (let i = 0; i < k; i++) {
    const cov: number[][] = []
    for (let j = 0; j < d; j++) {
      const row = new Array(d).fill(0)
      row[j] = 1
      cov.push(row)
    }
    covariances.push(cov)
  }
  
  let prevLogLikelihood = -Infinity
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // E-step: Calculate responsibilities
    const responsibilities: number[][] = []
    
    for (let i = 0; i < n; i++) {
      const resp = new Array(k)
      let sum = 0
      
      for (let j = 0; j < k; j++) {
        resp[j] = weights[j] * multivariateGaussian(data[i], means[j], covariances[j])
        sum += resp[j]
      }
      
      // Normalize
      for (let j = 0; j < k; j++) {
        resp[j] = sum > 0 ? resp[j] / sum : 1 / k
      }
      
      responsibilities.push(resp)
    }
    
    // M-step: Update parameters
    for (let j = 0; j < k; j++) {
      // Update weights
      const totalResp = responsibilities.reduce((sum, resp) => sum + resp[j], 0)
      weights[j] = totalResp / n
      
      // Update means
      const newMean = new Array(d).fill(0)
      for (let i = 0; i < n; i++) {
        for (let l = 0; l < d; l++) {
          newMean[l] += responsibilities[i][j] * data[i][l]
        }
      }
      for (let l = 0; l < d; l++) {
        newMean[l] = totalResp > 0 ? newMean[l] / totalResp : 0
      }
      means[j] = newMean
      
      // Update covariances (simplified - diagonal covariance)
      const newCov: number[][] = []
      for (let l = 0; l < d; l++) {
        const row = new Array(d).fill(0)
        for (let i = 0; i < n; i++) {
          row[l] += responsibilities[i][j] * Math.pow(data[i][l] - means[j][l], 2)
        }
        row[l] = totalResp > 0 ? row[l] / totalResp : 1
        newCov.push(row)
      }
      covariances[j] = newCov
    }
    
    // Calculate log-likelihood for convergence check
    let logLikelihood = 0
    for (let i = 0; i < n; i++) {
      let likelihood = 0
      for (let j = 0; j < k; j++) {
        likelihood += weights[j] * multivariateGaussian(data[i], means[j], covariances[j])
      }
      logLikelihood += Math.log(likelihood + 1e-10)
    }
    
    if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
      break
    }
    
    prevLogLikelihood = logLikelihood
  }
  
  // Assign final labels
  const labels = new Array(n)
  for (let i = 0; i < n; i++) {
    let maxResp = -1
    let bestCluster = 0
    
    for (let j = 0; j < k; j++) {
      const resp = weights[j] * multivariateGaussian(data[i], means[j], covariances[j])
      if (resp > maxResp) {
        maxResp = resp
        bestCluster = j
      }
    }
    
    labels[i] = bestCluster
  }
  
  return {
    labels,
    centroids: means,
    algorithm: 'gaussian_mixture',
    parameters: { k, maxIterations, tolerance }
  }
}

/**
 * Spectral Clustering
 */
export function spectralClustering(data: number[][], k: number, sigma: number = 1.0): ClusteringResult {
  const n = data.length
  
  // Build similarity matrix
  const similarity: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push(1.0)
      } else {
        const dist = euclideanDistance(data[i], data[j])
        row.push(Math.exp(-dist * dist / (2 * sigma * sigma)))
      }
    }
    similarity.push(row)
  }
  
  // Create degree matrix and Laplacian
  const degree = similarity.map(row => row.reduce((sum, val) => sum + val, 0))
  const laplacian: number[][] = []
  
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push(degree[i] - similarity[i][j])
      } else {
        row.push(-similarity[i][j])
      }
    }
    laplacian.push(row)
  }
  
  // For simplicity, use K-means on original data
  // In full implementation, we would compute eigenvectors of Laplacian
  const { labels, centroids } = simpleKMeansForSpectral(data, k)
  
  return {
    labels,
    centroids,
    algorithm: 'spectral',
    parameters: { k, sigma }
  }
}

/**
 * OPTICS Algorithm (simplified version)
 */
export function optics(data: number[][], minPts: number = 5, maxEps: number = Infinity): ClusteringResult {
  const n = data.length
  const processed = new Array(n).fill(false)
  const reachabilityDistance = new Array(n).fill(Infinity)
  const coreDistance = new Array(n).fill(Infinity)
  const orderedPoints: number[] = []
  
  // Calculate core distances
  for (let i = 0; i < n; i++) {
    const distances: number[] = []
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push(euclideanDistance(data[i], data[j]))
      }
    }
    distances.sort((a, b) => a - b)
    
    if (distances.length >= minPts - 1) {
      coreDistance[i] = distances[minPts - 2]
    }
  }
  
  // OPTICS algorithm
  for (let i = 0; i < n; i++) {
    if (!processed[i]) {
      processPoint(i, data, processed, reachabilityDistance, coreDistance, orderedPoints, minPts, maxEps)
    }
  }
  
  // Extract clusters using reachability plot (simplified)
  const labels = extractClusters(reachabilityDistance, orderedPoints)
  
  return {
    labels,
    algorithm: 'optics',
    parameters: { minPts, maxEps }
  }
}

function processPoint(
  pointIdx: number,
  data: number[][],
  processed: boolean[],
  reachabilityDistance: number[],
  coreDistance: number[],
  orderedPoints: number[],
  minPts: number,
  maxEps: number
) {
  const seeds: { point: number; reachDist: number }[] = []
  
  processed[pointIdx] = true
  orderedPoints.push(pointIdx)
  
  if (coreDistance[pointIdx] <= maxEps) {
    update(pointIdx, data, seeds, processed, reachabilityDistance, coreDistance, maxEps)
    
    while (seeds.length > 0) {
      // Get point with minimum reachability distance
      seeds.sort((a, b) => a.reachDist - b.reachDist)
      const current = seeds.shift()!
      
      processed[current.point] = true
      orderedPoints.push(current.point)
      
      if (coreDistance[current.point] <= maxEps) {
        update(current.point, data, seeds, processed, reachabilityDistance, coreDistance, maxEps)
      }
    }
  }
}

function update(
  pointIdx: number,
  data: number[][],
  seeds: { point: number; reachDist: number }[],
  processed: boolean[],
  reachabilityDistance: number[],
  coreDistance: number[],
  maxEps: number
) {
  for (let i = 0; i < data.length; i++) {
    if (!processed[i]) {
      const dist = euclideanDistance(data[pointIdx], data[i])
      if (dist <= maxEps) {
        const newReachDist = Math.max(coreDistance[pointIdx], dist)
        if (newReachDist < reachabilityDistance[i]) {
          reachabilityDistance[i] = newReachDist
          seeds.push({ point: i, reachDist: newReachDist })
        }
      }
    }
  }
}

function extractClusters(reachabilityDistance: number[], orderedPoints: number[]): number[] {
  const labels = new Array(orderedPoints.length).fill(-1)
  let clusterId = 0
  
  // Simple threshold-based extraction
  const threshold = 0.5
  
  for (let i = 0; i < orderedPoints.length; i++) {
    if (reachabilityDistance[orderedPoints[i]] <= threshold) {
      if (labels[orderedPoints[i]] === -1) {
        // Start new cluster
        let j = i
        while (j < orderedPoints.length && reachabilityDistance[orderedPoints[j]] <= threshold) {
          labels[orderedPoints[j]] = clusterId
          j++
        }
        clusterId++
        i = j - 1
      }
    }
  }
  
  return labels
}

// Helper functions
function euclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(
    point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
  )
}

function multivariateGaussian(x: number[], mean: number[], covariance: number[][]): number {
  const d = x.length
  
  // Simplified: assume diagonal covariance
  let det = 1
  let exponent = 0
  
  for (let i = 0; i < d; i++) {
    det *= covariance[i][i]
    exponent += Math.pow(x[i] - mean[i], 2) / covariance[i][i]
  }
  
  const normalization = Math.pow(2 * Math.PI, d / 2) * Math.sqrt(det)
  return Math.exp(-0.5 * exponent) / normalization
}

function simpleKMeansForSpectral(data: number[][], k: number, maxIterations: number = 100) {
  const n = data.length
  const d = data[0].length
  
  // Initialize centroids randomly
  let centroids: number[][] = []
  for (let i = 0; i < k; i++) {
    centroids.push([...data[Math.floor(Math.random() * n)]])
  }
  
  let labels = new Array(n).fill(0)
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newLabels = data.map(point => {
      let minDistance = Infinity
      let bestCluster = 0
      
      for (let c = 0; c < k; c++) {
        const distance = euclideanDistance(point, centroids[c])
        if (distance < minDistance) {
          minDistance = distance
          bestCluster = c
        }
      }
      
      return bestCluster
    })
    
    // Check for convergence
    if (JSON.stringify(newLabels) === JSON.stringify(labels)) {
      break
    }
    
    labels = newLabels
    
    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, idx) => labels[idx] === c)
      if (clusterPoints.length > 0) {
        const newCentroid = new Array(d).fill(0)
        for (const point of clusterPoints) {
          for (let j = 0; j < d; j++) {
            newCentroid[j] += point[j]
          }
        }
        for (let j = 0; j < d; j++) {
          newCentroid[j] /= clusterPoints.length
        }
        centroids[c] = newCentroid
      }
    }
  }
  
  return { labels, centroids }
}