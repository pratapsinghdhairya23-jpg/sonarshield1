"""
SONARSHIELD - YOLO Dataset Builder
=====================================
Converts the bundled synthetic demo images + fixed annotations
(data/demo/annotations.json) into the YOLOv8 training layout:

    backend/ml/yolo_dataset/
        images/train/*.png
        images/val/*.png
        labels/train/*.txt
        labels/val/*.txt
        data.yaml

IMPORTANT / SCIENTIFIC HONESTY:
This produces a TINY (7-image) single-class dataset from SYNTHETIC sonar
renders, purely so a real YOLOv8 model can be fine-tuned and actually run
end-to-end in this prototype. It demonstrates the training pipeline
mechanics, not production-grade detection accuracy. For real accuracy you
need to label real AI4Shipwrecks/SubPipe sonar imagery (hundreds+ of
frames) and retrain — see backend/ml/train_yolo.py docstring.
"""
import json
import os
import shutil
import random

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO_DIR = os.path.join(HERE, "..", "..", "data", "demo")
ANNOT_PATH = os.path.join(DEMO_DIR, "annotations.json")
OUT_DIR = os.path.join(HERE, "yolo_dataset")

IMG_W, IMG_H = 640, 480
CLASS_NAMES = ["sonar_anomaly"]  # single class: any flagged acoustic return


def build():
    with open(ANNOT_PATH) as f:
        annotations = json.load(f)

    for split in ("train", "val"):
        os.makedirs(os.path.join(OUT_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(OUT_DIR, "labels", split), exist_ok=True)

    filenames = list(annotations.keys())
    random.Random(42).shuffle(filenames)
    # tiny dataset: hold out 2 images for val, rest for train
    val_set = set(filenames[:2])

    for fname, meta in annotations.items():
        split = "val" if fname in val_set else "train"
        src_img = os.path.join(DEMO_DIR, fname)
        dst_img = os.path.join(OUT_DIR, "images", split, fname)
        shutil.copy(src_img, dst_img)

        label_path = os.path.join(OUT_DIR, "labels", split, fname.replace(".png", ".txt"))
        lines = []
        for obj in meta["objects"]:
            x, y, w, h = obj["x"], obj["y"], obj["width"], obj["height"]
            cx = (x + w / 2) / IMG_W
            cy = (y + h / 2) / IMG_H
            nw = w / IMG_W
            nh = h / IMG_H
            lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
        with open(label_path, "w") as lf:
            lf.write("\n".join(lines))

    data_yaml = f"""# SONARSHIELD synthetic demo YOLO dataset (proof-of-concept only)
path: {OUT_DIR}
train: images/train
val: images/val
names:
  0: sonar_anomaly
"""
    with open(os.path.join(OUT_DIR, "data.yaml"), "w") as f:
        f.write(data_yaml)

    print(f"YOLO dataset built at {OUT_DIR} "
          f"({len(filenames) - len(val_set)} train / {len(val_set)} val images)")
    return os.path.join(OUT_DIR, "data.yaml")


if __name__ == "__main__":
    build()
