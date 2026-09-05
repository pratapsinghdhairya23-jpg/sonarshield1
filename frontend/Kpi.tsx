import { LucideIcon } from "lucide-react";

export default function Kpi({
  label, value, icon: Icon, accent = "cyan",
}: { label: string; value: string | number; icon: LucideIcon; accent?: "cyan" | "red" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-glow",
    red: "text-red-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  };
  return (
    <div className="glass rounded-xl p-4 flex items-center justify-between hover:border-cyan-glow/30 transition-colors">
      <div>
        <div className="text-[11px] mono text-slate-400 tracking-wide uppercase">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${colors[accent]}`}>{value}</div>
      </div>
      <Icon className={`${colors[accent]} opacity-70`} size={28} />
    </div>
  );
}
