import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const datasetId = searchParams.get('datasetId')

    if (!datasetId) {
      return NextResponse.json({ 
        error: 'Dataset ID is required' 
      }, { status: 400 })
    }

    // Get dataset and its profile
    const dataset = await db.dataset.findUnique({
      where: { id: datasetId }
    })
    
    const dataProfile = await (db as any).dataProfile.findUnique({
      where: { datasetId }
    })

    if (!dataset) {
      return NextResponse.json({
        error: 'Dataset not found'
      }, { status: 404 })
    }

    const data = JSON.parse(dataset.data)
    
    // If no profile exists, create one
    if (!dataProfile) {
      const profile = await createDataProfile(datasetId, data)
      return NextResponse.json({
        success: true,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          rows: dataset.rows,
          columns: dataset.columns
        },
        profile
      })
    }

    // Return existing profile
    const profile = {
      statistics: JSON.parse(dataProfile.statistics),
      correlations: JSON.parse(dataProfile.correlations),
      distributions: JSON.parse(dataProfile.distributions),
      outliers: JSON.parse(dataProfile.outliers),
      missingData: JSON.parse(dataProfile.missingData)
    }

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        rows: dataset.rows,
        columns: dataset.columns
      },
      profile
    })

  } catch (error) {
    console.error('Data profiling error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve data profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { datasetId, analysisType, parameters = {} } = body

    if (!datasetId) {
      return NextResponse.json({ 
        error: 'Dataset ID is required' 
      }, { status: 400 })
    }

    const dataset = await db.dataset.findUnique({
      where: { id: datasetId }
    })

    if (!dataset) {
      return NextResponse.json({
        error: 'Dataset not found'
      }, { status: 404 })
    }

    const data = JSON.parse(dataset.data)
    let analysisResult: any = {}

    switch (analysisType) {
      case 'outlier_detection':
        analysisResult = performOutlierDetection(data, parameters)
        break
      
      case 'feature_importance':
        analysisResult = calculateFeatureImportance(data, parameters)
        break
      
      case 'correlation_analysis':
        analysisResult = performCorrelationAnalysis(data, parameters)
        break
      
      case 'distribution_analysis':
        analysisResult = performDistributionAnalysis(data, parameters)
        break
      
      case 'data_quality':
        analysisResult = assessDataQuality(data)
        break
      
      default:
        return NextResponse.json({
          error: `Unsupported analysis type: ${analysisType}`
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      analysisType,
      result: analysisResult
    })

  } catch (error) {
    console.error('Data analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to perform data analysis' },
      { status: 500 }
    )
  }
}

