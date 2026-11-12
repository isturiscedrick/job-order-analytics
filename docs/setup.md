# Setup

## Configure backend environment

From the repository root, run in PowerShell:
```powershell
Copy-Item backend/.env.example backend/.env
```
Confirm `backend/.env` has the CMIIT URL in `JOB_ORDERS_API_URL`. Keep this file local; Git ignores it.

## Start backend (PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Check http://localhost:8000/api/health.

## Start frontend in a second terminal
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL shown by Vite (usually http://localhost:5173).

## Troubleshooting
- Missing API configuration: verify `backend/.env` and restart FastAPI.
- Backend unavailable: start the backend before refreshing the dashboard.
- Timeout / connection error: verify internet access and endpoint availability; adjust `EXTERNAL_API_TIMEOUT_SECONDS`.
- Invalid response: verify the upstream service still returns a JSON object with `status: success` and a `data` array.
