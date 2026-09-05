"""
SONARSHIELD - Anomaly / Risk Scoring Engine
==============================================
A transparent, hand-authored scoring formula (NOT a scientifically
validated maritime risk model - explicitly labeled "Prototype Risk
Assessment" everywhere in the UI):

    Risk Score = 40% Detection Confidence
               + 20% Object Area (normalized to image size)
               + 20% Acoustic Shadow Evidence
               + 20% Boundary / Shape Evidence

    0-39   -> LOW
    40-69  -> MEDIUM
    70-100 -> HIGH
"""
import cv2
import numpy as np


def _shadow_evidence(processed_gray: np.ndarray, x, y, w, h):
    """Looks for a darker region trailing the object (classic SSS acoustic
    shadow). Returns a 0..1 score."""
    H, W = processed_gray.shape[:2]
    shadow_h = int(h * 1.4)
    y0 = min(H, y + h)
    y1 = min(H, y0 + shadow_h)
    if y1 <= y0:
        return 0.0
    shadow_region = processed_gray[y0:y1, max(0, x):min(W, x + w)]
    object_region = processed_gray[y:y + h, x:x + w]
    if shadow_region.size == 0 or object_region.size == 0:
        return 0.0
    contrast = float(object_region.mean() - shadow_region.mean())
    return float(np.clip(contrast / 120.0, 0, 1))


