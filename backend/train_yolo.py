"""
SONARSHIELD - YOLOv8 Training Script
========================================
Fine-tunes a YOLOv8-nano model (pretrained on COCO) on the SONARSHIELD
sonar-anomaly dataset.

SCIENTIFIC HONESTY: by default this trains on the 7-image SYNTHETIC demo
set built by build_yolo_dataset.py. That is intentionally enough to prove
the training + inference pipeline works end-to-end in this prototype -
it is NOT enough data to produce a production-grade detector. To get a
detector that generalizes, point this script at a `data.yaml` built from
real, hand-labeled AI4Shipwrecks / SubPipe frames (hundreds of images
minimum) instead.

Usage:
    python backend/ml/train_yolo.py                 # trains on synthetic demo set
    python backend/ml/train_yolo.py --data path/to/your/data.yaml --epochs 100
"""
import argparse
import os
import shutil
from ultralytics import YOLO

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_YAML = os.path.join(HERE, "yolo_dataset", "data.yaml")
WEIGHTS_OUT = os.path.join(HERE, "weights", "yolo_sonar.pt")


def train(data_yaml: str = DEFAULT_DATA_YAML, epochs: int = 40, imgsz: int = 640):
    model = YOLO("yolov8n.pt")  # COCO-pretrained nano backbone, fine-tuned below
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=2,
        project=os.path.join(HERE, "yolo_runs"),
        name="sonar_anomaly",
        exist_ok=True,
        patience=0,
        verbose=False,
        plots=False,
        # Tiny (7-image) dataset settings: disable heavy augmentation so the
        # model can actually converge/calibrate confidence instead of being
        # regularized against data it doesn't have enough of.
        mosaic=0.0, mixup=0.0, copy_paste=0.0, degrees=0.0, translate=0.05,
        scale=0.2, shear=0.0, perspective=0.0, flipud=0.0, fliplr=0.5,
        hsv_h=0.0, hsv_s=0.2, hsv_v=0.2,
        cls=1.5,  # weight classification loss more heavily to sharpen confidence
        lr0=0.005,
    )
    best_path = os.path.join(HERE, "yolo_runs", "sonar_anomaly", "weights", "best.pt")
    os.makedirs(os.path.dirname(WEIGHTS_OUT), exist_ok=True)
    if os.path.exists(best_path):
        shutil.copy(best_path, WEIGHTS_OUT)
        print(f"Trained weights saved to {WEIGHTS_OUT}")
    else:
        print("Training finished but best.pt was not found — check yolo_runs/ for logs.")
    return WEIGHTS_OUT


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=DEFAULT_DATA_YAML)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()
    train(args.data, args.epochs, args.imgsz)
