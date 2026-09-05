import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Radar } from "lucide-react";
import { useMission } from "../hooks/MissionContext";
import { analyzeImage, detectDropout, DropoutResult } from "../services/api";
import RiskBadge from "../components/RiskBadge";

export default function AnomalyIntelligence() {
  const m = useMission();
  const [busy, setBusy] = useState(false);
  const [dropoutBusy, setDropoutBusy] = useState(false);
  const [dropout, setDropout] = useState<DropoutResult | null>(null);

  async function runDropout() {
    if (!m.imageId) return;
    setDropoutBusy(true);
    try {
      const res = await detectDropout(m.imageId);
      setDropout(res);
    } finally {
      setDropoutBusy(false);
    }
  }

  async function runAnalyze() {
    if (!m.imageId) return;
    setBusy(true);
    try {
      const res = await analyzeImage(m.imageId, m.missionId);
      m.setAnomalies(res.anomalies);
    } finally {
      setBusy(false);
    }
  }

  if (!m.imageId || m.objects.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center text-slate-400">
        <AlertCircle className="mx-auto mb-3 text-cyan-glow" size={32} />
        No objects available. Run analysis on <b className="text-cyan-glow">Sonar Analysis</b> first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anomaly Intelligence</h1>
          <p className="text-slate-400 text-sm">Explainable, transparent risk scoring</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runDropout}
            disabled={dropoutBusy}
            className="px-4 py-2 rounded-lg glass border border-amber-400/40 text-amber-300 font-bold hover:bg-amber-400/10 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {dropoutBusy ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />}
            Detect Sonar Dropout
          </button>
          <button
            onClick={runAnalyze}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-cyan-glow text-abyss-950 font-bold hover:shadow-glow disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Compute Anomaly Scores
          </button>
        </div>
      </div>

      {dropout && (
        <div className="glass rounded-xl p-5 border border-amber-400/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold">
                <Radar size={19} className="text-amber-300" /> Sonar Dropout Analysis
              </div>
              <p className="text-xs text-slate-400 mt-1">Local intensity loss and dark-pixel analysis</p>
            </div>
            <span className={`badge ${dropout.dropout_detected ? "badge-demo" : "badge-live"}`}>
              {dropout.dropout_detected ? "POSSIBLE DROPOUT DETECTED" : "NO DROPOUT FLAGGED"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-white/10 bg-abyss-900">
                <img src={dropout.overlay_url} className="w-full max-h-[360px] object-contain" alt="Sonar dropout analysis overlay" />
              </div>
              <div className="text-[11px] text-slate-500 mono">Red boxes = regions flagged as possible signal dropout</div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Candidate Regions" value={String(dropout.candidate_count)} />
                <Metric label="Global Mean" value={dropout.global_mean_intensity.toFixed(1)} />
                <Metric label="Global Std Dev" value={dropout.global_std.toFixed(1)} />
                <Metric label="Dark Threshold" value={dropout.low_intensity_threshold.toFixed(1)} />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Pixel Intensity Distribution</div>
                <div className="h-28 flex items-end gap-1 rounded-lg bg-abyss-900 p-3 border border-white/5">
                  {dropout.histogram.map((v, i) => (
                    <div key={i} className="flex-1 h-full flex items-end" title={`Bin ${i}: ${(v * 100).toFixed(1)}%`}>
                      <div className="w-full bg-amber-300/70 rounded-t-sm" style={{ height: `${Math.max(2, v * 1000)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mono mt-1"><span>0</span><span>128</span><span>255</span></div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Local Variability Map</div>
                <div className="grid gap-0.5 rounded-lg overflow-hidden bg-abyss-900 border border-white/5" style={{ gridTemplateColumns: `repeat(${dropout.grid_cols}, minmax(0, 1fr))` }}>
                  {dropout.grid.flatMap((row, r) => row.map((value, c) => {
                    const max = Math.max(...dropout.grid.flat(), 1);
                    const opacity = Math.min(1, value / max);
                    return <div key={`${r}-${c}`} title={`Std dev: ${value.toFixed(1)}`} className="aspect-square bg-amber-300" style={{ opacity: 0.08 + opacity * 0.92 }} />;
                  }))}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Higher brightness = greater local pixel variability.</div>
              </div>

              {dropout.candidates.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Top Dropout Candidates</div>
                  <div className="space-y-1.5">
                    {dropout.candidates.slice(0, 5).map((c) => (
                      <div key={`${c.row}-${c.col}`} className="flex items-center justify-between text-xs rounded-md bg-abyss-900 border border-white/5 px-3 py-2">
                        <span className="text-slate-300">Region {c.row + 1},{c.col + 1} · dark {Math.round(c.dark_pixel_ratio * 100)}%</span>
                        <span className="text-amber-300 mono">{c.dropout_score.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-500 mono">{dropout.label} · {dropout.method}</div>
        </div>
      )}

      {m.anomalies.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-slate-400">
          Click <b className="text-cyan-glow">Compute Anomaly Scores</b> to generate the prototype risk assessment.
        </div>
      ) : (
        <div className="space-y-5">
          {m.anomalies.map((a) => (
            <div key={a.anomaly_id} className="glass rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-xs mono text-slate-400">{a.anomaly_id} · {a.location} · {a.class_name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="text-3xl font-extrabold text-cyan-glow">{a.anomaly_score}<span className="text-sm text-slate-400">/100</span></div>
                    <RiskBadge risk={a.risk} />
                  </div>
                </div>
                <span className="badge badge-demo">{a.label}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Risk Score Breakdown</div>
                  <BreakdownBar label="Detection Confidence (40%)" value={a.breakdown.confidence_component} max={40} />
                  <BreakdownBar label="Object Area (20%)" value={a.breakdown.area_component} max={20} />
                  <BreakdownBar label="Shadow Evidence (20%)" value={a.breakdown.shadow_component} max={20} />
                  <BreakdownBar label="Boundary/Shape Evidence (20%)" value={a.breakdown.boundary_component} max={20} />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Why Was This Flagged?</div>
                  <div className="space-y-1.5">
                    {a.reasoning.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[11px] text-slate-500 mono">
                Prototype Risk Assessment — hand-authored heuristic formula, not a scientifically validated maritime risk model.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="mono text-cyan-glow">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-abyss-700 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-glow/60 to-cyan-glow rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-abyss-900 border border-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-bold text-amber-300 mono mt-1">{value}</div>
    </div>
  );
}