def _boundary_evidence(processed_gray: np.ndarray, x, y, w, h):
    """Edge density along the bounding box perimeter via Canny — a sharper,
    more distinct boundary yields a higher score."""
    H, W = processed_gray.shape[:2]
    pad = 3
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(W, x + w + pad), min(H, y + h + pad)
    roi = processed_gray[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.0
    edges = cv2.Canny(roi, 50, 150)
    density = edges.mean() / 255.0
    return float(np.clip(density * 4, 0, 1))


def score_object(processed_gray: np.ndarray, obj: dict):
    x, y, w, h = obj["x"], obj["y"], obj["width"], obj["height"]
    H, W = processed_gray.shape[:2]

    confidence = obj["confidence"]
    area_norm = float(np.clip((w * h) / (W * H * 0.05), 0, 1))
    shadow = _shadow_evidence(processed_gray, x, y, w, h)
    boundary = _boundary_evidence(processed_gray, x, y, w, h)

    score = 100 * (0.40 * confidence + 0.20 * area_norm + 0.20 * shadow + 0.20 * boundary)
    score = round(float(np.clip(score, 0, 100)), 1)

    if score >= 70:
        risk = "HIGH"
    elif score >= 40:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    reasoning = []
    if confidence >= 0.85:
        reasoning.append("High model confidence")
    if area_norm >= 0.5:
        reasoning.append("Significant segmented region / area")
    if shadow >= 0.5:
        reasoning.append("Significant acoustic shadow detected")
    if boundary >= 0.5:
        reasoning.append("Distinct object boundary")
    if confidence >= 0.7 and shadow >= 0.35:
        reasoning.append("Strong acoustic return relative to surrounding seabed")
    if not reasoning:
        reasoning.append("Weak / marginal evidence across indicators")

    return {
        "anomaly_score": score,
        "risk": risk,
        "breakdown": {
            "confidence_component": round(confidence * 40, 1),
            "area_component": round(area_norm * 20, 1),
            "shadow_component": round(shadow * 20, 1),
            "boundary_component": round(boundary * 20, 1),
        },
        "raw_indicators": {
            "confidence": round(confidence, 3),
            "area_norm": round(area_norm, 3),
            "shadow_evidence": round(shadow, 3),
            "boundary_evidence": round(boundary, 3),
        },
        "reasoning": reasoning,
        "label": "Prototype Risk Assessment (not scientifically validated)",
    }



def detect_dropout(processed_gray: np.ndarray, grid_rows: int = 12, grid_cols: int = 16):
    """Detect possible Side-Scan Sonar signal-dropout regions.

    This is an explainable CV heuristic, not a scientifically validated
    dropout classifier. A cell is considered suspicious when it is unusually
    dark relative to its local neighbourhood and contains a high fraction of
    very-low-intensity pixels. The central nadir strip is ignored because it
    is a normal acquisition artifact in many SSS images.
    """
    gray = processed_gray.astype(np.uint8)
    H, W = gray.shape[:2]
    if H < 16 or W < 16:
        return {"dropout_detected": False, "candidates": [], "grid": [], "histogram": []}

    # Light smoothing makes the detector less sensitive to isolated speckle.
    smooth = cv2.GaussianBlur(gray, (5, 5), 0)
    global_mean = float(smooth.mean())
    global_std = float(smooth.std())
    low_threshold = float(np.clip(global_mean - 0.65 * max(global_std, 1.0), 8, 55))

    cell_h = max(1, H // grid_rows)
    cell_w = max(1, W // grid_cols)
    cells = []

    def neighbour_median(r, c, values):
        ns = []
        for rr in range(max(0, r - 1), min(grid_rows, r + 2)):
            for cc in range(max(0, c - 1), min(grid_cols, c + 2)):
                if rr == r and cc == c:
                    continue
                v = values.get((rr, cc))
                if v is not None:
                    ns.append(v)
        return float(np.median(ns)) if ns else global_mean

    stats = {}
    for r in range(grid_rows):
        y0 = r * cell_h
        y1 = H if r == grid_rows - 1 else min(H, (r + 1) * cell_h)
        for c in range(grid_cols):
            x0 = c * cell_w
            x1 = W if c == grid_cols - 1 else min(W, (c + 1) * cell_w)
            roi = smooth[y0:y1, x0:x1]
            if roi.size == 0:
                continue
            mean = float(roi.mean())
            dark_ratio = float((roi <= low_threshold).mean())
            stats[(r, c)] = (mean, dark_ratio, x0, y0, x1, y1)

    for (r, c), (mean, dark_ratio, x0, y0, x1, y1) in stats.items():
        # Ignore the known central nadir strip artifact.
        cx = (x0 + x1) / 2.0
        is_nadir = (x1 - x0) < W * 0.12 and abs(cx - W / 2.0) < W * 0.09
        if is_nadir:
            continue

        neighbour = neighbour_median(r, c, stats)
        relative_drop = float(np.clip((neighbour - mean) / max(neighbour, 1.0), 0, 1))
        # Score combines local intensity loss and concentration of dark pixels.
        score = 0.60 * relative_drop + 0.40 * min(1.0, dark_ratio / 0.75)
        if relative_drop >= 0.30 and dark_ratio >= 0.55:
            cells.append({
                "row": r, "col": c,
                "x": int(x0), "y": int(y0),
                "width": int(x1 - x0), "height": int(y1 - y0),
                "mean_intensity": round(mean, 2),
                "neighbor_mean": round(neighbour, 2),
                "dark_pixel_ratio": round(dark_ratio, 3),
                "relative_drop": round(relative_drop, 3),
                "dropout_score": round(float(score * 100), 1),
            })

    cells.sort(key=lambda x: x["dropout_score"], reverse=True)
    candidates = cells[:10]

    # Local variability grid: standard deviation in each grid cell.
    grid = []
    for r in range(grid_rows):
        row = []
        y0 = r * cell_h
        y1 = H if r == grid_rows - 1 else min(H, (r + 1) * cell_h)
        for c in range(grid_cols):
            x0 = c * cell_w
            x1 = W if c == grid_cols - 1 else min(W, (c + 1) * cell_w)
            roi = gray[y0:y1, x0:x1]
            row.append(round(float(roi.std()), 2) if roi.size else 0.0)
        grid.append(row)

    hist = cv2.calcHist([gray], [0], None, [16], [0, 256]).flatten()
    total = float(hist.sum()) or 1.0
    histogram = [round(float(v / total), 4) for v in hist]

    # Visualization: suspected dropout cells are outlined in red on the sonar image.
    overlay = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    for item in candidates:
        x, y, w, h = item["x"], item["y"], item["width"], item["height"]
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 0, 255), 2)
        cv2.putText(overlay, f'DROPOUT {item["dropout_score"]:.0f}%',
                    (x + 3, max(14, y + 15)), cv2.FONT_HERSHEY_SIMPLEX,
                    0.42, (0, 0, 255), 1, cv2.LINE_AA)

    return {
        "dropout_detected": bool(candidates),
        "candidate_count": len(candidates),
        "candidates": candidates,
        "grid": grid,
        "grid_rows": grid_rows,
        "grid_cols": grid_cols,
        "low_intensity_threshold": round(low_threshold, 2),
        "global_mean_intensity": round(global_mean, 2),
        "global_std": round(global_std, 2),
        "histogram": histogram,
        "overlay": overlay,
    }
