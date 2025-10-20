# 📚 UL Platform - User Guide & Tutorial

## 🎯 **Getting Started**

### **What is UL Platform?**
UL Platform adalah aplikasi web yang memungkinkan Anda untuk melakukan analisis clustering (pengelompokan) data tanpa memerlukan pengetahuan programming yang mendalam. Anda dapat:

- 📊 Mengunggah dataset CSV
- 🤖 Menjalankan algoritma machine learning
- 📈 Melihat hasil visualisasi interaktif
- 💾 Menyimpan dan membandingkan hasil

### **Siapa yang Bisa Menggunakan?**
- **Data Analyst** - Analisis segmentasi customer
- **Researcher** - Penelitian pola data
- **Student** - Pembelajaran machine learning
- **Business Owner** - Insight dari data bisnis

---

## 🚀 **Quick Start Tutorial**

### **Step 1: Mengakses Aplikasi**
1. Buka browser dan akses: `http://localhost:3000`
2. Anda akan melihat halaman utama dengan logo "UL" dan tab navigation

### **Step 2: Upload Dataset**
1. Klik tab **"Dataset"**
2. Anda memiliki 2 opsi:
   
   **Option A: Upload File CSV**
   - Klik area "Upload Dataset" atau drag & drop file CSV
   - File akan divalidasi secara otomatis
   - Pastikan file memiliki kolom numerik
   
   **Option B: Generate Sample Data**
   - Klik tombol **"Generate Sample Data"**
   - Sistem akan membuat dataset contoh dengan 90 data points
   - Dataset ini memiliki 4 fitur numerik dengan 3 cluster natural

3. Setelah berhasil upload, dataset akan muncul di daftar
4. Klik tombol **"Select"** pada dataset yang ingin dianalisis

### **Step 3: Konfigurasi Model**
1. Pindah ke tab **"Model"**
2. Pilih **Clustering Algorithm**:
   - **K-Means**: Untuk cluster yang berbentuk bulat/spherical
   - **Hierarchical**: Untuk cluster dengan struktur hirarki
   - **DBSCAN**: Untuk mendeteksi outlier dan cluster bentuk arbitrary
3. Atur **Number of Clusters** (2-20)
4. Pastikan dataset sudah terpilih (ditampilkan di bagian bawah)
5. Klik tombol **"Train Model"**

### **Step 4: Monitor Training**
1. Progress bar akan menunjukkan kemajuan training
2. Training biasanya selesai dalam beberapa detik
3. Pesan sukses akan muncul saat selesai

### **Step 5: Lihat Hasil**
1. Pindah ke tab **"Results"**
2. Klik pada model result yang ingin dilihat
3. Informasi yang ditampilkan:
   - **Algorithm**: Algoritma yang digunakan
   - **Silhouette Score**: Kualitas clustering (0-1, semakin tinggi semakin baik)
   - **Inertia**: Kompaktitas cluster (semakin rendah semakin baik)
   - **Clusters**: Jumlah cluster yang terbentuk

### **Step 6: Visualisasi**
1. Pindah ke tab **"Visualization"**
2. Lihat scatter plot interaktif dengan:
   - Setiap cluster memiliki warna berbeda
   - Tooltip menunjukkan detail data point
   - Legend menunjukkan jumlah points per cluster

---

## 📊 **Understanding Your Results**

### **Evaluation Metrics Explained**

#### **Silhouette Score**
- **Range**: -1 to 1
- **Interpretation**:
  - **0.7 - 1.0**: Excellent clustering
  - **0.5 - 0.7**: Good clustering  
  - **0.25 - 0.5**: Weak clustering
  - **Below 0.25**: Poor clustering

**What it means**: Mengukur seberapa mirip sebuah data point dengan cluster-nya sendiri dibandingkan dengan cluster lain.

#### **Inertia (Within-Cluster Sum of Squares)**
- **Range**: 0 to infinity
- **Lower is better**
- **What it means**: Mengukur seberapa kompak/rapat cluster yang terbentuk

#### **Number of Clusters**
- **K-Means & Hierarchical**: Sesuai yang Anda tentukan
- **DBSCAN**: Ditentukan otomatis berdasarkan density, plus deteksi noise points

### **Choosing the Right Algorithm**

#### **Use K-Means When:**
- ✅ Anda tahu perkiraan jumlah cluster
- ✅ Cluster berbentuk bulat/spherical
- ✅ Dataset berukuran besar (performa cepat)
- ✅ Semua cluster memiliki ukuran yang relatif sama

