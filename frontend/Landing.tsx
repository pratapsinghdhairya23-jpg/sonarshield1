import { useNavigate } from "react-router-dom";
import { Waves, ShieldCheck, Radar } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 scan-line pointer-events-none" />
      <div className="relative z-10 text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Waves className="text-cyan-glow" size={44} />
          <Radar className="text-cyan-glow/70" size={36} />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-glow mb-3">SONARSHIELD</h1>
        <p className="mono text-cyan-glow/70 text-sm tracking-[0.25em] mb-6">
          AI-POWERED UNDERWATER DEBRIS &amp; ANOMALY INTELLIGENCE
        </p>
        <p className="text-slate-400 italic mb-10">
          "Transforming raw sonar data into actionable underwater intelligence."
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 rounded-lg bg-cyan-glow text-abyss-950 font-bold tracking-wide hover:shadow-glow transition-shadow"
          >
            ENTER MISSION CONTROL
          </button>
          <button
            onClick={() => navigate("/sonar-analysis")}
            className="px-6 py-3 rounded-lg glass border border-cyan-glow/30 text-cyan-glow font-bold tracking-wide hover:bg-cyan-glow/10 transition-colors"
          >
            LOAD DEMO
          </button>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-4 text-left">
          {[
            { icon: Radar, title: "Sonar AI Pipeline", desc: "Preprocessing, detection & segmentation" },
            { icon: ShieldCheck, title: "Risk Intelligence", desc: "Transparent, explainable scoring" },
            { icon: Waves, title: "Mission Reporting", desc: "Auto-generated PDF inspection reports" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-4">
              <Icon className="text-cyan-glow mb-2" size={20} />
              <div className="font-semibold text-sm">{title}</div>
              <div className="text-xs text-slate-400 mt-1">{desc}</div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-[11px] mono text-slate-600">
          Smart India Hackathon 2026 · Problem Statement SIH26057 · Prototype Build
        </p>
      </div>
    </div>
  );
}
