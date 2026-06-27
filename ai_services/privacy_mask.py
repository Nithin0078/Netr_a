import cv2
import numpy as np
from typing import List, Dict, Any

def apply_privacy_masks_to_frame(frame: np.ndarray, masks: List[Dict[str, Any]], fill_type: str = "blur") -> np.ndarray:
    """
    Applies privacy masks (polygons) on an OpenCV frame.
    Each mask in `masks` is expected to have a 'points' key: [{'x': float, 'y': float}, ...]
    Coordinates are normalized (0.0 to 1.0).
    `fill_type` can be: 'blur' (Gaussian Blur) or 'solid' (black out).
    """
    if not masks:
        return frame

    h, w = frame.shape[:2]
    mask_img = np.zeros((h, w), dtype=np.uint8)

    for mask_dict in masks:
        points = mask_dict.get("points", [])
        if len(points) < 3:
            continue  # Need at least 3 points to form a polygon

        # Convert normalized coordinates back to absolute pixels
        poly_points = []
        for pt in points:
            px = int(float(pt.get("x", 0.0)) * w)
            py = int(float(pt.get("y", 0.0)) * h)
            poly_points.append([px, py])

        pts = np.array(poly_points, dtype=np.int32)
        cv2.fillPoly(mask_img, [pts], 255)

    if fill_type == "blur":
        # 1. Apply Gaussian blur to the entire image
        # kernel size must be odd and positive
        ksize = int(w * 0.05) | 1  # 5% of width, made odd
        blurred_frame = cv2.GaussianBlur(frame, (ksize, ksize), 0)
        
        # 2. Extract mask region from blurred image and blend with original
        # Convert mask to 3 channels
        mask_3ch = cv2.merge([mask_img, mask_img, mask_img])
        
        # Blend: original * (1 - mask) + blurred * mask
        blended = np.where(mask_3ch == 255, blurred_frame, frame)
        return blended
    else:
        # Solid blackout
        mask_3ch = cv2.merge([mask_img, mask_img, mask_img])
        black_img = np.zeros_like(frame)
        blended = np.where(mask_3ch == 255, black_img, frame)
        return blended
