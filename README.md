# NETRA: Networked Eyes for Tactical Response and Awareness

NETRA is a production-ready, AI-powered public safety surveillance platform designed for smart cities and local law enforcement. Built with a FastAPI backend, a React.js single-page application, and an independent computer vision microservice utilizing OpenCV and YOLOv8. 

## Features

- **Double-Portal Isolation:** Separates **Citizen Portal** and **Police Dashboard** workflows, authorization layers, and APIs.
- **Privacy Masking:** Allows citizens to draw custom blur polygons over cameras via an interactive HTML5 `<canvas>` tool. Mask zones are dynamically blurred on-the-fly via OpenCV.
- **Consent-Driven Access Control:** Enforces strict Role-Based Access Control (RBAC). Police officers can only view citizen streams if they have an active, citizen-approved access request (with Supervisor/Admin bypass auditing).
- **YOLOv8 Computer Vision Microservice:** Evaluates uploaded and live surveillance streams to detect/track persons, vehicles, faces, license plates, loitering crowds, and abandoned bags.
- **Immutable Cryptographic Audit Ledger:** Computes SHA-256 hashes sequentially chaining every viewing, request, and case modification to ensure ledger integrity.
- **Advanced Security:** Supports Multi-Factor Authentication (MFA) via TOTP, bcrypt password hashing, and token-refresh cycle middleware.

---

## Directory Structure

```
Netr_a/
├── backend/                  # FastAPI Web Server REST API
│   ├── app/
│   │   ├── api/              # Sub-router mapping (auth, reports, cases, notifications...)
│   │   ├── core/             # Settings config, Firebase & Cloudinary setup, security JWTs
│   │   ├── models/           # Pydantic schemas
│   │   └── services/         # Auditing ledger, background notifications, AI client
│   └── Dockerfile
├── ai_services/              # YOLOv8 + OpenCV Microservice
│   ├── app.py                # FastAPI microservice endpoint
│   ├── yolo_detector.py      # Core YOLO model evaluation & analytics heuristics
│   ├── privacy_mask.py       # OpenCV polygon blur masking
│   ├── video_processor.py    # Multi-threaded file downloader, annotator, & uploader
│   └── Dockerfile
├── frontend/                 # React Vite Portal client
│   ├── src/
│   │   ├── components/       # Sidebars, visual masking canvas editors
│   │   ├── context/          # Authentication states & request interceptors
│   │   └── pages/            # Citizen profile, reports & Police command dashboards
│   └── Dockerfile
├── docker-compose.yml        # Orchestration configurations
└── .env.example              # Env config template
```

---

## Local Setup & Execution

### 1. Provisioning Credentials
Create a copy of `.env.example` named `.env` in the root folder:
```bash
cp .env.example .env
```
Update your credentials:
1. **Firebase Admin SDK:** Create a Firebase project, download the service account private key JSON, and paste details into `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
2. **Cloudinary Configuration:** Create a Cloudinary account and copy/paste your Cloud name, API Key, and API Secret.

*Note: If environment keys are left blank, NETRA automatically falls back to an offline mock database JSON ledger and saves media files to local disk storage (`media_storage/`), allowing immediate execution and interface testing.*

### 2. Running with Docker Compose (Recommended)
Launch the entire system container cluster:
```bash
docker-compose up --build
```
- **Frontend Portal:** `http://localhost:5173`
- **FastAPI REST Server:** `http://localhost:8000` (API Docs: `/docs`)
- **AI Processing Microservice:** `http://localhost:8001`

### 3. Manual Native Execution
If you prefer running without Docker:

#### A. Start the AI Microservice
```bash
cd ai_services
pip install -r requirements.txt
python app.py
```

#### B. Start the Web Backend
```bash
cd backend
pip install -r requirements.txt
python app/main.py
```

#### C. Run the Frontend client
```bash
cd frontend
npm install
npm run dev
```

---

## Production Deployment

### 1. Backend REST API on Render
1. Create a new **Web Service** on Render connected to your repository.
2. Select **Docker** as the Runtime environment (Render will automatically locate `backend/Dockerfile` if you specify it as the Docker Build context).
3. Under Environment variables, configure all properties outlined in `.env.example`.

### 2. Frontend React Portal on Vercel
1. Link your repository on Vercel.
2. Set the Build Directory to `frontend`.
3. Select **Vite** as the framework template.
4. Set Environment Variable `VITE_API_URL` to your live Render Web Service URL.
5. Vercel will build the bundle and serve it securely, with router rewrites handled by the built-in `vercel.json` file.
