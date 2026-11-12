# Dashboard data connection

## What currently exists

The checked-in FastAPI application only exposes `GET /health`. There is no database configuration, job-order table/model, or job-order API route in this repository yet. The dashboard therefore starts without job-order values and does not insert demo records.

## Frontend configuration

Set `VITE_JOB_ORDERS_ENDPOINT` in the frontend environment (see `frontend/.env.example`) to the actual endpoint that returns job-order records.

The configured endpoint must return a JSON array. Each record should expose the fields named in the dashboard requirements:

- `req_comp`
- `req_current_status`
- `req_date`
- `jo_category`

String and numeric field values are accepted; empty or missing values are safely displayed as "Unspecified". The endpoint path and response shape must be confirmed against the real backend before being added to the application.

## Analytics rules

- Company distribution excludes records whose `req_current_status` is exactly `Cancelled` (case-insensitive).
- Company-by-status comparison uses the same non-cancelled dataset.
- Company-by-category includes all statuses.
- KPI cards use the complete filtered dataset; the non-cancelled KPI excludes cancelled records.
- Date filtering uses `req_date`. Records with missing or invalid dates are omitted only when a bounded date filter is active.
- Company, status, and category selections combine with AND across dimensions and OR within a dimension.
- Available options are derived from the currently date-scoped records and the other active dimensions.

The dashboard does not modify or assume a database schema, and it does not add a backend route.
