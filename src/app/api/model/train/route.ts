import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// K-Means implementation
function kMeans(data: number[][], k: number, maxIterations: number = 100): { clusters: number[], centroids: number[][], inertia: number } {
  const n = data.length
  const dimensions = data[0].length
  
  // Initialize centroids randomly
  const centroids: number[][] = []
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * n)
    centroids.push([...data[randomIndex]])
  }
  
  let clusters: number[] = new Array(n).fill(0)
  let changed = true
  let iteration = 0
  
  while (changed && iteration < maxIterations) {
    changed = false
    
    // Assign points to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity
      let closestCentroid = 0
      
      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(data[i], centroids[j])
        if (distance < minDistance) {
          minDistance = distance
          closestCentroid = j
        }
      }
      
      if (clusters[i] !== closestCentroid) {
        clusters[i] = closestCentroid
        changed = true
      }
    }
    
    // Update centroids
    for (let j = 0; j < k; j++) {
      const clusterPoints = data.filter((_, i) => clusters[i] === j)
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dimensions; d++) {
          centroids[j][d] = clusterPoints.reduce((sum, point) => sum + point[d], 0) / clusterPoints.length
        }
      }
    }
    
    iteration++
  }
  
  // Calculate inertia (within-cluster sum of squares)
  let inertia = 0
  for (let i = 0; i < n; i++) {
    inertia += Math.pow(euclideanDistance(data[i], centroids[clusters[i]]), 2)
  }
  
  return { clusters, centroids, inertia }
}

// Hierarchical clustering implementation
function hierarchicalClustering(data: number[][], k: number): { clusters: number[], linkage: number[][] } {
  const n = data.length
  let clusters = Array.from({ length: n }, (_, i) => [i])
  let linkage: number[][] = []
  
  while (clusters.length > k) {
    let minDistance = Infinity
    let mergeIndices = [0, 1]
    
    // Find closest clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = clusterDistance(data, clusters[i], clusters[j])
        if (distance < minDistance) {
          minDistance = distance
          mergeIndices = [i, j]
        }
      }
    }
    
    // Merge clusters
    const newCluster = [...clusters[mergeIndices[0]], ...clusters[mergeIndices[1]]]
    linkage.push([mergeIndices[0], mergeIndices[1], minDistance, newCluster.length])
    
    clusters = clusters.filter((_, i) => i !== mergeIndices[0] && i !== mergeIndices[1])
    clusters.push(newCluster)
  }
  
  // Assign cluster labels
  const labels = new Array(n).fill(0)
  clusters.forEach((cluster, clusterIndex) => {
    cluster.forEach(pointIndex => {
      labels[pointIndex] = clusterIndex
    })
  })
  
  return { clusters: labels, linkage }
}

// DBSCAN implementation
function dbscan(data: number[][], eps: number, minPts: number): { clusters: number[], noise: number[] } {
  const n = data.length
  const clusters = new Array(n).fill(-1)
  const noise: number[] = []
  let clusterId = 0
  
  for (let i = 0; i < n; i++) {
    if (clusters[i] !== -1) continue
    
    const neighbors = getNeighbors(data, i, eps)
    
    if (neighbors.length < minPts) {
      noise.push(i)
      continue
    }
    
    // Expand cluster
    clusters[i] = clusterId
    let seedSet = [...neighbors]
    
    while (seedSet.length > 0) {
      const currentPoint = seedSet.pop()!
      
      if (noise.includes(currentPoint)) {
        clusters[currentPoint] = clusterId
        continue
      }
      
      if (clusters[currentPoint] !== -1) continue
      
      clusters[currentPoint] = clusterId
      const currentNeighbors = getNeighbors(data, currentPoint, eps)
      
      if (currentNeighbors.length >= minPts) {
        seedSet.push(...currentNeighbors.filter(n => !seedSet.includes(n)))
      }
    }
    
    clusterId++
  }
  
  return { clusters, noise }
}

// Helper functions
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
}

function clusterDistance(data: number[][], cluster1: number[], cluster2: number[]): number {
  let minDistance = Infinity
  for (const i of cluster1) {
    for (const j of cluster2) {
      const distance = euclideanDistance(data[i], data[j])
      if (distance < minDistance) {
        minDistance = distance
      }
    }
  }
  return minDistance
}

function getNeighbors(data: number[][], pointIndex: number, eps: number): number[] {
  const neighbors: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i !== pointIndex && euclideanDistance(data[pointIndex], data[i]) <= eps) {
      neighbors.push(i)
    }
  }
  return neighbors
}

