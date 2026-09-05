"""
SONARSHIELD - Synthetic Demo Data Generator
=============================================
Generates SYNTHETIC sonar-like images that visually resemble side-scan sonar
output (seabed texture, acoustic shadows, nadir gap, sonar returns from
objects). These are NOT real sonar data and are clearly labeled as such
everywhere they appear in the UI ("SYNTHETIC DEMO DATA").

For each generated image we also generate:
  - a binary ground-truth-style segmentation mask (0=background, 1=object)
  - a fixed, deterministic annotation record (bounding boxes) that the
    DEMO MODE detector will reproduce exactly, so results are stable and
    repeatable during a live demo.

Run directly:  python demo_data_gen.py
"""
import os
import json
import numpy as np
import cv2

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "demo")
MASK_DIR = os.path.join(OUT_DIR, "masks")
ANNOT_PATH = os.path.join(OUT_DIR, "annotations.json")

W, H = 640, 480


def _seabed_texture(seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    base = rng.normal(loc=90, scale=18, size=(H, W)).astype(np.float32)
    # horizontal sonar scan-line streaking
    for y in range(H):
        base[y, :] += 6 * np.sin(y * 0.15 + seed) 
    # low-frequency seabed undulation
    xs = np.linspace(0, 8 * np.pi, W)
    ripple = 10 * np.sin(xs + seed)
    base += ripple[None, :]
    base = cv2.GaussianBlur(base, (0, 0), sigmaX=1.2)
    # speckle noise typical of acoustic backscatter
    speckle = rng.normal(0, 10, size=(H, W))
    base += speckle
    return np.clip(base, 0, 255).astype(np.uint8)


def _add_object(img, mask, cx, cy, w, h, angle_deg, intensity=235, shadow=True):
    """Draw a bright acoustic-return blob + a dark acoustic shadow behind it,
    the classic side-scan sonar signature of a raised object on the seabed."""
    overlay = img.copy()
    rect = ((cx, cy), (w, h), angle_deg)
    box = cv2.boxPoints(rect).astype(np.int32)
    fill_color = (float(intensity), float(intensity), float(intensity))
    cv2.fillConvexPoly(overlay, box, fill_color)
    img[:] = cv2.addWeighted(img, 0.15, overlay, 0.85, 0)
    cv2.fillConvexPoly(mask, box, 1)

    if shadow:
        shadow_len = int(h * 1.6)
        shx = int(cx + shadow_len * np.cos(np.radians(angle_deg + 90)))
        shy = int(cy + shadow_len * np.sin(np.radians(angle_deg + 90)))
        shadow_rect = ((shx, shy), (w * 0.9, shadow_len), angle_deg)
        sbox = cv2.boxPoints(shadow_rect).astype(np.int32)
        shadow_layer = img.copy()
        cv2.fillConvexPoly(shadow_layer, sbox, (25.0, 25.0, 25.0))
        img[:] = cv2.addWeighted(img, 0.25, shadow_layer, 0.75, 0)

    x, y, bw, bh = cv2.boundingRect(box)
    return {"x": int(x), "y": int(y), "width": int(bw), "height": int(bh)}


SCENES = [
    {
        "file": "sonar_01.png",
        "label": "Elongated Wreck-like Return",
        "objects": [
            {"cx": 320, "cy": 220, "w": 140, "h": 34, "angle": 12, "class": "Shipwreck", "conf": 0.947},
        ],
    },
    {
        "file": "sonar_02.png",
        "label": "Compact High-Contrast Target",
        "objects": [
            {"cx": 210, "cy": 300, "w": 46, "h": 30, "angle": -20, "class": "Fishing Gear", "conf": 0.882},
        ],
    },
    {
        "file": "sonar_03.png",
        "label": "Linear Seabed Feature",
        "objects": [
            {"cx": 400, "cy": 150, "w": 220, "h": 16, "angle": 4, "class": "Pipeline/Cable", "conf": 0.865},
        ],
    },
    {
        "file": "sonar_04.png",
        "label": "Two Discrete Returns",
        "objects": [
            {"cx": 150, "cy": 130, "w": 60, "h": 38, "angle": 30, "class": "Unknown Anomaly", "conf": 0.781},
            {"cx": 470, "cy": 340, "w": 50, "h": 50, "angle": 0, "class": "Fishing Gear", "conf": 0.836},
        ],
    },
    {
        "file": "sonar_05.png",
        "label": "Clean Seabed (No Anomaly)",
        "objects": [],
    },
    {
        "file": "sonar_06.png",
        "label": "Large Wreck Signature",
        "objects": [
            {"cx": 300, "cy": 250, "w": 180, "h": 60, "angle": -8, "class": "Shipwreck", "conf": 0.962},
        ],
    },
    {
        "file": "sonar_07.png",
        "label": "Faint Debris Field",
        "objects": [
            {"cx": 200, "cy": 200, "w": 34, "h": 24, "angle": 15, "class": "Unknown Anomaly", "conf": 0.712},
        ],
    },
]


def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(MASK_DIR, exist_ok=True)
    annotations = {}

    for idx, scene in enumerate(SCENES):
        img = _seabed_texture(seed=idx + 1)
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR).astype(np.float32)
        mask = np.zeros((H, W), dtype=np.uint8)

        obj_records = []
        for obj in scene["objects"]:
            bbox = _add_object(img, mask, obj["cx"], obj["cy"], obj["w"], obj["h"], obj["angle"])
            obj_records.append({**bbox, "class": obj["class"], "confidence": obj["conf"]})

        # nadir (blind zone) strip down the middle, typical of SSS imagery
        mid = W // 2
        strip = int(W * 0.03)
        img[:, mid - strip:mid + strip] = 15

        img_gray = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)

        cv2.imwrite(os.path.join(OUT_DIR, scene["file"]), img_gray)
        mask_file = scene["file"].replace(".png", "_mask.png")
        cv2.imwrite(os.path.join(MASK_DIR, mask_file), mask * 255)

        annotations[scene["file"]] = {
            "label": scene["label"],
            "mask_file": mask_file,
            "objects": obj_records,
            "synthetic": True,
        }

    with open(ANNOT_PATH, "w") as f:
        json.dump(annotations, f, indent=2)

    print(f"Generated {len(SCENES)} synthetic demo sonar images -> {OUT_DIR}")


if __name__ == "__main__":
    generate()