async function createDataProfile(datasetId: string, data: any[]) {
  if (data.length === 0) {
    return {
      statistics: {},
      correlations: {},
      distributions: {},
      outliers: {},
      missingData: {}
    }
  }

  const columns = Object.keys(data[0])
  const numericColumns: string[] = []
  const categoricalColumns: string[] = []

  // Identify column types
  for (const column of columns) {
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '')
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)))
    
    if (numericValues.length / values.length > 0.8) {
      numericColumns.push(column)
    } else {
      categoricalColumns.push(column)
    }
  }

  // Calculate statistics
  const statistics: any = {}
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (values.length > 0) {
      values.sort((a, b) => a - b)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const median = values[Math.floor(values.length / 2)]
      const std = Math.sqrt(values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length)
      
      statistics[column] = {
        count: values.length,
        mean: Math.round(mean * 10000) / 10000,
        median: Math.round(median * 10000) / 10000,
        min: values[0],
        max: values[values.length - 1],
        std: Math.round(std * 10000) / 10000,
        q25: values[Math.floor(values.length * 0.25)],
        q75: values[Math.floor(values.length * 0.75)],
        skewness: calculateSkewness(values, mean, std),
        kurtosis: calculateKurtosis(values, mean, std)
      }
    }
  }

  // Calculate correlations
  const correlations: any = {}
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i; j < numericColumns.length; j++) {
      const col1 = numericColumns[i]
      const col2 = numericColumns[j]
      
      if (col1 === col2) {
        correlations[`${col1}_${col2}`] = 1
        continue
      }

      const values1 = data.map(row => Number(row[col1])).filter(v => !isNaN(v))
      const values2 = data.map(row => Number(row[col2])).filter(v => !isNaN(v))
      
      if (values1.length === values2.length && values1.length > 1) {
        const correlation = calculateCorrelation(values1, values2)
        correlations[`${col1}_${col2}`] = Math.round(correlation * 10000) / 10000
        correlations[`${col2}_${col1}`] = Math.round(correlation * 10000) / 10000
      }
    }
  }

  // Calculate distributions
  const distributions: any = {}
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (values.length > 0) {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const bins = Math.min(20, Math.ceil(Math.sqrt(values.length)))
      const binSize = (max - min) / bins
      const histogram = new Array(bins).fill(0)
      
      values.forEach(val => {
        const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1)
        histogram[binIndex]++
      })
      
      distributions[column] = {
        histogram,
        bins,
        binSize,
        min,
        max,
        binLabels: Array.from({ length: bins }, (_, i) => 
          Math.round((min + i * binSize) * 100) / 100
        )
      }
    }
  }

  // Detect outliers
  const outliers: any = {}
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (values.length > 0) {
      values.sort((a, b) => a - b)
      const q1 = values[Math.floor(values.length * 0.25)]
      const q3 = values[Math.floor(values.length * 0.75)]
      const iqr = q3 - q1
      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr
      
      const outlierValues = values.filter(v => v < lowerBound || v > upperBound)
      outliers[column] = {
        count: outlierValues.length,
        percentage: (outlierValues.length / values.length) * 100,
        lowerBound,
        upperBound,
        values: outlierValues.slice(0, 10) // First 10 outliers
      }
    }
  }

  // Missing data analysis
  const missingData: any = {}
  for (const column of columns) {
    const totalCount = data.length
    const missingCount = data.filter(row => 
      row[column] === null || row[column] === undefined || row[column] === ''
    ).length
    
    missingData[column] = {
      count: missingCount,
      percentage: (missingCount / totalCount) * 100
    }
  }

  const profile = {
    statistics,
    correlations,
    distributions,
    outliers,
    missingData
  }

  // Save to database
  try {
    await (db as any).dataProfile.create({
      data: {
        datasetId,
        statistics: JSON.stringify(statistics),
        correlations: JSON.stringify(correlations),
        distributions: JSON.stringify(distributions),
        outliers: JSON.stringify(outliers),
        missingData: JSON.stringify(missingData)
      }
    })
  } catch (error) {
    console.error('Failed to save data profile:', error)
  }

  return profile
}

function performOutlierDetection(data: any[], parameters: any) {
  const method = parameters.method || 'iqr'
  const threshold = parameters.threshold || 1.5
  
  const numericColumns = getNumericColumns(data)
  const outliers: any = {}
  
  for (const column of numericColumns) {
    const values = data.map((row, index) => ({ value: Number(row[column]), index }))
      .filter(item => !isNaN(item.value))
    
    let outlierIndices: number[] = []
    
    if (method === 'iqr') {
      const sortedValues = values.map(item => item.value).sort((a, b) => a - b)
      const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)]
      const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)]
      const iqr = q3 - q1
      const lowerBound = q1 - threshold * iqr
      const upperBound = q3 + threshold * iqr
      
      outlierIndices = values
        .filter(item => item.value < lowerBound || item.value > upperBound)
        .map(item => item.index)
        
    } else if (method === 'zscore') {
      const vals = values.map(item => item.value)
      const mean = vals.reduce((sum, val) => sum + val, 0) / vals.length
      const std = Math.sqrt(vals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / vals.length)
      
      outlierIndices = values
        .filter(item => Math.abs((item.value - mean) / std) > threshold)
        .map(item => item.index)
    }
    
    outliers[column] = {
      method,
      threshold,
      count: outlierIndices.length,
      indices: outlierIndices.slice(0, 50), // First 50 outlier indices
      percentage: (outlierIndices.length / data.length) * 100
    }
  }
  
  return { outliers, totalOutlierRows: new Set(Object.values(outliers).flatMap((o: any) => o.indices)).size }
}

