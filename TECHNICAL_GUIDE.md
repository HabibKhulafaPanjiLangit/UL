# 🔧 UL Platform - Technical Implementation Guide

## 📋 **Table of Contents**
1. [Architecture Overview](#architecture-overview)
2. [API Reference](#api-reference)  
3. [Algorithm Implementations](#algorithm-implementations)
4. [Database Design](#database-design)
5. [Frontend Components](#frontend-components)
6. [Deployment Guide](#deployment-guide)

---

## 🏗 **Architecture Overview**

### **System Components**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│  (Next.js)      │◄──►│  (Node.js)      │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ • React UI      │    │ • REST APIs     │    │ • Prisma ORM    │
│ • TypeScript    │    │ • Socket.IO     │    │ • Accelerate    │
│ • Tailwind CSS  │    │ • ML Algorithms │    │ • Connection    │
│ • Recharts      │    │ • File Upload   │    │   Pooling       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow**
```
User Upload CSV → Parse & Validate → Store in DB → Select Algorithm → 
Run Clustering → Calculate Metrics → Store Results → Visualize → Export
```

---

## 🔌 **API Reference**

### **Dataset Management**

#### `POST /api/dataset/upload`
Upload and process CSV dataset.

**Request**:
```typescript
Content-Type: multipart/form-data
Body: {
  file: File (CSV format)
}
```

**Response**:
```typescript
{
  "success": true,
  "dataset": {
    "id": "uuid",
    "name": "filename.csv",
    "rows": 1000,
    "columns": 4,
    "uploadedAt": "2025-10-20T10:30:00.000Z"
  }
}
```

**Error Responses**:
```typescript
// No file uploaded
{ "error": "No file uploaded", "status": 400 }

// Invalid CSV format  
{ "error": "Empty CSV file", "status": 400 }

// No numeric columns
{ "error": "No numeric columns found in CSV", "status": 400 }
```

#### `POST /api/sample`
Generate synthetic clustering dataset.

**Request**: No body required

**Response**:
```typescript
{
  "success": true,
  "dataset": {
    "id": "uuid",
    "name": "sample_clustering_data", 
    "rows": 90,
    "columns": 4,
    "uploadedAt": "2025-10-20T10:30:00.000Z"
  }
}
```

### **Model Training**

#### `POST /api/model/train`
Train clustering model on dataset.

**Request**:
```typescript
{
  "datasetId": "uuid",
  "algorithm": "kmeans" | "hierarchical" | "dbscan",
  "numClusters": 3,
  "parameters"?: {
    // Algorithm-specific parameters
    "maxIterations"?: 100,    // K-means
    "eps"?: 0.5,              // DBSCAN
    "minPts"?: 5              // DBSCAN
  }
}
```

**Response**:
```typescript
{
  "success": true,
  "model": {
    "id": "uuid",
    "algorithm": "kmeans",
    "clusters": 3,
    "silhouetteScore": 0.785,
    "inertia": 234.56,
    "status": "completed",
    "resultData": {
      "clusters": [0, 1, 2, 1, 0, ...],
      "centroids": [[1.2, 3.4], [5.6, 7.8], [2.1, 4.3]],
      "points": [
        { "x": 1.1, "y": 3.2, "cluster": 0 },
        { "x": 5.4, "y": 7.9, "cluster": 1 }
      ]
    },
    "createdAt": "2025-10-20T10:35:00.000Z"
  }
}
```

#### `GET /api/model/results`
Retrieve all model results.

**Response**:
```typescript
{
  "success": true,
  "models": [
    {
      "id": "uuid",
      "algorithm": "kmeans", 
      "silhouetteScore": 0.785,
      "inertia": 234.56,
      "createdAt": "2025-10-20T10:35:00.000Z",
      "dataset": {
        "name": "customer_data.csv",
        "rows": 1000
      }
    }
  ]
}
```

### **Health Check**

#### `GET /api/health`
System health status.

**Response**:
```typescript
{
  "status": "healthy",
  "timestamp": "2025-10-20T10:30:00.000Z",
  "database": "connected",
  "services": {
    "clustering": "available",
    "fileUpload": "available"
  }
}
```

---

## 🤖 **Algorithm Implementations**

### **K-Means Clustering**

```typescript
interface KMeansParams {
  k: number
  maxIterations?: number
  tolerance?: number
}

interface KMeansResult {
  clusters: number[]
  centroids: number[][]
  inertia: number
  iterations: number
  converged: boolean
}

function kMeans(
  data: number[][], 
  params: KMeansParams
): KMeansResult {
  const { k, maxIterations = 100, tolerance = 1e-6 } = params
  const n = data.length
  const dimensions = data[0].length
  
  // 1. Initialize centroids using K-means++ method
  const centroids = initializeCentroidsKMeansPlusPlus(data, k)
  
  let clusters = new Array(n).fill(0)
  let previousInertia = Infinity
  let iteration = 0
  let converged = false
  
  while (iteration < maxIterations && !converged) {
    // 2. Assignment step
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
      
      clusters[i] = closestCentroid
    }
    
    // 3. Update step
    for (let j = 0; j < k; j++) {
      const clusterPoints = data.filter((_, i) => clusters[i] === j)
      
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dimensions; d++) {
          centroids[j][d] = clusterPoints.reduce(
            (sum, point) => sum + point[d], 0
          ) / clusterPoints.length
        }
      }
    }
    
    // 4. Check convergence
    const currentInertia = calculateInertia(data, clusters, centroids)
    if (Math.abs(previousInertia - currentInertia) < tolerance) {
      converged = true
    }
    
    previousInertia = currentInertia
    iteration++
  }
  
  return {
    clusters,
    centroids,
    inertia: previousInertia,
    iterations: iteration,
    converged
  }
}

// K-means++ initialization for better centroid selection
function initializeCentroidsKMeansPlusPlus(
  data: number[][], 
  k: number
): number[][] {
  const centroids: number[][] = []
  const n = data.length
  
  // Choose first centroid randomly
  centroids.push([...data[Math.floor(Math.random() * n)]])
  
  // Choose remaining centroids
  for (let c = 1; c < k; c++) {
    const distances = new Array(n)
    let totalDistance = 0
    
    // Calculate squared distances to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity
      
      for (const centroid of centroids) {
        const distance = euclideanDistance(data[i], centroid)
        minDistance = Math.min(minDistance, distance)
      }
      
      distances[i] = minDistance * minDistance
      totalDistance += distances[i]
    }
    
    // Choose next centroid with probability proportional to squared distance
    const target = Math.random() * totalDistance
    let cumsum = 0
    
    for (let i = 0; i < n; i++) {
      cumsum += distances[i]
      if (cumsum >= target) {
        centroids.push([...data[i]])
        break
      }
    }
  }
  
  return centroids
}
```

### **DBSCAN Implementation**

```typescript
interface DBSCANParams {
  eps: number      // Neighborhood radius
  minPts: number   // Minimum points to form dense region
}

interface DBSCANResult {
  clusters: number[]  // -1 for noise points
  noise: number[]     // Indices of noise points
  numClusters: number
  corePoints: number[]
  borderPoints: number[]
}

function dbscan(data: number[][], params: DBSCANParams): DBSCANResult {
  const { eps, minPts } = params
  const n = data.length
  const clusters = new Array(n).fill(-1)  // -1 = unvisited
  const visited = new Array(n).fill(false)
  const noise: number[] = []
  const corePoints: number[] = []
  const borderPoints: number[] = []
  
  let clusterId = 0
  
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue
    
    visited[i] = true
    const neighbors = getEpsNeighborhood(data, i, eps)
    
    if (neighbors.length < minPts) {
      // Point is noise (might be changed to border later)
      noise.push(i)
      continue
    }
    
    // Point is core point - start new cluster
    corePoints.push(i)
    clusters[i] = clusterId
    
    // Expand cluster using seed set
    const seedSet = [...neighbors]
    
    while (seedSet.length > 0) {
      const currentPoint = seedSet.pop()!
      
      if (!visited[currentPoint]) {
        visited[currentPoint] = true
        const currentNeighbors = getEpsNeighborhood(data, currentPoint, eps)
        
        if (currentNeighbors.length >= minPts) {
          // Current point is also core point
          corePoints.push(currentPoint)
          seedSet.push(...currentNeighbors.filter(p => !visited[p]))
        }
      }
      
      if (clusters[currentPoint] === -1) {
        // Assign to current cluster
        clusters[currentPoint] = clusterId
        
        // Remove from noise if it was there
        const noiseIndex = noise.indexOf(currentPoint)
        if (noiseIndex > -1) {
          noise.splice(noiseIndex, 1)
          borderPoints.push(currentPoint)
        }
      }
    }
    
    clusterId++
  }
  
  return {
    clusters,
    noise,
    numClusters: clusterId,
    corePoints,
    borderPoints
  }
}

function getEpsNeighborhood(
  data: number[][], 
  pointIndex: number, 
  eps: number
): number[] {
  const neighbors: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i !== pointIndex && 
        euclideanDistance(data[pointIndex], data[i]) <= eps) {
      neighbors.push(i)
    }
  }
  
  return neighbors
}
```

### **Hierarchical Clustering**

```typescript
interface HierarchicalParams {
  k: number                    // Target number of clusters
  linkage?: 'single' | 'complete' | 'average' | 'ward'
}

interface HierarchicalResult {
  clusters: number[]
  dendrogram: DendrogramNode[]
  linkageMatrix: number[][]    // [cluster1, cluster2, distance, size]
}

interface DendrogramNode {
  id: number
  left?: DendrogramNode
  right?: DendrogramNode
  distance: number
  size: number
}

function hierarchicalClustering(
  data: number[][], 
  params: HierarchicalParams
): HierarchicalResult {
  const { k, linkage = 'single' } = params
  const n = data.length
  
  // Initialize: each point as separate cluster
  let clusters: number[][] = Array.from({ length: n }, (_, i) => [i])
  const linkageMatrix: number[][] = []
  const dendrogram: DendrogramNode[] = []
  
  // Build initial leaf nodes for dendrogram
  for (let i = 0; i < n; i++) {
    dendrogram.push({ id: i, distance: 0, size: 1 })
  }
  
  let nextNodeId = n
  
  // Merge until we have k clusters
  while (clusters.length > k) {
    let minDistance = Infinity
    let mergeIndices = [0, 1]
    
    // Find closest pair of clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = calculateClusterDistance(
          data, clusters[i], clusters[j], linkage
        )
        
        if (distance < minDistance) {
          minDistance = distance
          mergeIndices = [i, j]
        }
      }
    }
    
    // Merge the closest clusters
    const [i, j] = mergeIndices
    const cluster1 = clusters[i]
    const cluster2 = clusters[j]
    const mergedCluster = [...cluster1, ...cluster2]
    
    // Record merge in linkage matrix
    linkageMatrix.push([i, j, minDistance, mergedCluster.length])
    
    // Create new dendrogram node
    const newNode: DendrogramNode = {
      id: nextNodeId++,
      left: dendrogram[i],
      right: dendrogram[j], 
      distance: minDistance,
      size: mergedCluster.length
    }
    dendrogram.push(newNode)
    
    // Update cluster list
    clusters = clusters.filter((_, idx) => idx !== i && idx !== j)
    clusters.push(mergedCluster)
  }
  
  // Assign final cluster labels
  const clusterLabels = new Array(n).fill(0)
  clusters.forEach((cluster, clusterIndex) => {
    cluster.forEach(pointIndex => {
      clusterLabels[pointIndex] = clusterIndex
    })
  })
  
  return {
    clusters: clusterLabels,
    dendrogram,
    linkageMatrix
  }
}

function calculateClusterDistance(
  data: number[][],
  cluster1: number[],
  cluster2: number[], 
  linkage: string
): number {
  const distances: number[] = []
  
  // Calculate all pairwise distances
  for (const i of cluster1) {
    for (const j of cluster2) {
      distances.push(euclideanDistance(data[i], data[j]))
    }
  }
  
  switch (linkage) {
    case 'single':
      return Math.min(...distances)
    case 'complete':
      return Math.max(...distances)
    case 'average':
      return distances.reduce((sum, d) => sum + d, 0) / distances.length
    case 'ward':
      return calculateWardDistance(data, cluster1, cluster2)
    default:
      return Math.min(...distances)
  }
}

function calculateWardDistance(
  data: number[][],
  cluster1: number[],
  cluster2: number[]
): number {
  // Ward linkage: minimize within-cluster sum of squares
  const n1 = cluster1.length
  const n2 = cluster2.length
  
  const centroid1 = calculateClusterCentroid(data, cluster1)
  const centroid2 = calculateClusterCentroid(data, cluster2)
  
  const distance = euclideanDistance(centroid1, centroid2)
  
  return Math.sqrt((2 * n1 * n2) / (n1 + n2)) * distance
}
```

---

## 📊 **Database Design**

### **Prisma Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Dataset {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(255)
  filename    String   @db.VarChar(255)
  rows        Int
  columns     Int
  data        String   @db.Text  // JSON string of dataset
  metadata    Json?              // Additional metadata
  uploadedAt  DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  models      Model[]
  
  // Indexes
  @@index([uploadedAt])
  @@index([rows, columns])
  @@map("datasets")
}

model Model {
  id              String   @id @default(cuid())
  name            String   @db.VarChar(255)
  algorithm       String   @db.VarChar(50)  // kmeans, hierarchical, dbscan
  parameters      Json                      // Algorithm parameters
  numClusters     Int
  silhouetteScore Float
  inertia         Float?
  status          String   @default("training") @db.VarChar(20)
  resultData      Json?                     // Clustering results
  trainingTime    Int?                      // Training time in milliseconds
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  datasetId       String
  dataset         Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  evaluations     ModelEvaluation[]
  
  // Indexes
  @@index([algorithm])
  @@index([silhouetteScore])
  @@index([createdAt])
  @@index([datasetId])
  @@map("models")
}

model ModelEvaluation {
  id          String   @id @default(cuid())
  metric      String   @db.VarChar(50)  // silhouette, inertia, davies_bouldin, etc.
  value       Float
  parameters  Json?                     // Evaluation parameters
  createdAt   DateTime @default(now())
  
  // Relations
  modelId     String
  model       Model    @relation(fields: [modelId], references: [id], onDelete: Cascade)
  
  // Indexes
  @@index([metric])
  @@index([modelId])
  @@map("model_evaluations")
}

// User management (future enhancement)
model User {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(255)
  name      String?  @db.VarChar(255)
  role      String   @default("user") @db.VarChar(20)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
  @@map("users")
}

// Audit log for tracking actions
model AuditLog {
  id          String   @id @default(cuid())
  action      String   @db.VarChar(100)  // upload, train, delete, etc.
  entityType  String   @db.VarChar(50)   // dataset, model
  entityId    String   @db.VarChar(50)
  userId      String?  @db.VarChar(50)
  metadata    Json?
  timestamp   DateTime @default(now())
  
  @@index([action])
  @@index([entityType])
  @@index([timestamp])
  @@map("audit_logs")
}
```

### **Database Queries**

```typescript
// Complex queries with Prisma

// Get datasets with model count and latest model
async function getDatasetsWithModels() {
  return await db.dataset.findMany({
    select: {
      id: true,
      name: true,
      rows: true,
      columns: true,
      uploadedAt: true,
      _count: {
        select: { models: true }
      },
      models: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          algorithm: true,
          silhouetteScore: true,
          status: true
        }
      }
    },
    orderBy: { uploadedAt: 'desc' }
  })
}

// Get best performing models by silhouette score
async function getBestModels(limit: number = 10) {
  return await db.model.findMany({
    where: {
      status: 'completed',
      silhouetteScore: { gte: 0.5 }
    },
    orderBy: { silhouetteScore: 'desc' },
    take: limit,
    include: {
      dataset: {
        select: { name: true, rows: true, columns: true }
      },
      evaluations: true
    }
  })
}

// Get algorithm performance comparison
async function getAlgorithmComparison() {
  return await db.model.groupBy({
    by: ['algorithm'],
    where: { status: 'completed' },
    _avg: {
      silhouetteScore: true,
      inertia: true,
      trainingTime: true
    },
    _count: {
      _all: true
    },
    _max: {
      silhouetteScore: true
    },
    _min: {
      trainingTime: true
    }
  })
}

// Search models with filters
async function searchModels(filters: {
  algorithm?: string
  minSilhouette?: number
  maxInertia?: number
  dateFrom?: Date
  dateTo?: Date
}) {
  const where: any = { status: 'completed' }
  
  if (filters.algorithm) {
    where.algorithm = filters.algorithm
  }
  
  if (filters.minSilhouette) {
    where.silhouetteScore = { gte: filters.minSilhouette }
  }
  
  if (filters.maxInertia) {
    where.inertia = { lte: filters.maxInertia }
  }
  
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
    if (filters.dateTo) where.createdAt.lte = filters.dateTo
  }
  
  return await db.model.findMany({
    where,
    include: {
      dataset: { select: { name: true } },
      evaluations: true
    },
    orderBy: { silhouetteScore: 'desc' }
  })
}
```

---

## 🎨 **Frontend Components**

### **Dataset Upload Component**

```typescript
// components/DatasetUpload.tsx
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, Check, X } from 'lucide-react'

interface DatasetUploadProps {
  onUploadSuccess: (dataset: Dataset) => void
  onUploadError: (error: string) => void
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({
  onUploadSuccess,
  onUploadError
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    setUploadedFile(file)
    setUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        onUploadSuccess(result.dataset)
        setUploading(false)
        setUploadProgress(0)
        setUploadedFile(null)
      }, 500)

    } catch (error) {
      clearInterval(progressInterval)
      onUploadError(error instanceof Error ? error.message : 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onUploadSuccess, onUploadError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: uploading
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop the CSV file here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload Dataset
            </p>
            <p className="text-gray-600 mb-4">
              Drag & drop your CSV file here, or click to select
            </p>
            <Button variant="outline" disabled={uploading}>
              Select CSV File
            </Button>
          </div>
        )}
      </div>

      {uploadedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{uploadedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            
            {uploading ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### **Clustering Visualization Component**

```typescript
// components/ClusterVisualization.tsx
import React, { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ClusterVisualizationProps {
  data: ClusterPoint[]
  centroids?: number[][]
  title?: string
  xLabel?: string
  yLabel?: string
}

interface ClusterPoint {
  x: number
  y: number
  cluster: number
  originalIndex?: number
}

const CLUSTER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
]

export const ClusterVisualization: React.FC<ClusterVisualizationProps> = ({
  data,
  centroids,
  title = 'Clustering Results',
  xLabel = 'Feature 1',
  yLabel = 'Feature 2'
}) => {
  const { clusterData, clusterStats } = useMemo(() => {
    const clusters = new Map<number, ClusterPoint[]>()
    
    // Group points by cluster
    data.forEach(point => {
      if (!clusters.has(point.cluster)) {
        clusters.set(point.cluster, [])
      }
      clusters.get(point.cluster)!.push(point)
    })
    
    // Calculate cluster statistics
    const stats = Array.from(clusters.entries()).map(([clusterId, points]) => ({
      id: clusterId,
      count: points.length,
      color: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length],
      center: centroids?.[clusterId] || calculateCenter(points)
    }))
    
    return {
      clusterData: Array.from(clusters.entries()),
      clusterStats: stats
    }
  }, [data, centroids])

  const calculateCenter = (points: ClusterPoint[]): [number, number] => {
    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    return [sumX / points.length, sumY / points.length]
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">Point #{point.originalIndex || 'N/A'}</p>
          <p className="text-sm">X: {point.x.toFixed(3)}</p>
          <p className="text-sm">Y: {point.y.toFixed(3)}</p>
          <p className="text-sm">Cluster: {point.cluster}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {data.length} points, {clusterStats.length} clusters
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Cluster Statistics */}
          <div className="flex flex-wrap gap-2">
            {clusterStats.map(cluster => (
              <Badge
                key={cluster.id}
                variant="secondary"
                style={{ 
                  backgroundColor: cluster.color + '20',
                  borderColor: cluster.color,
                  color: cluster.color
                }}
              >
                Cluster {cluster.id}: {cluster.count} points
              </Badge>
            ))}
          </div>

          {/* Scatter Plot */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 80, bottom: 60, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xLabel}
                  tickFormatter={(value) => value.toFixed(2)}
                  label={{ 
                    value: xLabel, 
                    position: 'insideBottom', 
                    offset: -10 
                  }}
                />
                
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yLabel}
                  tickFormatter={(value) => value.toFixed(2)}
                  label={{ 
                    value: yLabel, 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Render each cluster */}
                {clusterData.map(([clusterId, points]) => (
                  <Scatter
                    key={clusterId}
                    name={`Cluster ${clusterId}`}
                    data={points}
                    fill={CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]}
                    opacity={0.7}
                  />
                ))}

                {/* Render centroids if provided */}
                {centroids && centroids.map((centroid, index) => (
                  <ReferenceLine
                    key={`centroid-${index}`}
                    x={centroid[0]}
                    stroke={CLUSTER_COLORS[index % CLUSTER_COLORS.length]}
                    strokeWidth={3}
                    strokeDasharray="5 5"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 🚀 **Deployment Guide**

### **Environment Setup**

```bash
# .env.production
NODE_ENV=production
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=your_key"
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: File storage
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### **Docker Production Setup**

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed  
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### **Docker Compose for Development**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/ulplatform
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=ulplatform
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### **PM2 Production Configuration**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ul-platform',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
}
```

### **Nginx Reverse Proxy**

```nginx
# /etc/nginx/sites-available/ul-platform
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.IO support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### **Monitoring & Logging**

```javascript
// monitoring/health-check.js
const http = require('http')

const healthCheck = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  }

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Health check passed')
      process.exit(0)
    } else {
      console.log('❌ Health check failed:', res.statusCode)
      process.exit(1)
    }
  })

  req.on('error', (err) => {
    console.log('❌ Health check error:', err.message)
    process.exit(1)
  })

  req.on('timeout', () => {
    console.log('❌ Health check timeout')
    req.destroy()
    process.exit(1)
  })

  req.end()
}

healthCheck()
```

---

*Technical Documentation Generated: October 20, 2025*  
*Version: 1.0*