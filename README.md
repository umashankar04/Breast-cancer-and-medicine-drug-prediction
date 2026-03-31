# 🏥 Breast Cancer Detection and Medicine/Drug Prediction System

A comprehensive full-stack application for breast cancer detection using machine learning and intelligent medicine/drug recommendation system. This project combines advanced predictive analytics with a user-friendly interface to assist healthcare professionals in diagnosis and treatment planning.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Setup](#database-setup)
- [Research & Data](#research--data)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
- [License](#license)

## 📌 Project Overview

This system implements an intelligent healthcare solution for:
- **Breast Cancer Detection**: Uses machine learning (Random Forest) to predict breast cancer risk based on patient features
- **Medicine & Drug Prediction**: Recommends appropriate medicines and drugs based on patient diagnosis
- **Patient Management**: Secure patient data management with authentication
- **Report Generation**: Automatic CSV export of prediction reports

## ✨ Features

### Backend (FastAPI)
- ✅ RESTful API with JWT authentication
- ✅ Real-time breast cancer prediction using trained ML model
- ✅ Intelligent medicine/drug recommendation engine
- ✅ Patient record management with secure database
- ✅ Automatic CSV report generation and export
- ✅ Comprehensive logging and error handling
- ✅ CORS support for frontend integration
- ✅ SQLAlchemy ORM with MySQL/SQLite support

### Frontend (React + TypeScript)
- ✅ Modern, responsive UI built with React
- ✅ Patient intake form with real-time validation
- ✅ Prediction result display with medicine recommendations
- ✅ Report export functionality
- ✅ TypeScript for type safety
- ✅ Vite for fast development and optimized builds

### Machine Learning
- ✅ Trained Random Forest classifier for breast cancer prediction
- ✅ Pre-trained model (`model.pkl`) included
- ✅ Support for custom model retraining with new data
- ✅ Comprehensive feature engineering

### Data & Medicine Database
- ✅ 30+ medicine/drug catalog in JSON format
- ✅ US medicine and drug datasets (FDA approved)
- ✅ NHANES nutritional data (2005-2014)
- ✅ Taxol drug resistance cell lines data
- ✅ Breast cancer research datasets

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│                  (index.html, src/*)                        │
│         Modern UI for patient reports and predictions       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   FastAPI Backend                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes: /auth, /predictions, /patients             │  │
│  │  Services: ML Model, Medicine Recommendation        │  │
│  │  Database: SQLAlchemy ORM (MySQL/SQLite)            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼──┐  ┌──────▼──────┐ ┌──▼──────────┐
    │MySQL │  │ ML Model    │ │Medicine DB  │
    │      │  │(model.pkl)  │ │(JSON files) │
    │      │  │             │ │             │
    └──────┘  └─────────────┘ └─────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.104+
- **Server**: Uvicorn
- **Database**: MySQL (primary) / SQLite (fallback)
- **ORM**: SQLAlchemy
- **ML**: Scikit-learn, Pandas, NumPy
- **Auth**: Python-Jose (JWT)
- **Environment**: Python-dotenv

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: CSS3
- **Package Manager**: npm/yarn

### ML/Data Processing
- **Model**: Random Forest Classifier
- **Data Format**: CSV, JSON
- **Libraries**: scikit-learn, pandas, numpy

## 📁 Project Structure

```
Breast-cancer-and-medicine-drug-prediction/
│
├── breast_cancer_system/          # Backend API
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt            # Python dependencies
│   ├── model.pkl                  # Trained ML model
│   │
│   ├── database/
│   │   ├── connection.py          # DB connection setup
│   │   ├── models.py              # SQLAlchemy models
│   │   └── schemas.py             # Pydantic schemas
│   │
│   ├── routes/
│   │   ├── auth.py                # Authentication endpoints
│   │   ├── patient.py             # Patient management endpoints
│   │   └── prediction.py          # Prediction endpoints
│   │
│   ├── services/
│   │   ├── ml_model.py            # ML model loading & inference
│   │   └── medicine_recommendation.py  # Drug recommendation logic
│   │
│   ├── utils/
│   │   └── security.py            # JWT & security utilities
│   │
│   └── tests/
│       └── test_api.py            # API tests
│
├── frontend/                       # React TypeScript App
│   ├── src/
│   │   ├── App.tsx                # Main component
│   │   ├── api.ts                 # API client
│   │   ├── main.tsx               # Entry point
│   │   ├── reportTools.ts         # Report utilities
│   │   └── styles.css             # Styling
│   │
│   ├── package.json               # Dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── vite.config.ts             # Vite configuration
│   └── index.html                 # HTML template
│
├── medicines & drugs/             # Medicine & Drug Datasets
│   ├── medicine_catalog.json      # Main medicine database
│   ├── DS_BreastCancer.csv        # Breast cancer medication data
│   ├── taxol drug resistance cell lines in breast cancer/
│   │   └── Dataset.csv            # Taxol resistance research data
│   └── us medicine/               # FDA approved medicines
│       ├── Drugs_*.csv            # Drug package & product data
│       ├── Nhanes_*.csv           # Nutritional health data (2005-2014)
│       └── Star_rating_*.csv      # Healthcare plan ratings
│
├── images/                        # Architecture & Flow Diagrams
│   ├── system-architecture/       # System design diagram
│   ├── functional-workflow/       # Functional flow diagram
│   ├── er-diagram-db/            # Database ER diagram
│   └── workflow/                  # Project workflow diagram
│
├── logs/                          # Application logs
│   └── report_exports/            # Generated CSV reports
│
├── data.csv                       # Training dataset (optional)
├── BreastCancerDetectionandPrevention_Research_Reproduction.ipynb  # Research notebook
├── .env                           # Environment configuration
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

## 📋 Prerequisites

- **Python** 3.9+
- **Node.js** 16+ (for frontend development)
- **MySQL** 8.0+ (optional, SQLite fallback available)
- **Git**

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/umashankar04/Breast-cancer-and-medicine-drug-prediction.git
cd Breast-cancer-and-medicine-drug-prediction
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.\.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
cd breast_cancer_system
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Or using yarn
yarn install
```

## ⚙️ Configuration

### Backend Configuration (.env)

Create a `.env` file in the `breast_cancer_system` directory:

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/breast_cancer_db

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Medicine Data Directory
MEDICINE_DATA_DIR=../medicines & drugs

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
LOG_MAX_MB=5
LOG_BACKUP_COUNT=3
```

### Frontend Configuration (.env)

Create `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000
```

## 🗄️ Database Setup

### MySQL Setup

```sql
-- Create database
CREATE DATABASE breast_cancer_db;
USE breast_cancer_db;

-- Tables are auto-created by SQLAlchemy on first run
```

### SQLite Setup (Default/Fallback)

SQLite database is automatically created at `breast_cancer_system/breast_cancer_local.db` if MySQL is unavailable.

## ▶️ Running the Application

### Start Backend API

```bash
cd breast_cancer_system
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs` (Swagger UI)

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### Build Frontend for Production

```bash
cd frontend
npm run build
```

## 📡 API Documentation

### Authentication Endpoints

**POST /auth/register**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}
```

**POST /auth/login**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

### Prediction Endpoints

**POST /submit-report**
- Validates patient features
- Runs ML prediction
- Returns medicine recommendations
- Stores report in database
- Exports CSV report

Request body includes patient features (age, tumor size, hormone receptors, etc.)

**GET /patients/{patient_id}**
- Retrieve patient information

**GET /reports/{report_id}**
- Retrieve prediction report

## 🔬 Research & Data

The project includes comprehensive datasets for research:

- **Breast Cancer Data**: Features from diagnostic imaging and patient records
- **Medicine Catalog**: 30+ medications with dosage recommendations
- **US Medicine Data**: FDA-approved drugs and healthcare information
- **NHANES Data**: Nutritional and health data from US population
- **Taxol Research**: Drug resistance patterns in breast cancer cells

## 💡 Usage Examples

### Making a Prediction

1. Navigate to the frontend application
2. Fill in patient feature form
3. Submit for analysis
4. View prediction results and medicine recommendations
5. Export report as CSV

### API Example with cURL

```bash
curl -X POST "http://localhost:8000/submit-report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Jane Smith",
    "age": 45,
    "tumor_size": 2.5,
    "hormone_receptors": "positive",
    "additional_features": [...]
  }'
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: umashankar04

## 🙏 Acknowledgments

- Breast cancer datasets from medical research institutions
- Open-source libraries: FastAPI, React, SQLAlchemy, scikit-learn
- Healthcare and medical data from public sources (NHANES, FDA)

---

**Last Updated**: March 31, 2026
**Status**: Active Development