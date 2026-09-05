import { useState } from "react";
import { FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import { useMission } from "../hooks/MissionContext";
import { generateReport } from "../services/api";

export default function Reports() {
  const m = useMission();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ report_url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateReport(m.missionId);
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Report generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-slate-400 text-sm">Generate an automated PDF inspection report for the current mission</p>
      </div>

      <div className="glass rounded-xl p-8 flex flex-col items-center text-center">
        <FileText className="text-cyan-glow mb-4" size={44} />
        <div className="text-lg font-semibold mb-1">SONARSHIELD Underwater Sonar Intelligence Report</div>
        <div className="text-sm text-slate-400 mb-6 max-w-lg">
          Mission ID <span className="text-cyan-glow mono">{m.missionId}</span> — includes survey summary,
          objects detected, anomaly log with reasoning, sonar imagery and segmentation overlays, and high
          priority findings.
        </div>

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="px-6 py-3 rounded-lg bg-cyan-glow text-abyss-950 font-bold hover:shadow-glow disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          GENERATE PDF REPORT
        </button>

        {error && <div className="mt-4 text-red-300 text-sm">{error}</div>}

        {result && (
          <div className="mt-6 glass rounded-lg p-4 flex items-center gap-4">
            <CheckCircle2 className="text-emerald-400" size={22} />
            <div className="text-left">
              <div className="text-sm font-semibold">{result.filename}</div>
              <div className="text-xs text-slate-400">Report generated successfully</div>
            </div>
            <a
              href={result.report_url}
              target="_blank"
              rel="noreferrer"
              className="ml-4 px-4 py-2 rounded-lg glass border border-cyan-glow/30 text-cyan-glow text-sm font-semibold hover:bg-cyan-glow/10 flex items-center gap-2"
            >
              <Download size={15} /> Download
            </a>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4 text-xs text-slate-400 mono leading-relaxed">
        Report includes: Mission Information · Survey Summary · Images Processed · Objects Detected ·
        Anomaly Summary · High Priority Findings · Per-anomaly ID, Location, Confidence, Risk, Area, Reasoning,
        Sonar Image &amp; Segmentation Result. Risk scores and detector modes are labeled per the prototype's
        scientific-honesty disclosures.
      </div>
    </div>
  );
}