// Silhouette score calculation
function calculateSilhouetteScore(data: number[][], clusters: number[]): number {
  const n = data.length
  let totalScore = 0
  
  for (let i = 0; i < n; i++) {
    const cluster = clusters[i]
    
    // Calculate a(i): average distance to points in same cluster
    const sameClusterPoints = data.filter((_, j) => clusters[j] === cluster && j !== i)
    let a = sameClusterPoints.length > 0 
      ? sameClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / sameClusterPoints.length
      : 0
    
    // Calculate b(i): minimum average distance to points in other clusters
    const otherClusters = [...new Set(clusters)].filter(c => c !== cluster)
    let b = Infinity
    
    for (const otherCluster of otherClusters) {
      const otherClusterPoints = data.filter((_, j) => clusters[j] === otherCluster)
      if (otherClusterPoints.length > 0) {
        const avgDistance = otherClusterPoints.reduce((sum, point) => sum + euclideanDistance(data[i], point), 0) / otherClusterPoints.length
        b = Math.min(b, avgDistance)
      }
    }
    
    // Silhouette score for point i
    const s = (b - a) / Math.max(a, b)
    totalScore += isNaN(s) ? 0 : s
  }
  
  return totalScore / n
}

export async function POST(request: NextRequest) {
  try {
    const { datasetId, algorithm, numClusters } = await request.json()
    
    if (!datasetId || !algorithm) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get dataset
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId }
    })

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    // Parse dataset data
    const datasetData = JSON.parse(dataset.data)
    const { columns, data } = datasetData
    
    // Convert to 2D array for algorithms
    const dataArray = data.map((row: any) => columns.map(col => row[col]))
    
    let result: any = {}
    let clusters: number[] = []
    let inertia = 0
    
    // Run clustering algorithm
    switch (algorithm) {
      case 'kmeans':
        const kmeansResult = kMeans(dataArray, numClusters)
        clusters = kmeansResult.clusters
        inertia = kmeansResult.inertia
        break
        
      case 'hierarchical':
        const hierarchicalResult = hierarchicalClustering(dataArray, numClusters)
        clusters = hierarchicalResult.clusters
        // Calculate inertia for hierarchical
        for (let i = 0; i < dataArray.length; i++) {
          const clusterPoints = dataArray.filter((_, j) => clusters[j] === clusters[i])
          const centroid = clusterPoints.reduce((sum, point) => 
            point.map((val, idx) => sum[idx] + val / clusterPoints.length), 
            new Array(dataArray[0].length).fill(0)
          )
          inertia += Math.pow(euclideanDistance(dataArray[i], centroid), 2)
        }
        break
        
      case 'dbscan':
        const dbscanResult = dbscan(dataArray, 0.5, Math.min(5, Math.floor(dataArray.length / 10)))
        clusters = dbscanResult.clusters
        // Calculate inertia for DBSCAN
        const uniqueClusters = [...new Set(clusters.filter(c => c !== -1))]
        for (const clusterId of uniqueClusters) {
          const clusterPoints = dataArray.filter((_, i) => clusters[i] === clusterId)
          const centroid = clusterPoints.reduce((sum, point) => 
            point.map((val, idx) => sum[idx] + val / clusterPoints.length), 
            new Array(dataArray[0].length).fill(0)
          )
          clusterPoints.forEach(point => {
            inertia += Math.pow(euclideanDistance(point, centroid), 2)
          })
        }
        break
        
      default:
        return NextResponse.json({ error: 'Unsupported algorithm' }, { status: 400 })
    }
    
    // Calculate silhouette score
    const silhouetteScore = calculateSilhouetteScore(dataArray, clusters)
    
    // Prepare result data with coordinates for visualization
    const resultData = data.map((row: any, index: number) => ({
      ...row,
      cluster: clusters[index],
      x: row[columns[0]] || 0,
      y: row[columns[1]] || 0
    }))
    
    // Save model to database
    const model = await db.model.create({
      data: {
        id: randomUUID(),
        name: `${algorithm}_${dataset.name}_${Date.now()}`,
        algorithm,
        parameters: JSON.stringify({ numClusters }),
        numClusters: algorithm === 'dbscan' ? [...new Set(clusters.filter(c => c !== -1))].length : numClusters,
        silhouetteScore,
        inertia,
        status: 'completed',
        resultData: JSON.stringify(resultData),
        datasetId
      }
    })

    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        algorithm: model.algorithm,
        clusters: model.numClusters,
        silhouetteScore: model.silhouetteScore,
        inertia: model.inertia,
        data: resultData,
        createdAt: model.createdAt
      }
    })

  } catch (error) {
    console.error('Training error:', error)
    return NextResponse.json({ error: 'Failed to train model' }, { status: 500 })
  }
}