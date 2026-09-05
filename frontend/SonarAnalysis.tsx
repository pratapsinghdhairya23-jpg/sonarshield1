import { useEffect, useRef, useState } from "react";
import { UploadCloud, PlayCircle, Waves, Loader2, Sliders, MapPin, Database } from "lucide-react";
import { useMission } from "../hooks/MissionContext";
import {
  getDemoList, uploadImage, uploadDemoImage, preprocessImage, detectImage, segmentImage,
  DemoItem,
} from "../services/api";

type Tab = "original" | "enhanced" | "detection" | "segmentation" | "overlay";

export default function SonarAnalysis() {
  const m = useMission();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [demoItems, setDemoItems] = useState<DemoItem[]>([]);
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [tab, setTab] = useState<Tab>("original");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1.0);
  const [denoise, setDenoise] = useState(7);
  const [sharpen, setSharpen] = useState(0.6);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [surveyArea, setSurveyArea] = useState("");
  const [depthM, setDepthM] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [acquisitionTime, setAcquisitionTime] = useState("");
  const [metadataNotes, setMetadataNotes] = useState("");

  useEffect(() => {
    getDemoList().then(setDemoItems).catch(() => {});
  }, []);

  async function handleUpload(file: File) {
    setError(null);
    setBusy("Uploading image...");
    try {
      const res = await uploadImage(file, m.missionId, {
        latitude, longitude, location_name: locationName, survey_area: surveyArea,
        depth_m: depthM, vessel_name: vesselName, acquisition_time: acquisitionTime, metadata_notes: metadataNotes,
      });
      applyUploadResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Upload failed. Please check the file format.");
    } finally {
      setBusy(null);
    }
  }

  async function handleLoadDemo(filename: string) {
    setError(null);
    setShowDemoPicker(false);
    setBusy("Loading demo sonar image...");
    try {
      const res = await uploadDemoImage(filename, m.missionId);
      applyUploadResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load demo image.");
    } finally {
      setBusy(null);
    }
  }

  function applyUploadResult(res: any) {
    m.setImageId(res.image_id);
    m.setImageUrl(res.url);
    m.setImageFilename(res.filename);
    m.setResolution(res.resolution);
    m.setProcessedUrl(null);
    m.setOverlayUrl(null);
    m.setMaskUrl(null);
    m.setGroundTruthUrl(null);
    m.setObjects([]);
    m.setAnomalies([]);
    m.setMetrics(null);
    setTab("original");
  }

  async function handleEnhance() {
    if (!m.imageId) return;
    setError(null);
    setBusy("Running sonar preprocessing (CLAHE, denoise, sharpen)...");
    try {
      const res = await preprocessImage(m.imageId, { brightness, contrast, denoise_strength: denoise, sharpen_amount: sharpen });
      m.setProcessedUrl(res.processed_url);
      m.setProcessingTimeMs(res.processing_time_ms);
      setTab("enhanced");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Preprocessing failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRunAnalysis() {
    if (!m.imageId) return;
    setError(null);
    try {
      if (!m.processedUrl) {
        setBusy("Running sonar preprocessing...");
        const pre = await preprocessImage(m.imageId, { brightness, contrast, denoise_strength: denoise, sharpen_amount: sharpen });
        m.setProcessedUrl(pre.processed_url);
        m.setProcessingTimeMs(pre.processing_time_ms);
      }
      setBusy("Running AI object detection...");
      const det = await detectImage(m.imageId);
      m.setObjects(det.objects);
      m.setDetectorMode(det.detector_mode);

      setBusy("Running pixel-level segmentation...");
      const seg = await segmentImage(m.imageId);
      m.setOverlayUrl(seg.overlay_url);
      m.setMaskUrl(seg.mask_url);
      m.setGroundTruthUrl(seg.ground_truth_url);
      m.setSegmentationMode(seg.segmentation_mode);
      m.setMetrics(seg.metrics);
      setTab("overlay");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  const currentImg = () => {
    if (tab === "original") return m.imageUrl;
    if (tab === "enhanced") return m.processedUrl || m.imageUrl;
    if (tab === "detection") return m.overlayUrl || m.processedUrl || m.imageUrl;
    if (tab === "segmentation") return m.maskUrl || m.processedUrl || m.imageUrl;
    if (tab === "overlay") return m.overlayUrl || m.processedUrl || m.imageUrl;
    return m.imageUrl;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sonar Analysis</h1>
          <p className="text-slate-400 text-sm">Upload side-scan sonar imagery and run the AI analysis pipeline</p>
        </div>
        {m.detectorMode && (
          <span className={`badge ${
            m.detectorMode === "YOLO_TRAINED" ? "badge-live"
            : m.detectorMode === "DEMO_ANNOTATED" ? "badge-demo"
            : "badge-demo"
          }`}>
            {m.detectorMode === "YOLO_TRAINED" ? "YOLOv8 TRAINED MODEL"
              : m.detectorMode === "DEMO_ANNOTATED" ? "DEMO ANNOTATED RESULT"
              : "HEURISTIC CV DETECTOR"}
          </span>
        )}
      </div>

      {error && (
        <div className="glass border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {!m.imageId ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
          className="glass rounded-2xl border-2 border-dashed border-cyan-glow/25 p-16 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 scan-line pointer-events-none opacity-40" />
          <UploadCloud className="text-cyan-glow mb-4" size={48} />
          <div className="text-lg font-semibold mb-1">DROP SIDE-SCAN SONAR IMAGE HERE</div>
          <div className="text-xs text-slate-400 mono mb-5">Supported: PNG / JPG / JPEG / TIFF</div>

          <div className="w-full max-w-4xl glass-strong rounded-xl p-5 mb-6 text-left border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <MapPin size={17} className="text-cyan-glow" /> Survey Location &amp; Metadata <span className="text-[10px] text-slate-500 mono">OPTIONAL</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Add GPS coordinates and survey details to connect this sonar image with the Survey Map.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetadataInput label="Latitude" placeholder="e.g. 15.299300" value={latitude} onChange={setLatitude} type="number" step="any" />
              <MetadataInput label="Longitude" placeholder="e.g. 74.124000" value={longitude} onChange={setLongitude} type="number" step="any" />
              <MetadataInput label="Place / Location Name" placeholder="e.g. Survey Sector A" value={locationName} onChange={setLocationName} />
              <MetadataInput label="Survey Area" placeholder="e.g. 2.4 km²" value={surveyArea} onChange={setSurveyArea} />
              <MetadataInput label="Depth (m)" placeholder="e.g. 42.5" value={depthM} onChange={setDepthM} type="number" step="any" />
              <MetadataInput label="Vessel / Platform" placeholder="e.g. INS Surveyor" value={vesselName} onChange={setVesselName} />
              <MetadataInput label="Acquisition Date / Time" placeholder="2026-09-05 10:30" value={acquisitionTime} onChange={setAcquisitionTime} />
              <MetadataInput label="Notes" placeholder="Transect / sector / operator notes" value={metadataNotes} onChange={setMetadataNotes} />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-lg bg-cyan-glow text-abyss-950 font-semibold hover:shadow-glow"
            >
              Upload Image
            </button>
            <button
              onClick={() => setShowDemoPicker(true)}
              className="px-5 py-2.5 rounded-lg glass border border-cyan-glow/30 text-cyan-glow font-semibold hover:bg-cyan-glow/10"
            >
              Load Demo Sonar
            </button>
          </div>
          <input
            ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.tif,.tiff" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-3 glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                <div className="flex gap-1 flex-wrap">
                  {(["original", "enhanced", "detection", "segmentation", "overlay"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors ${
                        tab === t ? "bg-cyan-glow/15 text-cyan-glow" : "text-slate-400 hover:text-cyan-glow"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { m.setImageId(null); m.setImageUrl(null); }}
                  className="text-xs text-slate-400 hover:text-red-400"
                >
                  Clear
                </button>
              </div>
              <div className="p-4 flex items-center justify-center bg-abyss-900 min-h-[420px]">
                {currentImg() ? (
                  <img src={currentImg() as string} className="max-h-[460px] rounded-lg border border-white/10" />
                ) : (
                  <div className="text-slate-500 text-sm">No image for this view yet — run analysis first.</div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs mono text-slate-400">
                <span>{m.imageFilename}</span>
                <span>{m.resolution}{m.processingTimeMs ? ` · processed in ${m.processingTimeMs}ms` : ""}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sliders size={16} className="text-cyan-glow" /> Preprocessing Controls
                </div>
                <Control label="Brightness" value={brightness} min={-50} max={50} step={1} onChange={setBrightness} />
                <Control label="Contrast" value={contrast} min={0.5} max={2} step={0.05} onChange={setContrast} />
                <Control label="Noise Reduction" value={denoise} min={0} max={15} step={1} onChange={setDenoise} />
                <Control label="Sharpening" value={sharpen} min={0} max={1.5} step={0.1} onChange={setSharpen} />
              </div>

              <div className="glass rounded-xl p-4 space-y-2">
                <button
                  onClick={handleEnhance}
                  disabled={!!busy}
                  className="w-full px-4 py-2.5 rounded-lg glass border border-cyan-glow/30 text-cyan-glow font-semibold hover:bg-cyan-glow/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Waves size={16} /> Enhance
                </button>
                <button
                  onClick={handleRunAnalysis}
                  disabled={!!busy}
                  className="w-full px-4 py-2.5 rounded-lg bg-cyan-glow text-abyss-950 font-bold hover:shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PlayCircle size={16} /> Run AI Analysis
                </button>
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-cyan-glow mono pt-1">
                    <Loader2 size={14} className="animate-spin" /> {busy}
                  </div>
                )}
              </div>

              {m.objects.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <div className="text-sm font-semibold mb-2">Objects Found: {m.objects.length}</div>
                  <div className="space-y-1 text-xs mono">
                    {m.objects.map((o) => (
                      <div key={o.object_id} className="flex justify-between text-slate-300">
                        <span>{o.object_id}</span>
                        <span className="text-cyan-glow">{(o.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showDemoPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowDemoPicker(false)}>
          <div className="glass-strong rounded-xl p-5 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Select a Demo Sonar Image</div>
              <span className="badge badge-demo">SYNTHETIC DEMO DATA</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {demoItems.map((d) => (
                <button
                  key={d.filename}
                  onClick={() => handleLoadDemo(d.filename)}
                  className="glass rounded-lg overflow-hidden text-left hover:border-cyan-glow/40 border border-transparent transition-colors"
                >
                  <img src={d.url} className="w-full h-28 object-cover" />
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate">{d.label}</div>
                    <div className="text-[10px] text-slate-400 mono">{d.object_count} object(s)</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetadataInput({ label, placeholder, value, onChange, type = "text", step }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; step?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400 mono">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg bg-abyss-950/70 border border-white/10 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-glow/50"
      />
    </label>
  );
}

function Control({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="mono text-cyan-glow">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </div>
  );
}
