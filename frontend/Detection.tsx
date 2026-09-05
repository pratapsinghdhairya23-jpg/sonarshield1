import { useMission } from "../hooks/MissionContext";
import { AlertCircle } from "lucide-react";

export default function Detection() {
  const m = useMission();

  if (!m.imageId || m.objects.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center text-slate-400">
        <AlertCircle className="mx-auto mb-3 text-cyan-glow" size={32} />
        No detection results yet. Go to <b className="text-cyan-glow">Sonar Analysis</b>, load an image, and click
        <b> Run AI Analysis</b>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Detection &amp; Segmentation</h1>
          <p className="text-slate-400 text-sm">Object Detection · {m.imageFilename}</p>
        </div>
        <span className={`badge ${m.detectorMode === "YOLO_TRAINED" ? "badge-live" : "badge-demo"}`}>
          {m.detectorMode === "YOLO_TRAINED" ? "YOLOv8 TRAINED MODEL"
            : m.detectorMode === "DEMO_ANNOTATED" ? "DEMO ANNOTATED"
            : "HEURISTIC CV"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 text-sm font-semibold">Detection + Segmentation Overlay</div>
          <div className="p-4 bg-abyss-900 flex justify-center">
            {m.overlayUrl && <img src={m.overlayUrl} className="max-h-[420px] rounded-lg border border-white/10" />}
          </div>
        </div>

        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold mb-1">Objects Found: {m.objects.length}</div>
          {m.objects.map((o) => (
            <div key={o.object_id} className="glass rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-cyan-glow mono">{o.object_id}</span>
                <span className="text-xs text-slate-400">{o.class_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mono text-slate-300">
                <span>Confidence: <span className="text-cyan-glow">{(o.confidence * 100).toFixed(1)}%</span></span>
                <span>Area: {o.area_px.toLocaleString()} px</span>
                <span>BBox: x{o.x} y{o.y} w{o.width} h{o.height}</span>
                <span>
                  Risk: <span className={o.confidence > 0.85 ? "text-red-400" : o.confidence > 0.65 ? "text-amber-400" : "text-emerald-400"}>
                    {o.confidence > 0.85 ? "HIGH" : o.confidence > 0.65 ? "MEDIUM" : "LOW"}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {m.metrics && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Segmentation Quality (vs. bundled ground-truth mask)</div>
            <span className="badge badge-demo">{m.metrics.label}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["IoU", m.metrics.iou], ["Dice", m.metrics.dice],
              ["Precision", m.metrics.precision], ["Recall", m.metrics.recall],
            ].map(([label, val]) => (
              <div key={label as string} className="text-center glass rounded-lg py-3">
                <div className="text-2xl font-bold text-cyan-glow">{val}</div>
                <div className="text-xs text-slate-400 mono uppercase">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 mono">
            Segmentation mode: {m.segmentationMode} — not a scientifically validated benchmark, computed on the bundled synthetic ground-truth mask.
          </div>
        </div>
      )}
    </div>
  );
}
