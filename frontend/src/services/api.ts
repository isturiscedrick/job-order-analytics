export async function fetchHealth(): Promise<string> {
  const res = await fetch("/api/health");
  const data = (await res.json()) as { status: string };
  return data.status;
}
