# Job Order Analytics

React + Vite analytics dashboard backed by FastAPI and the CMIIT job-order API.

## Configure the API

The upstream URL is server-side only. From the repository root, copy the example:

```powershell
Copy-Item backend/.env.example backend/.env
```

Check `backend/.env` contains `JOB_ORDERS_API_URL=https://cmiitdept.com/mmp/api_get_job_master` and `EXTERNAL_API_TIMEOUT_SECONDS=20`. The real `.env` is ignored by Git. Do not place the upstream URL in a `VITE_` variable.

## Run locally (Windows PowerShell)

Backend terminal:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend terminal:
```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually http://localhost:5173). FastAPI runs on http://localhost:8000. See [setup](docs/setup.md) and [data connection](docs/dashboard-data-connection.md).
