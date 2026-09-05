import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import { getAnomalies } from "../services/api";
import RiskBadge from "../components/RiskBadge";

const RISK_COLOR: Record<string, string> = { HIGH: "#f87171", MEDIUM: "#facc15", LOW: "#4ade80" };
const BASE_CENTER: [number, number] = [15.2993, 74.1240];

function MapRecenter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points as any, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

export default function SurveyMap() {
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    getAnomalies().then(setAnomalies).catch(() => {});
  }, []);

  const points: [number, number][] = anomalies.length
    ? anomalies.map((a) => [a.lat, a.lng])
    : [];

  const surveyPath: [number, number][] = [
    [15.31, 74.10], [15.305, 74.115], [15.30, 74.125], [15.295, 74.135], [15.29, 74.145],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Survey Map</h1>
          <p className="text-slate-400 text-sm">Simulated underwater survey area &amp; anomaly locations</p>
        </div>
        <span className={`badge ${anomalies.some((a) => a.gps_source === "USER_PROVIDED") ? "badge-live" : "badge-demo"}`}>
          {anomalies.some((a) => a.gps_source === "USER_PROVIDED") ? "GPS METADATA CONNECTED" : "SIMULATED SURVEY DATA"}
        </span>
      </div>

      <div className="glass rounded-xl overflow-hidden" style={{ height: 520 }}>
        <MapContainer center={BASE_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
          <MapRecenter points={points} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Polyline positions={surveyPath} pathOptions={{ color: "#22e5e0", dashArray: "6 6", weight: 2 }} />
          {points.map((p, i) => {
            const a = anomalies[i];
            return (
              <CircleMarker
                key={a.id}
                center={p}
                radius={9}
                pathOptions={{ color: RISK_COLOR[a.risk], fillColor: RISK_COLOR[a.risk], fillOpacity: 0.7 }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold mb-1">{a.id}</div>
                    <div>Location: {a.location}</div>
                    {a.location_name && <div>Place: {a.location_name}</div>}
                    <div>Coordinates: {Number(a.lat).toFixed(6)}, {Number(a.lng).toFixed(6)}</div>
                    {a.depth_m != null && <div>Depth: {a.depth_m} m</div>}
                    {a.survey_area && <div>Survey Area: {a.survey_area}</div>}
                    {a.vessel_name && <div>Vessel: {a.vessel_name}</div>}
                    <div>GPS Source: {a.gps_source === "USER_PROVIDED" ? "Uploaded metadata" : "Prototype simulated"}</div>
                    <div>Risk: {a.risk}</div>
                    <div>Score: {a.score}/100</div>
                    <div>Status: {a.status}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["HIGH", "MEDIUM", "LOW"].map((r) => (
          <div key={r} className="glass rounded-xl p-4 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: RISK_COLOR[r] }} />
            <div>
              <div className="text-xs text-slate-400 mono">{r} RISK</div>
              <div className="text-lg font-bold">{anomalies.filter((a) => a.risk === r).length}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4">
        <div className="text-sm font-semibold mb-1">Detected Anomalies</div>
        <div className="text-xs text-slate-500 mb-3">Uploaded latitude/longitude are connected to the anomaly record and plotted here. If GPS was omitted, prototype coordinates are used for the demo.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10 mono text-xs">
                <th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Location / GPS</th>
                <th className="py-2 pr-4">Risk</th><th className="py-2 pr-4">Score</th><th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-4 mono text-cyan-glow">{a.id}</td>
                  <td className="py-2 pr-4">
                    <div>{a.location_name || a.location}</div>
                    <div className="text-[10px] text-slate-500 mono">{Number(a.lat).toFixed(6)}, {Number(a.lng).toFixed(6)}</div>
                  </td>
                  <td className="py-2 pr-4"><RiskBadge risk={a.risk} /></td>
                  <td className="py-2 pr-4 mono">{a.score}</td>
                  <td className="py-2 pr-4 text-slate-300">{a.status}</td>
                </tr>
              ))}
              {anomalies.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">No anomalies yet — run an analysis first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
