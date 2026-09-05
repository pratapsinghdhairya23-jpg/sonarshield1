import { useEffect, useState } from "react";
import { getSystemStatus } from "../services/api";

export default function TopBar() {
  const [status, setStatus] = useState<{ status: string; mode: string } | null>(null);

  useEffect(() => {
    getSystemStatus().then(setStatus).catch(() => setStatus({ status: "OFFLINE", mode: "DEMO MODE" }));
  }, []);

  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-cyan-glow/10 px-6 py-3 flex items-center justify-between">
      <div>
        <div className="font-bold tracking-wide text-sm text-glow">SONARSHIELD</div>
        <div className="text-[10px] mono text-slate-400 tracking-widest">AI UNDERWATER INTELLIGENCE PLATFORM</div>
      </div>

      <div className="flex items-center gap-6 mono text-xs">
        <div className="text-slate-400">
          Mission ID: <span className="text-cyan-glow font-semibold">SS-2026-014</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full pulse-dot ${status?.status === "OPERATIONAL" ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className={status?.status === "OPERATIONAL" ? "text-emerald-400" : "text-red-400"}>
            {status?.status || "CONNECTING..."}
          </span>
        </div>
        <span className={`badge ${status?.mode === "AI MODEL MODE" ? "badge-live" : "badge-demo"}`}>
          {status?.mode || "DEMO MODE"}
        </span>
      </div>
    </header>
  );
}
