import type { JobOrderRecord } from "../types/job-order";

export async function fetchHealth(): Promise<string> {
  const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Health check failed (${response.status}).`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("status" in payload) || typeof payload.status !== "string") throw new Error("The health endpoint returned an unexpected response.");
  return payload.status;
}

function nullableString(value: unknown): string | null {
  if (typeof value === "string") { const text = value.trim(); return !text || text.startsWith("0000-00-00") ? null : text; }
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

export async function fetchJobOrders(signal?: AbortSignal): Promise<JobOrderRecord[]> {
  let response: Response;
  try { response = await fetch("/api/job-orders", { headers: { Accept: "application/json" }, signal }); }
  catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Could not reach the analytics backend. Make sure FastAPI is running, then retry.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "detail" in payload && typeof payload.detail === "string" ? payload.detail : `Job-order request failed (${response.status}).`;
    throw new Error(detail);
  }
  if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data)) throw new Error("The backend returned an unexpected response. Expected an object containing a data array.");
  return payload.data.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new Error(`Job-order record ${index + 1} is not a valid object.`);
    const record = item as Record<string, unknown>;
    return { req_comp: nullableString(record.req_comp), req_current_status: nullableString(record.req_current_status), req_date: nullableString(record.req_date), jo_category: nullableString(record.jo_category) };
  });
}
