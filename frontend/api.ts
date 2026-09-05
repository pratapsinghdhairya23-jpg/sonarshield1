import axios from "axios";

const api = axios.create({ baseURL: "" });

export const API_BASE = "";

export interface SystemStatus {
  status: string;
  mode: string;
  ai_engine: string;
  sonar_processor: string;
}

export interface DemoItem {
  filename: string;
  label: string;
  url: string;
  synthetic: boolean;
  object_count: number;
}

export interface DetectedObject {
  object_id: string;
  x: number; y: number; width: number; height: number;
  confidence: number;
  class_name: string;
  area_px: number;
}

export interface AnomalyResult {
  anomaly_id: string;
  object_id: string;
  class_name: string;
  confidence: number;
  area_px: number;
  location: string;
  lat: number; lng: number;
  status: string;
  anomaly_score: number;
  risk: "HIGH" | "MEDIUM" | "LOW";
  breakdown: { confidence_component: number; area_component: number; shadow_component: number; boundary_component: number };
  raw_indicators: Record<string, number>;
  reasoning: string[];
  label: string;
}



export interface DropoutCandidate {
  row: number; col: number;
  x: number; y: number; width: number; height: number;
  mean_intensity: number;
  neighbor_mean: number;
  dark_pixel_ratio: number;
  relative_drop: number;
  dropout_score: number;
}

export interface DropoutResult {
  image_id: string;
  dropout_detected: boolean;
  candidate_count: number;
  candidates: DropoutCandidate[];
  grid: number[][];
  grid_rows: number;
  grid_cols: number;
  low_intensity_threshold: number;
  global_mean_intensity: number;
  global_std: number;
  histogram: number[];
  overlay_url: string;
  method: string;
  label: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data } = await api.get("/api/system/status");
  return data;
}

export async function getDemoList(): Promise<DemoItem[]> {
  const { data } = await api.get("/api/demo/list");
  return data.items;
}

export async function getDashboardSummary() {
  const { data } = await api.get("/api/dashboard/summary");
  return data;
}

export interface SonarMetadata {
  latitude?: string;
  longitude?: string;
  location_name?: string;
  survey_area?: string;
  depth_m?: string;
  vessel_name?: string;
  acquisition_time?: string;
  metadata_notes?: string;
}

export async function uploadImage(file: File, missionId: string, metadata: SonarMetadata = {}) {
  const form = new FormData();
  form.append("file", file);
  form.append("mission_id", missionId);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== "") form.append(key, value);
  });
  const { data } = await api.post("/api/upload", form);
  return data;
}

export async function uploadDemoImage(filename: string, missionId: string) {
  const form = new FormData();
  form.append("filename", filename);
  form.append("mission_id", missionId);
  const { data } = await api.post("/api/upload/demo", form);
  return data;
}

export async function preprocessImage(imageId: string, params: Partial<{brightness:number;contrast:number;denoise_strength:number;sharpen_amount:number}> = {}) {
  const { data } = await api.post("/api/preprocess", { image_id: imageId, ...params });
  return data;
}

export async function detectImage(imageId: string) {
  const form = new FormData();
  form.append("image_id", imageId);
  const { data } = await api.post("/api/detect", form);
  return data;
}

export async function segmentImage(imageId: string) {
  const form = new FormData();
  form.append("image_id", imageId);
  const { data } = await api.post("/api/segment", form);
  return data;
}

export async function analyzeImage(imageId: string, missionId: string) {
  const form = new FormData();
  form.append("image_id", imageId);
  form.append("mission_id", missionId);
  const { data } = await api.post("/api/analyze", form);
  return data;
}

export async function getMissions() {
  const { data } = await api.get("/api/missions");
  return data.missions;
}

export async function getMission(missionId: string) {
  const { data } = await api.get(`/api/missions/${missionId}`);
  return data;
}

export async function createMission(payload: {name: string; survey_area_km2?: number; sonar_source?: string; operator?: string}) {
  const { data } = await api.post("/api/missions", payload);
  return data;
}

export async function getAnomalies(missionId?: string) {
  const { data } = await api.get("/api/anomalies", { params: missionId ? { mission_id: missionId } : {} });
  return data.anomalies;
}

export async function generateReport(missionId: string) {
  const form = new FormData();
  form.append("mission_id", missionId);
  const { data } = await api.post("/api/report", form);
  return data;
}

export default api;


export async function detectDropout(imageId: string): Promise<DropoutResult> {
  const form = new FormData();
  form.append("image_id", imageId);
  const { data } = await api.post("/api/dropout", form);
  return data;
}
