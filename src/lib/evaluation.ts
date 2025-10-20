import { Matrix } from 'ml-matrix'

export interface EvaluationResult {
  metric: string
  value: number
  description: string
  interpretation: string
}

/**
 * Calculate Silhouette Score untuk cluster quality
 */
export function calculateSilhouetteScore(data: number[][], labels: number[]): EvaluationResult {
  const n = data.length
  const clusters = [...new Set(labels)]
  
  if (clusters.length <= 1) {
    return {
      metric: 'silhouette_score',
      value: 0,
      description: 'Silhouette score for single cluster',
      interpretation: 'Cannot calculate silhouette score with only one cluster'
    }
  }

  let totalScore = 0
  
  for (let i = 0; i < n; i++) {
    const currentCluster = labels[i]
    
    // Calculate a(i) - average distance to points in same cluster
    const sameClusterPoints = data.filter((_, idx) => labels[idx] === currentCluster && idx !== i)
    const a_i = sameClusterPoints.length > 0 
      ? sameClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / sameClusterPoints.length
      : 0
    
    // Calculate b(i) - minimum average distance to points in other clusters
    let b_i = Infinity
    
    for (const cluster of clusters) {
      if (cluster === currentCluster) continue
      
      const otherClusterPoints = data.filter((_, idx) => labels[idx] === cluster)
      if (otherClusterPoints.length > 0) {
        const avgDistance = otherClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / otherClusterPoints.length
        b_i = Math.min(b_i, avgDistance)
      }
    }
    
    // Calculate silhouette coefficient for point i
    const s_i = b_i === Infinity ? 0 : (b_i - a_i) / Math.max(a_i, b_i)
    totalScore += s_i
  }
  
  const score = totalScore / n
  
  return {
    metric: 'silhouette_score',
    value: Math.round(score * 10000) / 10000,
    description: 'Average silhouette coefficient across all data points',
    interpretation: score > 0.7 ? 'Excellent clustering' : 
                   score > 0.5 ? 'Good clustering' : 
                   score > 0.25 ? 'Weak clustering' : 'Poor clustering'
  }
}

/**
 * Calculate Davies-Bouldin Index
 */
export function calculateDaviesBouldinIndex(data: number[][], labels: number[]): EvaluationResult {
  const clusters = [...new Set(labels)]
  const n_clusters = clusters.length
  
  if (n_clusters <= 1) {
    return {
      metric: 'davies_bouldin_index',
      value: 0,
      description: 'Davies-Bouldin index for single cluster',
      interpretation: 'Cannot calculate Davies-Bouldin index with only one cluster'
    }
  }

  // Calculate cluster centers and within-cluster scatter
  const centers: number[][] = []
  const scatters: number[] = []
  
  for (const cluster of clusters) {
    const clusterPoints = data.filter((_, idx) => labels[idx] === cluster)
    
    // Calculate centroid
    const centroid = new Array(data[0].length).fill(0)
    for (const point of clusterPoints) {
      for (let j = 0; j < point.length; j++) {
        centroid[j] += point[j]
      }
    }
    for (let j = 0; j < centroid.length; j++) {
      centroid[j] /= clusterPoints.length
    }
    centers.push(centroid)
    
    // Calculate within-cluster scatter
    const scatter = clusterPoints.reduce((sum, point) => 
      sum + euclideanDistance(point, centroid), 0) / clusterPoints.length
    scatters.push(scatter)
  }
  
  // Calculate Davies-Bouldin index
  let dbIndex = 0
  for (let i = 0; i < n_clusters; i++) {
    let maxRatio = 0
    for (let j = 0; j < n_clusters; j++) {
      if (i !== j) {
        const centerDistance = euclideanDistance(centers[i], centers[j])
        const ratio = (scatters[i] + scatters[j]) / centerDistance
        maxRatio = Math.max(maxRatio, ratio)
      }
    }
    dbIndex += maxRatio
  }
  
  const finalIndex = dbIndex / n_clusters
  
  return {
    metric: 'davies_bouldin_index',
    value: Math.round(finalIndex * 10000) / 10000,
    description: 'Average similarity ratio of clusters',
    interpretation: finalIndex < 1 ? 'Excellent clustering' : 
                   finalIndex < 2 ? 'Good clustering' : 'Poor clustering'
  }
}

/**
 * Calculate Calinski-Harabasz Index (Variance Ratio Criterion)
 */
