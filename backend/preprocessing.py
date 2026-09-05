"""
SONARSHIELD - Sonar Preprocessing Module
==========================================
This is REAL image processing (not simulated): grayscale conversion,
denoising, CLAHE contrast enhancement, normalization and sharpening,
implemented with OpenCV / NumPy. Runs on whatever image is uploaded.
"""
import time
import cv2
import numpy as np


def preprocess_sonar(
    image_bgr_or_gray: np.ndarray,
    brightness: float = 0.0,      # -50..50
    contrast: float = 1.0,        # 0.5..2.0
    denoise_strength: int = 7,    # 0..15
    sharpen_amount: float = 0.6,  # 0..1.5
):
    t0 = time.perf_counter()

    if image_bgr_or_gray.ndim == 3:
        gray = cv2.cvtColor(image_bgr_or_gray, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_bgr_or_gray.copy()

    original_resolution = f"{gray.shape[1]}x{gray.shape[0]}"

    # 1. Denoising (fast non-local means — well suited to acoustic speckle)
    if denoise_strength > 0:
        denoised = cv2.fastNlMeansDenoising(gray, None, h=denoise_strength, templateWindowSize=7, searchWindowSize=21)
    else:
        denoised = gray

    # 2. Brightness / contrast
    adjusted = cv2.convertScaleAbs(denoised, alpha=contrast, beta=brightness)

    # 3. CLAHE (adaptive local contrast enhancement)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(adjusted)

    # 4. Normalization
    normalized = cv2.normalize(enhanced, None, 0, 255, cv2.NORM_MINMAX)

    # 5. Unsharp-mask sharpening
    if sharpen_amount > 0:
        blurred = cv2.GaussianBlur(normalized, (0, 0), sigmaX=2)
        sharpened = cv2.addWeighted(normalized, 1 + sharpen_amount, blurred, -sharpen_amount, 0)
    else:
        sharpened = normalized

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "processed": sharpened,
        "grayscale_raw": gray,
        "processing_time_ms": elapsed_ms,
        "resolution": original_resolution,
    }
