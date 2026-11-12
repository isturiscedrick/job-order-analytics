from typing import Any
import httpx
from fastapi import APIRouter, HTTPException
from app.config import settings

router = APIRouter(prefix="/api", tags=["job orders"])
FIELDS = ("req_comp", "req_current_status", "req_date", "jo_category")

def clean(value: Any) -> str | None:
    if value is None or isinstance(value, bool): return None if value is None else str(value)
    if isinstance(value, (str, int, float)):
        value = str(value).strip()
        return None if not value or value.startswith("0000-00-00") else value
    return None

@router.get("/job-orders")
async def get_job_orders() -> dict[str, Any]:
    endpoint = settings.job_orders_api_url.strip()
    if not endpoint:
        raise HTTPException(503, "Job-order API URL is not configured. Set JOB_ORDERS_API_URL in backend/.env and restart FastAPI.")
    if not endpoint.startswith(("https://", "http://")):
        raise HTTPException(500, "JOB_ORDERS_API_URL must be an HTTP or HTTPS URL.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.external_api_timeout_seconds), follow_redirects=True) as client:
            response = await client.get(endpoint, headers={"Accept": "application/json"})
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "The CMIIT API timed out. Retry or increase EXTERNAL_API_TIMEOUT_SECONDS.") from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(502, f"The CMIIT API returned HTTP {exc.response.status_code}.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, "Could not connect to the CMIIT API. Check the endpoint and network connection.") from exc
    try: payload = response.json()
    except ValueError as exc: raise HTTPException(502, "The CMIIT API did not return valid JSON.") from exc
    if not isinstance(payload, dict): raise HTTPException(502, "Unexpected CMIIT response: expected a JSON object.")
    if str(payload.get("status", "")).strip().lower() != "success": raise HTTPException(502, "The CMIIT API did not report a successful status.")
    records = payload.get("data")
    if not isinstance(records, list): raise HTTPException(502, "Unexpected CMIIT response: data must be an array.")
    safe_records = []
    for index, record in enumerate(records):
        if not isinstance(record, dict): raise HTTPException(502, f"Invalid job-order record at data index {index}: expected an object.")
        missing = [field for field in FIELDS if field not in record]
        if missing: raise HTTPException(502, f"Invalid job-order record at data index {index}: missing {', '.join(missing)}.")
        safe_records.append({field: clean(record.get(field)) for field in FIELDS})
    total = payload.get("total")
    if not isinstance(total, int) or isinstance(total, bool) or total < 0: total = len(safe_records)
    return {"data": safe_records, "total": total, "returned_count": len(safe_records)}
