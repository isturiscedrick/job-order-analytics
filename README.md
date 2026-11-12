# Job Order Analytics

A React + Vite analytics dashboard frontend with a FastAPI backend.

## Project structure

- `backend`: FastAPI application (currently includes a health-check route)
- `frontend`: React 18 + TypeScript + Vite dashboard
- `docs`: setup and data integration notes

## Run locally

Backend:
```bash
cd backend
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Job-order data

The dashboard reads live records from the endpoint configured by `VITE_JOB_ORDERS_ENDPOINT`. No endpoint is configured by default because the current backend only exposes `/health`; it has no job-order API or database schema yet. See [Dashboard data connection](docs/dashboard-data-connection.md) before wiring the real API.

The UI intentionally uses empty states instead of fabricated analytics until a real data source is connected.
