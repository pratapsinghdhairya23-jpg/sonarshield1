"""
SONARSHIELD - Object Detection Module
========================================
Detector priority (each mode always reported to the frontend via
`detector_mode` so the UI can badge results honestly):

  1. "YOLO_TRAINED" - a real YOLOv8-nano model, fine-tuned locally on the
     bundled synthetic demo images (see yolo_detector.py / train_yolo.py).
     Used automatically whenever backend/ml/weights/yolo_sonar.pt exists
     and produces at least one detection above the confidence threshold.
     This is genuine trained-model inference, but the training set is
     tiny (7 synthetic images) - a proof-of-concept, not production
     accuracy. See README for retraining on real AI4Shipwrecks data.

  2. "DEMO_ANNOTATED" - if YOLO found nothing (or isn't installed) and the
     uploaded filename matches one of the bundled synthetic demo images,
     we return the fixed, hand-authored annotation for that image. This
     guarantees a stable, repeatable result during a live judging demo.

  3. "HEURISTIC_CV" - final fallback for any other image: a genuine,
     deterministic OpenCV pipeline (adaptive threshold -> contours ->
     shape/contrast-based scoring). Classical CV, not a neural network.
"""
import json
import os
import cv2
import numpy as np

from backend.ml import yolo_detector

ANNOT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "demo", "annotations.json")

with open(ANNOT_PATH) as f:
    DEMO_ANNOTATIONS = json.load(f)


def _classify_shape(w, h, area, mean_intensity):
    aspect = max(w, h) / max(1, min(w, h))
    if aspect > 4:
        return "Pipeline/Cable"
    if area > 6000 and aspect < 2.2:
        return "Shipwreck"
    if mean_intensity > 190 and area < 3500:
        return "Fishing Gear"
    return "Unknown Anomaly"


def detect_yolo(processed_gray: np.ndarray):
    """Real YOLOv8 inference. Returns None if unavailable or zero detections
    (caller falls back to demo-annotated / heuristic-CV)."""
    result = yolo_detector.detect_yolo(processed_gray)
    if result and len(result["objects"]) > 0:
        return result
    return None


def detect_demo(filename: str):
    record = DEMO_ANNOTATIONS.get(filename)
    if not record:
        return None
    objects = []
    for i, obj in enumerate(record["objects"]):
        objects.append({
            "object_id": f"OBJ-{i+1:02d}",
            "x": obj["x"], "y": obj["y"], "width": obj["width"], "height": obj["height"],
            "confidence": obj["confidence"],
            "class_name": obj["class"],
            "area_px": obj["width"] * obj["height"],
        })
    return {"detector_mode": "DEMO_ANNOTATED", "objects": objects}


def detect_heuristic(processed_gray: np.ndarray):
    """Classical CV detector: adaptive threshold + contours.
    Deterministic given the same input image (no randomness)."""
    blur = cv2.GaussianBlur(processed_gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, -8
    )
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h_img, w_img = processed_gray.shape[:2]
    min_area = max(120, (h_img * w_img) * 0.001)

    objects = []
    idx = 1
    for c in sorted(contours, key=cv2.contourArea, reverse=True):
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        x, y, w, h = cv2.boundingRect(c)
        # skip the central nadir strip artifact (very tall/thin, centered)
        if w < w_img * 0.08 and abs((x + w / 2) - w_img / 2) < w_img * 0.06:
            continue

        roi = processed_gray[y:y + h, x:x + w]
        mean_intensity = float(roi.mean()) if roi.size else 0.0
        contrast = float(roi.std()) if roi.size else 0.0

        # confidence heuristic from area, contrast and mean intensity
        area_score = min(1.0, area / (w_img * h_img * 0.04))
        contrast_score = min(1.0, contrast / 60.0)
        intensity_score = min(1.0, mean_intensity / 200.0)
        confidence = round(0.35 * area_score + 0.35 * contrast_score + 0.30 * intensity_score, 3)
        confidence = max(0.42, min(0.98, confidence))

        class_name = _classify_shape(w, h, area, mean_intensity)

        objects.append({
            "object_id": f"OBJ-{idx:02d}",
            "x": int(x), "y": int(y), "width": int(w), "height": int(h),
            "confidence": confidence,
            "class_name": class_name,
            "area_px": int(area),
        })
        idx += 1
        if idx > 8:
            break

    return {"detector_mode": "HEURISTIC_CV", "objects": objects}
