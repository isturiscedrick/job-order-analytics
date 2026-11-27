import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJobOrders } from "../services/api";
import type { JobOrderRecord } from "../types/job-order";

export type SourceState = "loading" | "ready" | "error";

// Loads job orders and owns the request lifecycle. Starting a new load (first
// mount or Retry) aborts the one still in flight, and a response that arrives
// after it was superseded or after unmount is ignored.
export function useJobOrders() {
  const [records, setRecords] = useState<JobOrderRecord[]>([]);
  const [state, setState] = useState<SourceState>("loading");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState("loading");
    setError("");
    fetchJobOrders(current.signal)
      .then((data) => {
        if (current.signal.aborted) return;
        setRecords(data);
        setState("ready");
      })
      .catch((reason: unknown) => {
        if (current.signal.aborted) return;
        setState("error");
        setError(reason instanceof Error ? reason.message : "Unable to load job-order records.");
      });
  }, []);

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  return { records, state, error, reload: load };
}