function calculateFeatureImportance(data: any[], parameters: any) {
  const targetColumn = parameters.targetColumn
  const numericColumns = getNumericColumns(data)
  
  if (!targetColumn || !numericColumns.includes(targetColumn)) {
    return { error: 'Invalid target column' }
  }
  
  const importance: any = {}
  const targetValues = data.map(row => Number(row[targetColumn])).filter(v => !isNaN(v))
  
  for (const column of numericColumns) {
    if (column === targetColumn) continue
    
    const featureValues = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (featureValues.length === targetValues.length) {
      const correlation = Math.abs(calculateCorrelation(featureValues, targetValues))
      const variance = calculateVariance(featureValues)
      
      // Simple importance score combining correlation and variance
      const importanceScore = correlation * Math.log(variance + 1)
      
      importance[column] = {
        correlation: Math.round(correlation * 10000) / 10000,
        variance: Math.round(variance * 10000) / 10000,
        importance: Math.round(importanceScore * 10000) / 10000
      }
    }
  }
  
  // Sort by importance
  const sortedImportance = Object.entries(importance)
    .sort(([, a]: any, [, b]: any) => b.importance - a.importance)
    .slice(0, 10) // Top 10 features
  
  return { 
    targetColumn,
    featureImportance: Object.fromEntries(sortedImportance),
    topFeatures: sortedImportance.map(([name]) => name)
  }
}

function performCorrelationAnalysis(data: any[], parameters: any) {
  const numericColumns = getNumericColumns(data)
  const correlationMatrix: any = {}
  const strongCorrelations: any[] = []
  
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i; j < numericColumns.length; j++) {
      const col1 = numericColumns[i]
      const col2 = numericColumns[j]
      
      if (col1 === col2) {
        correlationMatrix[`${col1}_${col2}`] = 1
        continue
      }
      
      const values1 = data.map(row => Number(row[col1])).filter(v => !isNaN(v))
      const values2 = data.map(row => Number(row[col2])).filter(v => !isNaN(v))
      
      if (values1.length === values2.length && values1.length > 1) {
        const correlation = calculateCorrelation(values1, values2)
        const roundedCorr = Math.round(correlation * 10000) / 10000
        
        correlationMatrix[`${col1}_${col2}`] = roundedCorr
        correlationMatrix[`${col2}_${col1}`] = roundedCorr
        
        // Strong correlations (|r| > 0.7)
        if (Math.abs(correlation) > 0.7) {
          strongCorrelations.push({
            feature1: col1,
            feature2: col2,
            correlation: roundedCorr,
            strength: Math.abs(correlation) > 0.9 ? 'very strong' : 'strong',
            type: correlation > 0 ? 'positive' : 'negative'
          })
        }
      }
    }
  }
  
  return {
    correlationMatrix,
    strongCorrelations,
    matrixSize: numericColumns.length,
    columns: numericColumns
  }
}

function performDistributionAnalysis(data: any[], parameters: any) {
  const numericColumns = getNumericColumns(data)
  const distributions: any = {}
  
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (values.length > 0) {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const std = Math.sqrt(values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length)
      
      distributions[column] = {
        mean: Math.round(mean * 10000) / 10000,
        std: Math.round(std * 10000) / 10000,
        skewness: calculateSkewness(values, mean, std),
        kurtosis: calculateKurtosis(values, mean, std),
        normality: assessNormality(values, mean, std),
        distributionType: classifyDistribution(values, mean, std)
      }
    }
  }
  
  return { distributions }
}

