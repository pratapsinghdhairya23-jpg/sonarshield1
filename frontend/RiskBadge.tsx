export default function RiskBadge({ risk }: { risk: string }) {
  const cls = risk === "HIGH" ? "badge-high" : risk === "MEDIUM" ? "badge-medium" : "badge-low";
  return <span className={`badge ${cls}`}>{risk}</span>;
}