**Example Use Cases:**
- Customer segmentation berdasarkan purchase behavior
- Product categorization
- Market segmentation

#### **Use Hierarchical When:**
- ✅ Ingin melihat struktur hirarki dalam data
- ✅ Tidak yakin dengan jumlah cluster optimal
- ✅ Dataset berukuran kecil-medium
- ✅ Ingin dendogram untuk analisis lebih lanjut

**Example Use Cases:**
- Organizational structure analysis
- Species classification
- Social network analysis

#### **Use DBSCAN When:**
- ✅ Tidak tahu jumlah cluster sebelumnya
- ✅ Suspect ada outlier/noise dalam data
- ✅ Cluster memiliki bentuk yang tidak beraturan
- ✅ Cluster memiliki density yang berbeda

**Example Use Cases:**
- Fraud detection
- Anomaly detection
- Geographic data clustering
- Image segmentation

---

## 💡 **Best Practices & Tips**

### **Data Preparation**

#### **CSV Format Requirements:**
```csv
feature1,feature2,feature3,feature4
1.2,3.4,5.6,7.8
2.1,4.3,6.5,8.7
...
```

✅ **Do:**
- Use numeric columns only
- Include column headers in first row
- Ensure no missing values
- Use consistent decimal format
- Keep file size reasonable (<10MB)

❌ **Don't:**
- Mix text and numbers in same column
- Include ID columns or non-meaningful numbers
- Use categorical data without encoding
- Include completely empty rows/columns

#### **Data Preprocessing Tips:**
1. **Remove ID Columns**: Customer_ID, Transaction_ID tidak berguna untuk clustering
2. **Handle Categorical Data**: Convert to numeric (one-hot encoding) jika perlu
3. **Scale Features**: Data dengan range yang sangat berbeda (age: 20-60, salary: 30000-100000) sebaiknya di-normalize
4. **Remove Outliers**: Data yang sangat ekstrim bisa mempengaruhi hasil clustering

### **Choosing Optimal Parameters**

#### **K-Means Optimization:**

**Finding Optimal K (Elbow Method):**
1. Train dengan k=2, 3, 4, 5, 6, ...
2. Plot Inertia vs K
3. Cari "elbow point" dimana penurunan inertia mulai landai

**Example Process:**
```
K=2: Inertia=500
K=3: Inertia=300  ← Big drop
K=4: Inertia=250  ← Smaller drop  
K=5: Inertia=230  ← Even smaller drop
K=6: Inertia=220  ← Marginal improvement
```
**Optimal K likely = 3 or 4**

#### **DBSCAN Parameter Tuning:**

**EPS (Neighborhood Radius):**
- Too small → Many noise points
- Too large → All points in one cluster
- **Tip**: Start with EPS = average distance to 4th nearest neighbor

**MinPts (Minimum Points):**
- Rule of thumb: MinPts ≥ dimensions + 1
- For 2D data: MinPts ≥ 3
- For high-dimensional data: MinPts = 2 × dimensions

### **Interpreting Results**

#### **Good Clustering Signs:**
✅ **High Silhouette Score** (>0.5)
✅ **Clear Separation** in visualization  
✅ **Balanced Cluster Sizes** (tidak ada cluster terlalu kecil/besar)
✅ **Business Logic Makes Sense** (cluster interpretation reasonable)

#### **Poor Clustering Signs:**
❌ **Low Silhouette Score** (<0.25)
❌ **Overlapping Clusters** in visualization
❌ **One Dominant Cluster** (95% points in one cluster)
❌ **Too Many Small Clusters** (many clusters with <5% of data)

### **Troubleshooting Common Issues**

#### **Issue 1: Low Silhouette Score**
**Possible Causes:**
- Wrong number of clusters
- Data doesn't have natural clusters
- Need different algorithm
- Features need scaling/preprocessing

**Solutions:**
- Try different K values
- Try different algorithms
- Check data distribution
- Consider feature engineering

#### **Issue 2: All Points in One Cluster (DBSCAN)**
**Causes:**
- EPS too large
- MinPts too small
- Data is uniformly distributed

**Solutions:**
- Reduce EPS parameter
- Increase MinPts
- Try K-means instead

#### **Issue 3: Too Many Noise Points (DBSCAN)**
**Causes:**
- EPS too small
- MinPts too large
- Data has many outliers

**Solutions:**
- Increase EPS parameter
- Reduce MinPts
- Clean outliers first

#### **Issue 4: Unbalanced Clusters**
**Causes:**
- Natural data distribution
- Wrong algorithm choice
- Outliers affecting centroids

