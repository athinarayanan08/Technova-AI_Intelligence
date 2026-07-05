# 🚀 TechNova AI Platform — Organizational Intelligence System 🧠

Welcome to **TechNova AI Platform**, a state-of-the-art AI-powered Organizational Intelligence System designed to ingest, process, index, and search through enterprise documents and data using modern LLM agents, semantic search, and robust backend infrastructure. 

---

## ⚡ Key Features

- 🧠 **AI & LLM Integration**: Powered by **LangChain**, **Groq**, and **OpenAI** to analyze organizational data, generate insights, and automate intelligence workflows.
- 🔍 **Hybrid Vector & Semantic Search**: Advanced document retrieval using **Elasticsearch** (via `langchain-elasticsearch`) for rapid, high-precision semantic search.
- 📂 **Multi-Format Document Ingestion**: Ingest and extract text/metadata from **PDFs, Word Documents (`.docx`), Excel Sheets (`.xlsx`), and PowerPoint Slides (`.pptx`)**.
- ⚡ **Distributed Caching & Session Management**: Built-in caching powered by **Redis** for ultra-fast response times.
- 🐳 **Docker-Compose Ready**: Multi-container setup for **PostgreSQL 17**, **Redis 7**, **Elasticsearch 8**, **MinIO Object Storage**, and **pgAdmin**.
- 🎨 **Modern SPA Frontend**: Interactive, responsive user interface built using **React (Vite, TypeScript, Tailwind CSS)**.
- ☕ **Asynchronous FastAPI Backend**: Asynchronous backend with route-level rate limiting, background tasks (`APScheduler`), and robust token-based JWT authentication.

---

## 🏗️ Architecture Overview

The platform uses a decoupled client-server architecture with a suite of enterprise databases and search engines running containerized in Docker:

```mermaid
graph TD
    Client[🎨 React Vite Frontend]
    FastAPI[☕ FastAPI Backend]
    
    %% Databases & Services %%
    Postgres[(🐘 PostgreSQL - App Data)]
    Redis[(⚡ Redis - Cache & Rate Limits)]
    ES[(🔍 Elasticsearch - Vector/Text Search)]
    MinIO[(🪣 MinIO - Document S3 Storage)]
    
    %% Connections %%
    Client <=>|JSON API / JWT| FastAPI
    FastAPI <=>|asyncpg / SQLAlchemy| Postgres
    FastAPI <=>|redis-py| Redis
    FastAPI <=>|Elastic API| ES
    FastAPI <=>|MinIO SDK| MinIO
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, PostCSS, Axios |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2 |
| **AI / NLP** | LangChain, LangChain-Groq, LangChain-Elasticsearch, OpenAI SDK |
| **Data Storage** | PostgreSQL 17 (Alpine), Sqlite (Dev / Testing) |
| **Search Engine** | Elasticsearch 8.15.0 |
| **Caching / Sessions** | Redis 7 (Alpine) |
| **Object Storage** | MinIO (S3-compatible API & Web Console) |
| **Database GUI** | pgAdmin 4 |

---

## 📂 Project Structure

```text
AI_Organization/
├── 📁 backend/                # FastAPI Application
│   ├── 📁 app/                # Application modules (routers, services, models)
│   ├── main.py                # Server entrypoint
│   ├── requirements.txt       # Python package dependencies
│   └── .env                   # Backend environment variables
├── 📁 frontend/               # React Vite Application
│   ├── 📁 src/                # Components, Pages, Hooks, Contexts
│   ├── package.json           # Frontend package dependencies
│   ├── tailwind.config.js     # Styling configuration
│   └── .env                   # Frontend environment variables
├── docker-compose.yml         # Dev databases & services setup
├── start_platform.ps1         # PowerShell quick-start orchestrator
└── README.md                  # Project documentation (this file)
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Before running the platform, ensure you have the following installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Python 3.10+](https://www.python.org/downloads/)
* PowerShell (standard on Windows)

---

### 🏎️ Method 1: The Quick Start Script (Windows)

We have provided a unified PowerShell script to spin up the entire ecosystem with a single command. Open **PowerShell** in the project root directory and run:

```powershell
.\start_platform.ps1
```

This script will automatically:
1. Spin up **PostgreSQL**, **Redis**, **Elasticsearch**, and **MinIO** in Docker (if not already running).
2. Start the **FastAPI Backend** in a new window (at `http://localhost:8000`).
3. Start the **React Frontend** in a new window (at `http://localhost:5173`).

---

### 🛠️ Method 2: Manual Setup

If you prefer to start components individually, follow these steps:

#### 1. Spin up Core Infrastructure (Docker)
In the root directory, run:
```bash
docker-compose up -d
```
This spins up PostgreSQL, Redis, Elasticsearch, MinIO, and pgAdmin in the background.

#### 2. Start the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy/configure environment variables in `.env` and start the server:
   ```bash
   python main.py
   ```
   *The backend API will run at `http://localhost:8000` with Swagger Docs at `http://localhost:8000/docs`.*

#### 3. Start the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will run at `http://localhost:5173`.*

---

## 🔒 Credentials & Port Bindings

Below is the list of ports and login credentials for local database management:

| Service | Port | Endpoint / Console | Username / Email | Password |
| :--- | :---: | :--- | :--- | :--- |
| **FastAPI Backend** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | - | - |
| **React Frontend** | `5173` | [http://localhost:5173](http://localhost:5173) | - | - |
| **PostgreSQL** | `5432` | `localhost:5432` | `aiorg` | `aiorg_secret` |
| **pgAdmin 4** | `5050` | [http://localhost:5050](http://localhost:5050) | `admin@technova.com` | `admin123` |
| **MinIO Console** | `9001` | [http://localhost:9001](http://localhost:9001) | `minioadmin` | `minio_secret` |
| **MinIO API** | `9000` | `localhost:9000` | `minioadmin` | `minio_secret` |
| **Elasticsearch** | `9200` | [http://localhost:9200](http://localhost:9200) | - | - |
| **Redis** | `6379` | `localhost:6379` | - | `redis_secret` |

---

## 📝 License
This project is proprietary and confidential. All rights reserved. 🚀
