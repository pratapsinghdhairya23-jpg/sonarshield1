import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { getMissions, createMission } from "../services/api";
import { useMission } from "../hooks/MissionContext";

export default function MissionHistory() {
  const m = useMission();
  const [missions, setMissions] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", survey_area_km2: 2.4, sonar_source: "Simulated SSS", operator: "" });

  function refresh() {
    getMissions().then(setMissions).catch(() => {});
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate() {
    if (!form.name) return;
    const res = await createMission(form);
    m.setMissionId(res.mission_id);
    setShowNew(false);
    setForm({ name: "", survey_area_km2: 2.4, sonar_source: "Simulated SSS", operator: "" });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mission History</h1>
          <p className="text-slate-400 text-sm">Previous and active survey missions</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-lg bg-cyan-glow text-abyss-950 font-bold hover:shadow-glow flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> New Mission
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {missions.map((mi) => (
          <button
            key={mi.id}
            onClick={() => m.setMissionId(mi.id)}
            className={`glass rounded-xl p-4 text-left hover:border-cyan-glow/40 border transition-colors ${
              m.missionId === mi.id ? "border-cyan-glow/50" : "border-transparent"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="mono font-bold text-cyan-glow">{mi.id}</span>
              <span className={`badge ${mi.status === "ACTIVE" ? "badge-live" : "badge-demo"}`}>{mi.status}</span>
            </div>
            <div className="text-sm font-semibold mb-3">{mi.name}</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="glass rounded-lg py-2">
                <div className="font-bold text-cyan-glow">{mi.images_processed}</div>
                <div className="text-slate-400">Images</div>
              </div>
              <div className="glass rounded-lg py-2">
                <div className="font-bold text-amber-400">{mi.anomalies}</div>
                <div className="text-slate-400">Anomalies</div>
              </div>
              <div className="glass rounded-lg py-2">
                <div className="font-bold text-red-400">{mi.high_priority}</div>
                <div className="text-slate-400">High Pri.</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mono mt-3">
              {new Date(mi.created_at * 1000).toLocaleDateString()} · {mi.sonar_source} · {mi.survey_area_km2} km²
            </div>
          </button>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowNew(false)}>
          <div className="glass-strong rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-lg">New Mission</div>
              <button onClick={() => setShowNew(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <Field label="Mission Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Operator" value={form.operator} onChange={(v) => setForm({ ...form, operator: v })} />
              <Field label="Sonar Source" value={form.sonar_source} onChange={(v) => setForm({ ...form, sonar_source: v })} />
              <Field label="Survey Area (km²)" value={String(form.survey_area_km2)} onChange={(v) => setForm({ ...form, survey_area_km2: parseFloat(v) || 0 })} />
            </div>
            <button
              onClick={handleCreate}
              className="w-full mt-5 px-4 py-2.5 rounded-lg bg-cyan-glow text-abyss-950 font-bold hover:shadow-glow"
            >
              START MISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-abyss-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-glow/50 outline-none"
      />
    </div>
  );
}