**Solutions:**
- Try DBSCAN for natural grouping
- Remove outliers
- Use different initialization method

---

## 🎨 **Advanced Features**

### **Comparing Multiple Models**
1. Train multiple models with different algorithms/parameters
2. Compare silhouette scores and inertia values
3. Look at visualization differences
4. Choose based on business interpretation

### **Export & Download Results**
1. Go to Results tab
2. Select the model you want to export
3. Click **"Download Results"** button
4. JSON file will contain:
   - Cluster assignments for each data point
   - Centroids/cluster centers
   - Evaluation metrics
   - Algorithm parameters

### **Real-time Monitoring**
- Progress bar shows training status
- Socket.IO provides real-time updates
- Error messages appear immediately
- Success notifications confirm completion

---

## 📈 **Business Use Cases with Examples**

### **1. Customer Segmentation (E-commerce)**

**Scenario**: Online retailer wants to segment customers for targeted marketing

**Data Preparation:**
```csv
customer_id,total_spent,order_frequency,avg_order_value,days_since_last_order
1,1250.50,12,104.21,5
2,89.99,2,44.99,45
3,2890.75,25,115.63,2
...
```

**Process:**
1. Remove customer_id column (not for clustering)
2. Use features: total_spent, order_frequency, avg_order_value, days_since_last_order
3. Try K-means with k=3,4,5
4. Choose k=4 based on business interpretation

**Expected Clusters:**
- **VIP Customers**: High spend, high frequency
- **Regular Customers**: Medium spend, medium frequency  
- **Occasional Customers**: Low spend, low frequency
- **Dormant Customers**: Haven't ordered recently

**Business Actions:**
- VIP: Premium service, exclusive offers
- Regular: Loyalty program, personalized recommendations
- Occasional: Discount campaigns, engagement programs
- Dormant: Win-back campaigns, special promotions

### **2. Product Analysis (Retail)**

**Scenario**: Supermarket wants to understand product relationships for store layout

**Data Preparation:**
```csv
product_name,price,category_id,units_sold,profit_margin,seasonality_score
Bread,2.50,1,1200,0.25,0.1
Milk,3.99,2,800,0.30,0.05  
Sunscreen,12.99,3,150,0.60,0.95
...
```

**Process:**
1. Use K-means clustering on price, units_sold, profit_margin, seasonality_score
2. Try k=5 to identify product categories

**Expected Clusters:**
- **High-volume Low-margin**: Bread, milk (daily essentials)
- **Seasonal High-margin**: Sunscreen, winter coats  
- **Premium Products**: Expensive items with good margins
- **Impulse Buys**: Small, frequent purchases
- **Specialty Items**: Niche products

### **3. Anomaly Detection (Finance)**

**Scenario**: Bank wants to detect unusual transaction patterns

**Data Preparation:**
```csv
transaction_id,amount,time_of_day,day_of_week,merchant_category,location_distance
1,45.67,14.5,2,5411,2.3
2,1250.00,23.8,6,7011,850.2
...
```

**Process:**
1. Use DBSCAN clustering
2. Points marked as "noise" are potential anomalies
3. Set eps and minPts to capture normal behavior patterns

**Anomaly Detection:**
- **Normal Transactions**: Form clear clusters
- **Suspicious Transactions**: Marked as noise by DBSCAN
  - Unusual amounts at odd times
  - Transactions far from usual locations
  - Unusual merchant categories for the customer

### **4. Quality Control (Manufacturing)**

**Scenario**: Factory wants to identify defect patterns in products

**Data Preparation:**
```csv
product_id,dimension_1,dimension_2,weight,temperature,pressure,surface_roughness
1,10.01,5.02,100.5,25.1,101.2,0.05
2,9.85,5.15,99.8,24.8,102.1,0.12
3,12.50,4.20,95.2,28.9,95.5,0.45  // Potential defect
...
```

**Process:**
1. Use DBSCAN to identify normal vs abnormal products
2. Normal products should cluster together
3. Defective products will be noise points or separate clusters

**Quality Insights:**
- **Normal Products**: Tight clustering around specifications
- **Minor Variations**: Small separate clusters (acceptable tolerance)
- **Defects**: Outlier points far from normal clusters
- **Systematic Issues**: New cluster forming (process drift)

---

## 🔧 **Troubleshooting Guide**

### **Common Error Messages**

