import os
import cv2
import httpx
import logging
import tempfile
import numpy as np
from typing import List, Dict, Any
from app import backend_url # imported from app configuration
from yolo_detector import YOLODetector
from privacy_mask import apply_privacy_masks_to_frame

logger = logging.getLogger("netra.ai_processor")
logger.setLevel(logging.INFO)

detector = YOLODetector()

async def process_video_async(report_id: str, video_url: str, privacy_masks: List[Dict[str, Any]] = None):
    """
    Downloads, processes frame-by-frame with YOLOv8, annotates boxes,
    re-uploads the annotated video, and reports results to the FastAPI backend.
    """
    logger.info(f"Starting background processing for report: {report_id} | Video: {video_url}")
    
    # 1. Prepare temporary files
    suffix = ".mp4" if "mp4" in video_url.lower() else ".avi"
    temp_in = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    
    try:
        # Resolve URL (if local fallback is relative, fetch from backend)
        full_url = video_url
        if video_url.startswith("/media/"):
            full_url = f"{backend_url}{video_url}"
            
        logger.info(f"Downloading video from {full_url}")
        
        # 2. Download source file
        async with httpx.AsyncClient() as client:
            response = await client.get(full_url, timeout=30.0)
            temp_in.write(response.content)
            temp_in.flush()
            
        # 3. Read video details using OpenCV
        cap = cv2.VideoCapture(temp_in.name)
        if not cap.isOpened():
            raise Exception("Failed to open source video file with OpenCV.")
            
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Setup Video Writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v') # H.264 compatible mp4v
        out = cv2.VideoWriter(temp_out.name, fourcc, fps, (width, height))
        
        frame_idx = 0
        timeline_detections = []
        all_alerts = []
        
        person_count_max = 0
        vehicle_count_total = 0
        face_count_total = 0
        
        # Process frames
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # A. Apply privacy masking first (if any configured for this report/source)
            if privacy_masks:
                frame = apply_privacy_masks_to_frame(frame, privacy_masks, fill_type="blur")
                
            # B. Analyze frame (skip frames to accelerate processing if needed: analyzing 1 in 3 frames)
            if frame_idx % 2 == 0:
                detections, alerts = detector.detect_frame(frame)
                
                # C. Draw bounding boxes on frame for visual highlight
                for det in detections:
                    d_type = det["type"]
                    box = det["box"] # Normalized [x1, y1, x2, y2]
                    
                    # Convert normalized back to absolute pixels
                    x1, y1, x2, y2 = (
                        int(box[0] * width),
                        int(box[1] * height),
                        int(box[2] * width),
                        int(box[3] * height)
                    )
                    
                    # Color codes: Person (Green), Vehicle (Blue), Plate (Yellow), Face (Red)
                    color = (0, 255, 0)
                    if d_type in ["Car", "Motorcycle", "Bus", "Truck"]:
                        color = (255, 0, 0)
                        vehicle_count_total += 1
                    elif "ANPR" in d_type:
                        color = (0, 255, 255)
                    elif d_type == "Face":
                        color = (0, 0, 255)
                        face_count_total += 1
                        
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, d_type, (x1, max(y1 - 10, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

                # D. Log timeline metrics
                timestamp_sec = round(frame_idx / fps, 2)
                if detections:
                    timeline_detections.append({
                        "timestamp": timestamp_sec,
                        "objects": [d["type"] for d in detections]
                    })
                    
                for alert in alerts:
                    alert["timestamp"] = timestamp_sec
                    all_alerts.append(alert)
                    
                # Track max crowd size
                persons_in_frame = len([d for d in detections if d["type"] == "Person"])
                if persons_in_frame > person_count_max:
                    person_count_max = persons_in_frame

            out.write(frame)
            frame_idx += 1

        cap.release()
        out.release()
        
        # 4. Upload annotated video back to Cloudinary/Local backend
        annotated_url = None
        
        # Read output file bytes
        with open(temp_out.name, "rb") as f:
            annotated_bytes = f.read()

        logger.info("Uploading processed video back to server...")
        
        # Trigger file upload via backend media gateway or directly
        async with httpx.AsyncClient() as client:
            # We hit the backend file uploader directly
            files = {"file": (f"annotated_{report_id}.mp4", annotated_bytes, "video/mp4")}
            upload_res = await client.post(
                f"{backend_url}/api/reports/upload",
                files=files,
                timeout=45.0
            )
            if upload_res.status_code == 200:
                annotated_url = upload_res.json().get("media_url")
            else:
                logger.error(f"Failed to upload processed video: {upload_res.text}")
                
        # 5. Compile final detection metrics
        summary_results = {
            "processed_video_url": annotated_url if annotated_url else video_url,
            "max_crowd_size": person_count_max,
            "estimated_vehicles_detected": vehicle_count_total // 15 + 1 if vehicle_count_total > 0 else 0, # rough frame-overlap compensation
            "estimated_faces_detected": face_count_total // 5 + 1 if face_count_total > 0 else 0,
            "alerts": all_alerts,
            "timeline": timeline_detections[:100] # Cap timeline list size
        }

        # 6. Send payload to Backend Callback endpoint
        logger.info(f"Inference complete. Dispatching callback to FastAPI...")
        async with httpx.AsyncClient() as client:
            callback_res = await client.post(
                f"{backend_url}/api/reports/{report_id}/ai-callback",
                json={
                    "status": "Completed",
                    "results": summary_results
                },
                timeout=10.0
            )
            logger.info(f"Callback responded with code: {callback_res.status_code}")

    except Exception as e:
        logger.error(f"Fatal error during video AI processing: {e}")
        # Notify backend of failure
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{backend_url}/api/reports/{report_id}/ai-callback",
                    json={"status": "Failed", "results": {"error": str(e)}},
                    timeout=5.0
                )
        except Exception as callback_err:
            logger.error(f"Callback fail notification error: {callback_err}")
            
    finally:
        # Clean up files
        try:
            os.remove(temp_in.name)
            os.remove(temp_out.name)
        except Exception as ce:
            logger.warning(f"Failed to delete temp files: {ce}")
