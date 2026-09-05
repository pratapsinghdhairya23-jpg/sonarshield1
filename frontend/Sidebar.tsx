import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Radar, ScanSearch, BrainCircuit, Map as MapIcon,
  History, FileText, Waves,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sonar-analysis", label: "Sonar Analysis", icon: Radar },
  { to: "/detection", label: "AI Detection", icon: ScanSearch },
  { to: "/anomaly-intelligence", label: "Anomaly Intelligence", icon: BrainCircuit },
  { to: "/survey-map", label: "Survey Map", icon: MapIcon },
  { to: "/mission-history", label: "Mission History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 glass-strong border-r border-cyan-glow/10 flex flex-col">
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Waves className="text-cyan-glow" size={26} />
          <div>
            <div className="font-bold text-lg tracking-wide text-glow">SONARSHIELD</div>
            <div className="text-[10px] mono text-cyan-glow/60 tracking-widest">UNDERWATER INTEL</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/30 shadow-glow"
                  : "text-slate-300 hover:bg-white/5 hover:text-cyan-glow border border-transparent"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 mono text-[11px] space-y-2">
        <div className="text-slate-500 tracking-widest mb-2">SYSTEM STATUS</div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          AI ENGINE ONLINE
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          SONAR PROCESSOR READY
        </div>
      </div>
    </aside>
  );
}
