import { createContext, useContext, useState, ReactNode } from "react";
import { DetectedObject, AnomalyResult } from "../services/api";

interface PipelineState {
  missionId: string;
  setMissionId: (id: string) => void;

  imageId: string | null;
  setImageId: (id: string | null) => void;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  imageFilename: string | null;
  setImageFilename: (name: string | null) => void;

  processedUrl: string | null;
  setProcessedUrl: (url: string | null) => void;
  overlayUrl: string | null;
  setOverlayUrl: (url: string | null) => void;
  maskUrl: string | null;
  setMaskUrl: (url: string | null) => void;
  groundTruthUrl: string | null;
  setGroundTruthUrl: (url: string | null) => void;

  objects: DetectedObject[];
  setObjects: (o: DetectedObject[]) => void;
  detectorMode: string | null;
  setDetectorMode: (m: string | null) => void;
  segmentationMode: string | null;
  setSegmentationMode: (m: string | null) => void;
  metrics: any;
  setMetrics: (m: any) => void;

  anomalies: AnomalyResult[];
  setAnomalies: (a: AnomalyResult[]) => void;

  resolution: string | null;
  setResolution: (r: string | null) => void;
  processingTimeMs: number | null;
  setProcessingTimeMs: (t: number | null) => void;
}

const MissionCtx = createContext<PipelineState | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [missionId, setMissionId] = useState("SS-2026-014");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [groundTruthUrl, setGroundTruthUrl] = useState<string | null>(null);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [detectorMode, setDetectorMode] = useState<string | null>(null);
  const [segmentationMode, setSegmentationMode] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [resolution, setResolution] = useState<string | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  return (
    <MissionCtx.Provider value={{
      missionId, setMissionId,
      imageId, setImageId, imageUrl, setImageUrl, imageFilename, setImageFilename,
      processedUrl, setProcessedUrl, overlayUrl, setOverlayUrl, maskUrl, setMaskUrl,
      groundTruthUrl, setGroundTruthUrl,
      objects, setObjects, detectorMode, setDetectorMode, segmentationMode, setSegmentationMode,
      metrics, setMetrics, anomalies, setAnomalies,
      resolution, setResolution, processingTimeMs, setProcessingTimeMs,
    }}>
      {children}
    </MissionCtx.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionCtx);
  if (!ctx) throw new Error("useMission must be used within MissionProvider");
  return ctx;
}
