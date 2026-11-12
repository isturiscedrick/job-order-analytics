# Dashboard data connection

## Data flow

The browser requests `/api/job-orders` from FastAPI. FastAPI calls the upstream CMIIT endpoint configured by `JOB_ORDERS_API_URL` in `backend/.env`, validates the response, and forwards only the dashboard fields: `req_comp`, `req_current_status`, `req_date`, and `jo_category`. Names, phone numbers, emails, and employee identifiers are not forwarded.

## Upstream response

Endpoint: `https://cmiitdept.com/mmp/api_get_job_master`.

The provided sample is a JSON object containing `status`, `database`, `table`, `total`, and `data` (an array of job orders). The backend validates a successful status and array, and keeps the upstream total as metadata. Dashboard metrics use the records actually returned in `data`. Pagination and date-filter parameters are not confirmed, so none are assumed.

## Error handling

FastAPI returns actionable errors for missing configuration, invalid URL, timeout, connection failure, upstream HTTP error, invalid JSON, unsuccessful API status, malformed data, or missing required fields. The frontend displays the returned message and offers Retry. Configure timeout with `EXTERNAL_API_TIMEOUT_SECONDS`.

## Environment

Copy `backend/.env.example` to `backend/.env`. Set `JOB_ORDERS_API_URL` and optionally `EXTERNAL_API_TIMEOUT_SECONDS`. Never put the upstream URL in a `VITE_` variable; those values are exposed to browsers. The actual .env is ignored by Git.

## Analytics rules

- Company distribution excludes records whose `req_current_status` is exactly Cancelled (case-insensitive).
- Company-by-status comparison excludes cancelled records.
- Company-by-category includes all statuses.
- KPI cards use the full filtered dataset; non-cancelled KPI excludes cancelled records.
- Date filtering uses `req_date`; invalid/missing dates are excluded only for bounded ranges.
- Filters use AND across dimensions and OR within each dimension.
- Filter options derive from the date-scoped records and other active dimensions.
