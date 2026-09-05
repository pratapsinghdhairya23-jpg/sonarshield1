import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { ImageIcon, Target, AlertTriangle, ShieldAlert, Gauge, MapPin } from "lucide-react";
import Kpi from "../components/Kpi";
import RiskBadge from "../components/RiskBadge";
import { getDashboardSummary } from "../services/api";

const COLORS = { HIGH: "#f87171", MEDIUM: "#facc15", LOW: "#4ade80" };

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  const severity = summary?.severity_distribution || { HIGH: 4, MEDIUM: 1, LOW: 1 };
  const pieData = [
    { name: "HIGH", value: severity.HIGH },
    { name: "MEDIUM", value: severity.MEDIUM },
    { name: "LOW", value: severity.LOW },
  ];

  const categoryData = [
    { category: "Shipwreck", count: 6 },
    { category: "Fishing Gear", count: 5 },
    { category: "Pipeline/Cable", count: 3 },
    { category: "Unknown", count: 3 },
  ];

  const confidenceBuckets = [
    { bucket: "60-70%", count: 2 },
    { bucket: "70-80%", count: 3 },
    { bucket: "80-90%", count: 5 },
    { bucket: "90-100%", count: 7 },
  ];

  const activity = [
    { day: "Mon", processed: 32 }, { day: "Tue", processed: 41 }, { day: "Wed", processed: 55 },
    { day: "Thu", processed: 38 }, { day: "Fri", processed: 60 }, { day: "Sat", processed: 44 },
    { day: "Sun", processed: 16 },
  ];

  const recent = summary?.recent_anomalies?.length ? summary.recent_anomalies : [
    { id: "AN-001", location: "Zone A3", type: "Potential Wreck", confidence: 94.7, risk: "HIGH", status: "Requires Inspection" },
    { id: "AN-002", location: "Zone B1", type: "Potential Debris", confidence: 88.2, risk: "MEDIUM", status: "Review" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mission Dashboard</h1>
        <p className="text-slate-400 text-sm">Live operational overview · SS-2026-014</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi label="Images Processed" value={summary?.images_processed ?? 286} icon={ImageIcon} />
        <Kpi label="Objects Detected" value={summary?.objects_detected ?? 17} icon={Target} />
        <Kpi label="Potential Anomalies" value={summary?.potential_anomalies ?? 6} icon={AlertTriangle} accent="amber" />
        <Kpi label="High Priority" value={summary?.high_priority ?? 4} icon={ShieldAlert} accent="red" />
        <Kpi label="Avg Confidence" value={`${summary?.average_confidence ?? 91.4}%`} icon={Gauge} accent="emerald" />
        <Kpi label="Survey Area" value={`${summary?.survey_area_km2 ?? 2.4} km²`} icon={MapPin} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass rounded-xl p-4">
          <div className="text-sm font-semibold mb-3">Detections by Confidence</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={confidenceBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c3450" />
              <XAxis dataKey="bucket" stroke="#7d93a6" fontSize={11} />
              <YAxis stroke="#7d93a6" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0f1c2e", border: "1px solid #1c3450" }} />
              <Bar dataKey="count" fill="#22e5e0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-sm font-semibold mb-3">Detections by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c3450" />
              <XAxis type="number" stroke="#7d93a6" fontSize={11} />
              <YAxis type="category" dataKey="category" stroke="#7d93a6" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: "#0f1c2e", border: "1px solid #1c3450" }} />
              <Bar dataKey="count" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-sm font-semibold mb-3">Anomaly Severity Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pieData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "#0f1c2e", border: "1px solid #1c3450" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-sm font-semibold mb-3">Processing Activity (7-day)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c3450" />
              <XAxis dataKey="day" stroke="#7d93a6" fontSize={11} />
              <YAxis stroke="#7d93a6" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0f1c2e", border: "1px solid #1c3450" }} />
              <Line type="monotone" dataKey="processed" stroke="#22e5e0" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="text-sm font-semibold mb-3">Recent Anomalies</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10 mono text-xs">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r: any) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-4 mono text-cyan-glow">{r.id}</td>
                  <td className="py-2 pr-4">{r.location}</td>
                  <td className="py-2 pr-4">{r.type}</td>
                  <td className="py-2 pr-4">{r.confidence ? `${r.confidence}%` : "—"}</td>
                  <td className="py-2 pr-4"><RiskBadge risk={r.risk} /></td>
                  <td className="py-2 pr-4 text-slate-300">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
