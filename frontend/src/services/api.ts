import type { JobOrderRecord } from "../types/job-order";

export async function fetchHealth(): Promise<string> {
  const response = await fetch("/api/health", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Health check failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("status" in payload) ||
    typeof payload.status !== "string"
  ) {
    throw new Error("The health endpoint returned an unexpected response.");
  }

  return payload.status;
}

function nullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/**
 * Loads real job-order records from the endpoint configured in
 * VITE_JOB_ORDERS_ENDPOINT. The current repository does not yet include
 * this endpoint, so the frontend does not assume a backend route by default.
 */
export async function fetchJobOrders(
  endpoint: string,
  signal?: AbortSignal,
): Promise<JobOrderRecord[]> {
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Job-order request failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(
      "The configured job-order endpoint must return a JSON array of records.",
    );
  }

  const expectedFields = [
    "req_comp",
    "req_current_status",
    "req_date",
    "jo_category",
  ];

  if (payload.length > 0) {
    const firstRecord = payload[0];
    if (
      typeof firstRecord !== "object" ||
      firstRecord === null ||
      !expectedFields.every((field) => field in firstRecord)
    ) {
      throw new Error(
        "The response does not contain the job-order fields required by this dashboard.",
      );
    }
  }

  return payload.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`Job-order record ${index + 1} is not a valid object.`);
    }

    const record = item as Record<string, unknown>;
    return {
      req_comp: nullableString(record.req_comp),
      req_current_status: nullableString(record.req_current_status),
      req_date: nullableString(record.req_date),
      jo_category: nullableString(record.jo_category),
    };
  });
}
