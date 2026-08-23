import { useEffect, useState } from "react";
import { api } from "../lib/api";

// api.health() calls /api/health, which nginx (or the Vite dev proxy)
// forwards to the backend's real /health endpoint — same-origin the whole
// way, no CORS involved.
export default function StatusPill() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await api.health();
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    check();
    const id = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const label = online === null ? "CONNECTING" : online ? "LIVE" : "OFFLINE";
  const cls = online === null ? "" : online ? "online" : "offline";

  return (
    <div className={`status-pill ${cls}`}>
      <span className="pulse-dot" />
      {label}
    </div>
  );
}
