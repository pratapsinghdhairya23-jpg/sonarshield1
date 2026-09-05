"""
SONARSHIELD - Segmentation Module
====================================
Includes a real, from-scratch U-Net architecture in PyTorch (`UNet` below),
sized for binary side-scan-sonar segmentation exactly as used on
AI4Shipwrecks (0=background, 1=shipwreck/debris region).

IMPORTANT / SCIENTIFIC HONESTY:
No pretrained weights ship with this prototype (training on the full
AI4Shipwrecks dataset requires downloading it separately - see README).
`segment()` therefore runs in one of two modes:

  - "UNET_TRAINED": used automatically if a weights file is found at
    ml/weights/unet_sonar.pt. Produces genuine model inference.
  - "CV_FALLBACK": used otherwise. A deterministic Otsu-threshold +
    morphological-cleanup segmentation from the bounding boxes returned by
    the detector. This is a classical-CV stand-in, clearly reported to the
    frontend as DEMO/FALLBACK, never presented as neural network output.

If ground-truth masks exist (bundled demo masks), IoU/Dice/Precision/Recall
are computed and returned tagged as DEMO / SAMPLE METRICS.
"""
import os
import cv2
import numpy as np
import torch
import torch.nn as nn

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "unet_sonar.pt")


class DoubleConv(nn.Module):
    def __init__(self, in_c, out_c):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_c, out_c, 3, padding=1), nn.BatchNorm2d(out_c), nn.ReLU(inplace=True),
            nn.Conv2d(out_c, out_c, 3, padding=1), nn.BatchNorm2d(out_c), nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class UNet(nn.Module):
    """Standard 4-level U-Net for binary segmentation, 1-channel sonar input."""
    def __init__(self, in_channels=1, out_channels=1, base=32):
        super().__init__()
        self.enc1 = DoubleConv(in_channels, base)
        self.enc2 = DoubleConv(base, base * 2)
        self.enc3 = DoubleConv(base * 2, base * 4)
        self.enc4 = DoubleConv(base * 4, base * 8)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = DoubleConv(base * 8, base * 16)
        self.up4 = nn.ConvTranspose2d(base * 16, base * 8, 2, stride=2)
        self.dec4 = DoubleConv(base * 16, base * 8)
        self.up3 = nn.ConvTranspose2d(base * 8, base * 4, 2, stride=2)
        self.dec3 = DoubleConv(base * 8, base * 4)
        self.up2 = nn.ConvTranspose2d(base * 4, base * 2, 2, stride=2)
        self.dec2 = DoubleConv(base * 4, base * 2)
        self.up1 = nn.ConvTranspose2d(base * 2, base, 2, stride=2)
        self.dec1 = DoubleConv(base * 2, base)
        self.out_conv = nn.Conv2d(base, out_channels, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        b = self.bottleneck(self.pool(e4))
        d4 = self.dec4(torch.cat([self.up4(b), e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return torch.sigmoid(self.out_conv(d1))


_model_cache = {"model": None, "loaded": False}


def _try_load_model():
    if _model_cache["loaded"]:
        return _model_cache["model"]
    _model_cache["loaded"] = True
    if os.path.exists(WEIGHTS_PATH):
        model = UNet()
        model.load_state_dict(torch.load(WEIGHTS_PATH, map_location="cpu"))
        model.eval()
        _model_cache["model"] = model
    return _model_cache["model"]


def _cv_fallback_mask(processed_gray: np.ndarray, objects: list):
    """Otsu threshold restricted to detected regions, cleaned with morphology."""
    mask = np.zeros(processed_gray.shape, dtype=np.uint8)
    if not objects:
        return mask
    for obj in objects:
        x, y, w, h = obj["x"], obj["y"], obj["width"], obj["height"]
        pad = 4
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(processed_gray.shape[1], x + w + pad), min(processed_gray.shape[0], y + h + pad)
        roi = processed_gray[y0:y1, x0:x1]
        if roi.size == 0:
            continue
        _, roi_mask = cv2.threshold(roi, 0, 1, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        roi_mask = cv2.morphologyEx(roi_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        mask[y0:y1, x0:x1] = np.maximum(mask[y0:y1, x0:x1], roi_mask)
    return mask


def segment(processed_gray: np.ndarray, objects: list):
    model = _try_load_model()
    if model is not None:
        with torch.no_grad():
            inp = processed_gray.astype(np.float32) / 255.0
            h0, w0 = inp.shape
            resized = cv2.resize(inp, (256, 256))
            tensor = torch.from_numpy(resized)[None, None, :, :]
            pred = model(tensor)[0, 0].numpy()
            mask = (pred > 0.5).astype(np.uint8)
            mask = cv2.resize(mask, (w0, h0), interpolation=cv2.INTER_NEAREST)
        mode = "UNET_TRAINED"
    else:
        mask = _cv_fallback_mask(processed_gray, objects)
        mode = "CV_FALLBACK"
    return {"mask": mask, "mode": mode}


def compute_metrics(pred_mask: np.ndarray, gt_mask: np.ndarray):
    pred = (pred_mask > 0).astype(np.uint8)
    gt = (gt_mask > 0).astype(np.uint8)
    intersection = int(np.logical_and(pred, gt).sum())
    union = int(np.logical_or(pred, gt).sum())
    pred_sum = int(pred.sum())
    gt_sum = int(gt.sum())

    iou = intersection / union if union > 0 else 0.0
    dice = (2 * intersection) / (pred_sum + gt_sum) if (pred_sum + gt_sum) > 0 else 0.0
    precision = intersection / pred_sum if pred_sum > 0 else 0.0
    recall = intersection / gt_sum if gt_sum > 0 else 0.0

    return {
        "iou": round(iou, 3),
        "dice": round(dice, 3),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "label": "DEMO / SAMPLE METRICS",
    }