#### **"No numeric columns found in CSV"**
**Problem**: Your CSV file doesn't contain numeric data
**Solution**: 
- Ensure columns contain numbers, not text
- Remove header rows except column names
- Check for hidden characters or formatting issues

#### **"Training failed"**
**Problem**: Model training encountered an error
**Possible Causes:**
- Dataset too small (need at least 3 points)
- All data points identical
- K larger than number of data points
**Solution**:
- Check dataset quality
- Reduce number of clusters
- Try different algorithm

#### **"Upload failed"**  
**Problem**: File upload was rejected
**Common Causes:**
- File too large (>10MB)
- Wrong file format (not CSV)
- Corrupted file
**Solution**:
- Check file size and format
- Re-export CSV from source application
- Try uploading different file

### **Performance Issues**

#### **Slow Training**
**Causes:**
- Large dataset (>10,000 points)
- High-dimensional data (many columns)
- Complex algorithm (hierarchical clustering)

**Solutions:**
- Use K-means for large datasets
- Reduce dataset size by sampling
- Remove unnecessary columns

#### **Browser Freezing**
**Causes:**
- Very large dataset visualization
- Too many data points in scatter plot
- Memory limitations

**Solutions:**
- Use data sampling for visualization
- Close other browser tabs
- Refresh page and retry

### **Data Quality Issues**

#### **Poor Clustering Results**
**Diagnostic Steps:**
1. Check silhouette score (<0.25 = poor)
2. Examine data distribution
3. Look for outliers in visualization
4. Verify feature selection makes sense

**Improvement Actions:**
1. **Data Preprocessing**:
   - Remove outliers
   - Scale features if ranges very different
   - Select relevant features only

2. **Algorithm Changes**:
   - Try different clustering method
   - Adjust parameters (k, eps, minPts)
   - Use ensemble of multiple results

3. **Feature Engineering**:
   - Create derived features
   - Combine related columns
   - Transform skewed distributions

---

## 📚 **Learning Resources**

### **Understanding Clustering Concepts**

#### **Key Terms:**
- **Centroid**: Center point of a cluster
- **Intra-cluster**: Within the same cluster  
- **Inter-cluster**: Between different clusters
- **Density**: How tightly packed points are
- **Outlier**: Data point that doesn't fit any cluster well

#### **Algorithm Comparison:**

| Algorithm | Speed | Cluster Shape | Handles Noise | Determines K |
|-----------|--------|---------------|---------------|--------------|
| K-Means | Fast | Spherical | No | No |
| Hierarchical | Slow | Any | No | No |  
| DBSCAN | Medium | Any | Yes | Yes |

#### **When to Use Each:**
- **Research/Exploration**: Try all three, compare results
- **Production/Speed**: K-means
- **Outlier Detection**: DBSCAN
- **Hierarchy Analysis**: Hierarchical

### **Next Steps for Advanced Users**

1. **Learn About Feature Engineering**:
   - Principal Component Analysis (PCA)
   - Feature scaling and normalization
   - Handling categorical variables

2. **Explore Other Algorithms**:
   - Gaussian Mixture Models
   - Spectral Clustering  
   - Mini-batch K-means for large datasets

3. **Validation Techniques**:
   - Cross-validation for clustering
   - Stability analysis
   - Domain expert validation

4. **Integration with Business Process**:
   - Automated clustering pipelines
   - Real-time clustering for streaming data
   - Integration with BI tools

---

## 🆘 **Getting Help**

### **Built-in Help Features**
- **Tooltips**: Hover over UI elements for explanations
- **Progress Indicators**: Real-time training status
- **Error Messages**: Descriptive error information
- **Sample Data**: Use "Generate Sample Data" to test features

### **Self-Diagnostic Checklist**
Before asking for help, try:

✅ **Data Checks:**
- [ ] CSV format correct?
- [ ] Only numeric columns?
- [ ] No missing values?
- [ ] Reasonable file size?

✅ **Parameter Checks:**
- [ ] Appropriate number of clusters?
- [ ] Algorithm suitable for your data type?
- [ ] Have you tried different parameter values?

✅ **Browser Checks:**
- [ ] Latest browser version?
- [ ] JavaScript enabled?
- [ ] Sufficient memory available?
- [ ] No browser extensions blocking features?

### **Community & Support**
- **Documentation**: This guide and technical documentation
- **GitHub Issues**: Report bugs or feature requests
- **Sample Datasets**: Use built-in sample generator to learn

---

*User Guide Generated: October 20, 2025*  
*Version: 1.0*  
*For Technical Documentation: See TECHNICAL_GUIDE.md*