function assessDataQuality(data: any[]) {
  const columns = Object.keys(data[0] || {})
  const totalRows = data.length
  
  let qualityScore = 100
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Missing data
  let totalMissing = 0
  for (const column of columns) {
    const missingCount = data.filter(row => 
      row[column] === null || row[column] === undefined || row[column] === ''
    ).length
    totalMissing += missingCount
    
    const missingPercentage = (missingCount / totalRows) * 100
    if (missingPercentage > 10) {
      qualityScore -= missingPercentage / 2
      issues.push(`Column '${column}' has ${missingPercentage.toFixed(1)}% missing values`)
      
      if (missingPercentage > 50) {
        recommendations.push(`Consider removing column '${column}' or using advanced imputation`)
      } else {
        recommendations.push(`Consider imputing missing values in column '${column}'`)
      }
    }
  }
  
  // Duplicate rows
  const rowStrings = data.map(row => JSON.stringify(row))
  const uniqueRows = new Set(rowStrings)
  const duplicateCount = totalRows - uniqueRows.size
  const duplicatePercentage = (duplicateCount / totalRows) * 100
  
  if (duplicateCount > 0) {
    qualityScore -= duplicatePercentage
    issues.push(`Found ${duplicateCount} duplicate rows (${duplicatePercentage.toFixed(1)}%)`)
    recommendations.push('Remove duplicate rows to improve data quality')
  }
  
  // Data consistency
  const numericColumns = getNumericColumns(data)
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v))
    
    if (values.length > 0) {
      // Check for extreme outliers
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const std = Math.sqrt(values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length)
      
      const extremeOutliers = values.filter(v => Math.abs((v - mean) / std) > 4)
      if (extremeOutliers.length > 0) {
        const outlierPercentage = (extremeOutliers.length / values.length) * 100
        qualityScore -= outlierPercentage
        issues.push(`Column '${column}' has ${extremeOutliers.length} extreme outliers`)
        recommendations.push(`Review extreme outliers in column '${column}'`)
      }
    }
  }
  
  return {
    overallScore: Math.max(0, Math.round(qualityScore)),
    scoreInterpretation: 
      qualityScore >= 90 ? 'Excellent' :
      qualityScore >= 80 ? 'Good' :
      qualityScore >= 70 ? 'Fair' :
      qualityScore >= 60 ? 'Poor' : 'Very Poor',
    issues,
    recommendations,
    metrics: {
      totalRows,
      totalColumns: columns.length,
      missingValues: totalMissing,
      duplicateRows: duplicateCount,
      numericColumns: numericColumns.length
    }
  }
}

// Helper functions
function getNumericColumns(data: any[]): string[] {
  if (data.length === 0) return []
  
  const columns = Object.keys(data[0])
  return columns.filter(column => {
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '')
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)))
    return numericValues.length / values.length > 0.8
  })
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n === 0) return 0

  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
}

function calculateSkewness(values: number[], mean: number, std: number): number {
  if (std === 0 || values.length === 0) return 0
  const n = values.length
  const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n
  return Math.round(skewness * 10000) / 10000
}

function calculateKurtosis(values: number[], mean: number, std: number): number {
  if (std === 0 || values.length === 0) return 0
  const n = values.length
  const kurtosis = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n - 3
  return Math.round(kurtosis * 10000) / 10000
}

function assessNormality(values: number[], mean: number, std: number): string {
  const skewness = calculateSkewness(values, mean, std)
  const kurtosis = calculateKurtosis(values, mean, std)
  
  if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 0.5) {
    return 'approximately normal'
  } else if (Math.abs(skewness) < 1 && Math.abs(kurtosis) < 1) {
    return 'moderately normal'
  } else {
    return 'not normal'
  }
}

function classifyDistribution(values: number[], mean: number, std: number): string {
  const skewness = calculateSkewness(values, mean, std)
  
  if (Math.abs(skewness) < 0.5) {
    return 'symmetric'
  } else if (skewness > 0.5) {
    return 'right-skewed'
  } else {
    return 'left-skewed'
  }
}