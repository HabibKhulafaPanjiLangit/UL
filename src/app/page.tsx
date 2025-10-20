'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Play, Download, BarChart3, Settings, Database } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts'

interface Dataset {
  id: string
  name: string
  rows: number
  columns: number
  uploadedAt: string
}

interface ModelResult {
  id: string
  algorithm: string
  clusters: number
  silhouetteScore: number
  inertia: number
  data: any[]
  createdAt: string
}

export default function UnsupervisedLearningApp() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('kmeans')
  const [numClusters, setNumClusters] = useState<number>(3)
  const [isTraining, setIsTraining] = useState<boolean>(false)
  const [trainingProgress, setTrainingProgress] = useState<number>(0)
  const [results, setResults] = useState<ModelResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ModelResult | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleGenerateSample = useCallback(async () => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/sample', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Sample generation failed')
      }

      const result = await response.json()
      setDatasets(prev => [...prev, result.dataset])
      setSuccess('Sample dataset generated successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate sample data'
      setError(errorMessage)
      console.error('Sample generation error:', err)
    }
  }, [])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setDatasets(prev => [...prev, result.dataset])
      setSuccess('Dataset uploaded successfully!')
      setUploadFile(null)
    } catch (err) {
      setError('Failed to upload dataset')
    }
  }, [])

  const handleTrainModel = useCallback(async () => {
    if (!selectedDataset) {
      setError('Please select a dataset first')
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)
    setError('')
    setSuccess('')

    const progressInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const response = await fetch('/api/model/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: selectedDataset,
          algorithm: selectedAlgorithm,
          numClusters,
        }),
      })

      clearInterval(progressInterval)
      setTrainingProgress(100)

      if (!response.ok) {
        throw new Error('Training failed')
      }

      const result = await response.json()
      setResults(prev => [...prev, result.model])
      setSelectedResult(result.model)
      setSuccess('Model trained successfully!')
    } catch (err) {
      setError('Failed to train model')
    } finally {
      setTimeout(() => {
        setIsTraining(false)
        setTrainingProgress(0)
      }, 1000)
    }
  }, [selectedDataset, selectedAlgorithm, numClusters])

  const handleDownloadResults = useCallback(() => {
    if (!selectedResult) return

    const dataStr = JSON.stringify(selectedResult, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = `clustering_results_${selectedResult.algorithm}_${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [selectedResult])

  const generateSampleData = (): Array<{x: number, y: number, cluster: number}> => {
    const sampleData: Array<{x: number, y: number, cluster: number}> = []
    for (let i = 0; i < 100; i++) {
      const cluster = Math.floor(Math.random() * 3)
      const centerX = cluster === 0 ? 2 : cluster === 1 ? 8 : 5
      const centerY = cluster === 0 ? 2 : cluster === 1 ? 8 : 5
      sampleData.push({
        x: centerX + (Math.random() - 0.5) * 3,
        y: centerY + (Math.random() - 0.5) * 3,
        cluster: cluster
      })
    }
    return sampleData
  }

  const sampleData = generateSampleData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center py-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl font-bold text-white">UL</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">UL Platform</h1>
              <p className="text-lg text-slate-600">Unsupervised Learning & Data Analysis</p>
            </div>
          </div>
          <p className="text-lg text-slate-600">Complete clustering analysis with multiple algorithms</p>
        </header>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="dataset" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dataset" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Dataset
            </TabsTrigger>
            <TabsTrigger value="model" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Model
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="visualization" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Visualization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dataset">
            <Card>
              <CardHeader>
                <CardTitle>Dataset Management</CardTitle>
                <CardDescription>Upload your dataset for clustering analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-lg font-medium">
                      Upload Dataset (CSV format)
                    </Label>
                    <p className="text-sm text-slate-600">
                      Upload a CSV file with numerical features for clustering
                    </p>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto mt-4"
                    />
                    <div className="mt-4">
                      <Button
                        onClick={handleGenerateSample}
                        variant="outline"
                        size="sm"
                        className="mx-auto"
                      >
                        Generate Sample Data
                      </Button>
                    </div>
                  </div>
                </div>

                {datasets.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Uploaded Datasets</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {datasets.map((dataset) => (
                        <Card key={dataset.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{dataset.name}</h4>
                              <Badge variant="secondary">ID: {dataset.id.slice(0, 8)}</Badge>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <p>Rows: {dataset.rows.toLocaleString()}</p>
                              <p>Columns: {dataset.columns}</p>
                              <p>Uploaded: {new Date(dataset.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <Button
                              variant={selectedDataset === dataset.id ? "default" : "outline"}
                              size="sm"
                              className="w-full mt-3"
                              onClick={() => setSelectedDataset(dataset.id)}
                            >
                              {selectedDataset === dataset.id ? 'Selected' : 'Select'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle>Model Configuration</CardTitle>
                <CardDescription>Configure and train your clustering model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="algorithm">Clustering Algorithm</Label>
                    <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select algorithm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kmeans">K-Means Clustering</SelectItem>
                        <SelectItem value="hierarchical">Hierarchical Clustering</SelectItem>
                        <SelectItem value="dbscan">DBSCAN Clustering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clusters">Number of Clusters</Label>
                    <Input
                      id="clusters"
                      type="number"
                      min="2"
                      max="20"
                      value={numClusters}
                      onChange={(e) => setNumClusters(parseInt(e.target.value) || 3)}
                    />
                  </div>
                </div>

                {selectedDataset && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Dataset</h4>
                    <p className="text-sm text-slate-600">
                      Dataset ID: {selectedDataset.slice(0, 8)}...
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleTrainModel}
                  disabled={!selectedDataset || isTraining}
                  className="w-full"
                  size="lg"
                >
                  {isTraining ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Training Model...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Train Model
                    </div>
                  )}
                </Button>

                {isTraining && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Training Progress</span>
                      <span>{trainingProgress}%</span>
                    </div>
                    <Progress value={trainingProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Model Results</CardTitle>
                <CardDescription>View and analyze your clustering results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {results.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {results.map((result) => (
                        <Card
                          key={result.id}
                          className={`cursor-pointer transition-all ${
                            selectedResult?.id === result.id
                              ? 'ring-2 ring-blue-500 shadow-md'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => setSelectedResult(result)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium capitalize">{result.algorithm}</h4>
                              <Badge variant="outline">{result.clusters} clusters</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Silhouette Score:</span>
                                <span className="font-medium">{result.silhouetteScore.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Inertia:</span>
                                <span className="font-medium">{result.inertia.toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                {new Date(result.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {selectedResult && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Selected Model Details</h3>
                          <Button onClick={handleDownloadResults} size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download Results
                          </Button>
                        </div>
                        <Card>
                          <CardContent className="p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <h4 className="font-medium mb-2">Model Metrics</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Algorithm:</span>
                                    <span className="font-medium capitalize">{selectedResult.algorithm}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Number of Clusters:</span>
                                    <span className="font-medium">{selectedResult.clusters}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Silhouette Score:</span>
                                    <span className="font-medium">{selectedResult.silhouetteScore.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Inertia:</span>
                                    <span className="font-medium">{selectedResult.inertia.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Data Points</h4>
                                <p className="text-sm text-slate-600">
                                  Total clustered points: {selectedResult.data?.length || 0}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results yet. Train a model to see results here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualization">
            <Card>
              <CardHeader>
                <CardTitle>Data Visualization</CardTitle>
                <CardDescription>Visualize your clustering results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="h-96">
                    <h3 className="text-lg font-semibold mb-4">Sample Data Visualization</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="X" />
                        <YAxis type="number" dataKey="y" name="Y" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name="Cluster 0" data={sampleData.filter(d => d.cluster === 0)} fill="#8884d8" />
                        <Scatter name="Cluster 1" data={sampleData.filter(d => d.cluster === 1)} fill="#82ca9d" />
                        <Scatter name="Cluster 2" data={sampleData.filter(d => d.cluster === 2)} fill="#ffc658" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {selectedResult && selectedResult.data && (
                    <div className="h-96">
                      <h3 className="text-lg font-semibold mb-4">Model Results Visualization</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" dataKey="x" name="Feature 1" />
                          <YAxis type="number" dataKey="y" name="Feature 2" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Legend />
                          {Array.from({ length: selectedResult.clusters }, (_, i) => (
                            <Scatter
                              key={i}
                              name={`Cluster ${i}`}
                              data={selectedResult.data.filter((d: any) => d.cluster === i)}
                              fill={`hsl(${i * 360 / selectedResult.clusters}, 70%, 50%)`}
                            />
                          ))}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
