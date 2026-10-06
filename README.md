# FinanceConsulter

FinanceConsulter is a local-first finance tracker that helps you:
- capture transactions (manual Quick Entry and receipt scan),
- categorize spending (automatic suggestions + manual override),
- review dashboards and AI-generated insights.

The project consists of a FastAPI backend with SQLite for persistence and a React (Create React App) frontend.

## Features
- Authentication (JWT)
- Accounts, Transactions, Categories, Tags (CRUD)
- Receipt scanning pipeline (image upload/scan + line items)
- Auto-categorization (best-effort; won’t block transaction creation)
- AI Insights endpoint (optional; depends on an API key)

## Architecture (high level)
- Backend: FastAPI + SQLAlchemy (SQLite)
- Frontend: React + MUI
- DB: SQLite file stored at `db/finance_consulter.db`

Main folders:
- `backend/app`: FastAPI app (routers, repositories, services)
- `financeconsulter`: React frontend
- `db`: SQLite database file + SQL docs

## Quick start (one click)
Prerequisites: Python 3.10+ and Node.js (LTS).

- **Windows:** double-click `start.bat`, or in PowerShell: `.\start.ps1` (`-Full` also installs the ML packages).
- **macOS / Linux:** `./start.sh` (`--full` for the ML packages).

The script creates `.venv`, installs the Python and npm packages, then starts the backend
(http://127.0.0.1:8000) and the frontend (http://localhost:3000, opens in the browser).
Log in or register to get started.

## Step-by-step setup (Windows / PowerShell)

### 1) Prerequisites
- Node.js (LTS)
- Python 3.10+
- Git

### 2) Backend setup & start (Terminal 1)
From the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\backend\requirements.txt        # full (incl. receipt scanning / ML)
# or, API only (much smaller):
# pip install -r .\backend\requirements-core.txt
cd .\backend\app
python -m uvicorn main:app --reload --port 8000
```

Backend URLs:
- API: http://127.0.0.1:8000
- Swagger Docs: http://127.0.0.1:8000/docs

On first start, the backend will auto-create/upgrade the SQLite database and tables.

### 3) Frontend setup & start (Terminal 2)
From the repo root:

```powershell
cd .\financeconsulter
npm install
npm start
```

Frontend URL:
- http://localhost:3000

## First-run flow (important)
- After **Register**, the app shows the **Category setup** (standard categories, optionally AI add-on).
- Once finished, it should **not** appear again on normal login.

## Login
 ### Newst User:
- Email: `e93rzw9erwe9zw@e.ch`
- Password: `TestPassword`

### First test User:
- Email: `admin@test.ch`
- Password: `admin`


### Configuration (`backend/.env`)
- `JWT_SECRET_KEY`: signing key for login tokens. If unset, a random key is generated once and
  stored in the git-ignored file `.jwt_secret` in the repo root.
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default 720)
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`): only needed for AI Insights / AI category onboarding.
- `FINANCE_DB_PATH`: alternative database file.
- Frontend: `REACT_APP_API_URL` (default `http://127.0.0.1:8000`).

### Categorization tuning
Auto-categorization is best-effort and configurable via environment variables:
- `CATEGORY_AUTO_THRESHOLD` (default: 0.5)
- `CATEGORY_AUTO_MIN_THRESHOLD` (default: 0.35)
- `CATEGORY_AUTO_MIN_MARGIN` (default: 0.03)
- `EMBEDDING_MODEL` (optional; sentence-transformers model id)

## Tests
```bash
cd backend && python -m pytest            # backend (offline, uses temporary databases)
cd financeconsulter && CI=true npx react-scripts test --watchAll=false
```

## Troubleshooting

### Database location
- SQLite file: `db/finance_consulter.db`

### Ports already in use
- Backend: change `--port 8000`
- Frontend: CRA will ask to use another port if 3000 is busy

## Tech Stack
- Backend: FastAPI, SQLAlchemy, python-jose
- Frontend: React (CRA), MUI
- Database: SQLite
