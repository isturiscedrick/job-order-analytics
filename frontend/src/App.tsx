import { useEffect, useState } from "react";
import { fetchHealth } from "./services/api";

export default function App() {
  const [status, setStatus] = useState("checking...");
  useEffect(() => {
    fetchHealth().then(setStatus).catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main>
      <h1>Job_order_analytics</h1>
      <p>Status: {status}</p>
    </main>
  );
}
