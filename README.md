# Unsupervised Learning Platform

A comprehensive web-based platform for unsupervised machine learning with multiple clustering algorithms and visualization capabilities.

## Features

### 🔄 **Multiple Clustering Algorithms**
- **K-Means Clustering**: Classic centroid-based clustering
- **Hierarchical Clustering**: Agglomerative clustering with linkage methods
- **DBSCAN**: Density-based spatial clustering for applications with noise

### 📊 **Data Management**
- Upload CSV datasets with automatic numeric column detection
- Generate sample datasets for testing
- Store and manage multiple datasets
- Real-time data validation

### 📈 **Model Evaluation**
- **Silhouette Score**: Measure clustering quality
- **Inertia**: Within-cluster sum of squares
- Real-time training progress tracking
- Model comparison and selection

### 🎨 **Interactive Visualization**
- Scatter plots for 2D data visualization
- Color-coded cluster representation
- Interactive chart components
- Download results in JSON format

### 💾 **Database Integration**
- SQLite database with Prisma ORM
- Persistent storage for datasets and models
- Model history and evaluation metrics
- Efficient data retrieval

## How to Use

### 1. **Dataset Management**
- Go to the **Dataset** tab
- Upload a CSV file with numerical features or generate sample data
- View uploaded datasets with metadata

### 2. **Model Configuration**
- Navigate to the **Model** tab
- Select a dataset and clustering algorithm
- Configure the number of clusters
- Click "Train Model" to start training

### 3. **Results Analysis**
- Check the **Results** tab for trained models
- View evaluation metrics (Silhouette Score, Inertia)
- Compare different models
- Download results for further analysis

### 4. **Visualization**
- Use the **Visualization** tab to see cluster plots
- Interactive scatter plots with color-coded clusters
- Sample data visualization for reference

## API Endpoints

### Dataset Management
- `POST /api/dataset/upload` - Upload CSV dataset
- `GET /api/dataset/upload` - List all datasets
- `POST /api/sample` - Generate sample dataset

### Model Training
- `POST /api/model/train` - Train clustering model
- `GET /api/model/results` - Get model results
- `DELETE /api/model/results?modelId={id}` - Delete model

## Technical Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite
- **Visualization**: Recharts
- **File Processing**: csv-parse

## Data Format

### CSV Requirements
- Must contain numerical columns
- First row should contain column headers
- Missing values are not supported
- Recommended: 2-10 numerical features

### Sample Data Structure
```json
{
  "columns": ["feature1", "feature2", "feature3", "feature4"],
  "data": [
    {"feature1": 2.1, "feature2": 3.2, "feature3": 1.5, "feature4": 4.1},
    ...
  ]
}
```

## Algorithm Details

### K-Means
- Random centroid initialization
- Maximum 100 iterations
- Euclidean distance metric
- Inertia calculation for convergence

### Hierarchical Clustering
- Agglomerative approach
- Single linkage method
- Stops at specified number of clusters

### DBSCAN
- Default epsilon: 0.5
- Default minimum points: 5 or 10% of dataset size
- Noise point detection

## Evaluation Metrics

### Silhouette Score
- Range: -1 to 1
- Higher values indicate better clustering
- Measures cohesion and separation

### Inertia
- Sum of squared distances to centroids
- Lower values indicate tighter clusters
- Used for elbow method analysis

## Performance Considerations

- Recommended dataset size: < 10,000 rows
- All algorithms run in-memory
- Processing time depends on dataset size and algorithm complexity
- For larger datasets, consider sampling or dimensionality reduction

## Error Handling

- Comprehensive error messages for user feedback
- Data validation before processing
- Graceful handling of edge cases
- Training progress indicators

## Future Enhancements

- [ ] Dimensionality reduction (PCA, t-SNE)
- [ ] More clustering algorithms (GMM, Spectral)
- [ ] Real-time collaboration features
- [ ] Export to additional formats (Excel, PDF)
- [ ] Advanced hyperparameter tuning
- [ ] Integration with popular ML libraries