export function calculateCalinskiHarabaszIndex(data: number[][], labels: number[]): EvaluationResult {
  const n = data.length
  const clusters = [...new Set(labels)]
  const k = clusters.length
  
  if (k <= 1) {
    return {
      metric: 'calinski_harabasz_index',
      value: 0,
      description: 'Calinski-Harabasz index for single cluster',
      interpretation: 'Cannot calculate Calinski-Harabasz index with only one cluster'
    }
  }

  // Calculate overall centroid
  const overallCentroid = new Array(data[0].length).fill(0)
  for (const point of data) {
    for (let j = 0; j < point.length; j++) {
      overallCentroid[j] += point[j]
    }
  }
  for (let j = 0; j < overallCentroid.length; j++) {
    overallCentroid[j] /= n
  }
  
  // Calculate between-cluster sum of squares (BCSS)
  let bcss = 0
  for (const cluster of clusters) {
    const clusterPoints = data.filter((_, idx) => labels[idx] === cluster)
    const clusterSize = clusterPoints.length
    
    // Calculate cluster centroid
    const clusterCentroid = new Array(data[0].length).fill(0)
    for (const point of clusterPoints) {
      for (let j = 0; j < point.length; j++) {
        clusterCentroid[j] += point[j]
      }
    }
    for (let j = 0; j < clusterCentroid.length; j++) {
      clusterCentroid[j] /= clusterSize
    }
    
    bcss += clusterSize * Math.pow(euclideanDistance(clusterCentroid, overallCentroid), 2)
  }
  
  // Calculate within-cluster sum of squares (WCSS)
  let wcss = 0
  for (const cluster of clusters) {
    const clusterPoints = data.filter((_, idx) => labels[idx] === cluster)
    
    const clusterCentroid = new Array(data[0].length).fill(0)
    for (const point of clusterPoints) {
      for (let j = 0; j < point.length; j++) {
        clusterCentroid[j] += point[j]
      }
    }
    for (let j = 0; j < clusterCentroid.length; j++) {
      clusterCentroid[j] /= clusterPoints.length
    }
    
    for (const point of clusterPoints) {
      wcss += Math.pow(euclideanDistance(point, clusterCentroid), 2)
    }
  }
  
  const chIndex = (bcss / (k - 1)) / (wcss / (n - k))
  
  return {
    metric: 'calinski_harabasz_index',
    value: Math.round(chIndex * 100) / 100,
    description: 'Ratio of between-cluster to within-cluster variance',
    interpretation: chIndex > 100 ? 'Excellent clustering' : 
                   chIndex > 50 ? 'Good clustering' : 
                   chIndex > 20 ? 'Fair clustering' : 'Poor clustering'
  }
}

/**
 * Calculate Elbow Method - Within-Cluster Sum of Squares for different k values
 */
export function calculateElbowMethod(data: number[][], maxK: number = 10): EvaluationResult[] {
  const results: EvaluationResult[] = []
  
  for (let k = 1; k <= Math.min(maxK, data.length); k++) {
    // Simple K-means implementation for elbow method
    const { labels } = simpleKMeans(data, k)
    const wcss = calculateWCSS(data, labels, k)
    
    results.push({
      metric: 'elbow_wcss',
      value: Math.round(wcss * 100) / 100,
      description: `Within-Cluster Sum of Squares for k=${k}`,
      interpretation: `WCSS value for ${k} clusters`
    })
  }
  
  return results
}

/**
 * Helper function: Euclidean distance
 */
function euclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(
    point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
  )
}

/**
 * Helper function: Simple K-means implementation
 */
function simpleKMeans(data: number[][], k: number, maxIterations: number = 100) {
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

/**
 * Helper function: Calculate Within-Cluster Sum of Squares
 */
function calculateWCSS(data: number[][], labels: number[], k: number): number {
  let wcss = 0
  
  for (let c = 0; c < k; c++) {
    const clusterPoints = data.filter((_, idx) => labels[idx] === c)
    
    if (clusterPoints.length === 0) continue
    
    // Calculate centroid
    const centroid = new Array(data[0].length).fill(0)
    for (const point of clusterPoints) {
      for (let j = 0; j < point.length; j++) {
        centroid[j] += point[j]
      }
    }
    for (let j = 0; j < centroid.length; j++) {
      centroid[j] /= clusterPoints.length
    }
    
    // Calculate WCSS for this cluster
    for (const point of clusterPoints) {
      wcss += Math.pow(euclideanDistance(point, centroid), 2)
    }
  }
  
  return wcss
}

/**
 * Comprehensive clustering evaluation
 */
export function evaluateClustering(data: number[][], labels: number[]): EvaluationResult[] {
  const results: EvaluationResult[] = []
  
  results.push(calculateSilhouetteScore(data, labels))
  results.push(calculateDaviesBouldinIndex(data, labels))
  results.push(calculateCalinskiHarabaszIndex(data, labels))
  
  return results
}