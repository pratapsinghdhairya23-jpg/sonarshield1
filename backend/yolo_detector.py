"""
SONARSHIELD - YOLO Detector Wrapper
=======================================
Wraps a real, locally fine-tuned YOLOv8 model (ultralytics) for sonar
anomaly detection.

SCIENTIFIC HONESTY:
The bundled `weights/yolo_sonar.pt` (if present) was fine-tuned from a
COCO-pretrained YOLOv8-nano on the 7 SYNTHETIC demo sonar images shipped
in data/demo/ (5 train / 2 held-out validation, see
backend/ml/build_yolo_dataset.py and backend/ml/train_yolo.py). Training
metrics for that run are saved in backend/ml/yolo_runs/sonar_anomaly/.
This is real, working YOLO inference — but it is a proof-of-concept
trained on a handful of synthetic images, not a production model trained
on labeled real sonar data. Confidence scores and generalization to truly
novel imagery should be read with that in mind. See README §4/§12 for how
to retrain on real AI4Shipwrecks/SubPipe annotations for production use.
"""
import os
import numpy as np

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "yolo_sonar.pt")
CLASS_NAMES = ["sonar_anomaly"]

_yolo_cache = {"model": None, "loaded": False, "available": False}


def _try_load():
    if _yolo_cache["loaded"]:
        return _yolo_cache["model"]
    _yolo_cache["loaded"] = True
    if not os.path.exists(WEIGHTS_PATH):
        return None
    try:
        from ultralytics import YOLO
        _yolo_cache["model"] = YOLO(WEIGHTS_PATH)
        _yolo_cache["available"] = True
    except Exception as e:
        print(f"[YOLO] Failed to load weights: {e}")
        _yolo_cache["model"] = None
    return _yolo_cache["model"]


def yolo_available() -> bool:
    _try_load()
    return _yolo_cache["available"]


def detect_yolo(image_gray: np.ndarray, conf_threshold: float = 0.20):
    """Runs real YOLOv8 inference. Returns None if weights aren't available
    or the model produced zero boxes above threshold (caller should fall
    back to the heuristic-CV or demo-annotated path in that case)."""
    model = _try_load()
    if model is None:
        return None

    results = model.predict(image_gray, conf=conf_threshold, iou=0.45, verbose=False)
    r = results[0]
    if len(r.boxes) == 0:
        return {"detector_mode": "YOLO_TRAINED", "objects": []}

    objects = []
    for i, box in enumerate(r.boxes):
        x1, y1, x2, y2 = [float(v) for v in box.xyxy.tolist()[0]]
        conf = float(box.conf.item())
        w, h = x2 - x1, y2 - y1
        objects.append({
            "object_id": f"OBJ-{i+1:02d}",
            "x": int(x1), "y": int(y1), "width": int(w), "height": int(h),
            "confidence": round(conf, 3),
            "class_name": "Sonar Anomaly (YOLO)",
            "area_px": int(w * h),
        })
    objects.sort(key=lambda o: -o["confidence"])
    for i, obj in enumerate(objects):
        obj["object_id"] = f"OBJ-{i+1:02d}"

    return {"detector_mode": "YOLO_TRAINED", "objects": objects}
