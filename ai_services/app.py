import os
import json
import uvicorn
from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Form, HTTPException, status
from fastapi.responses import Response
import numpy as np
import cv2

# Define global backend URL before imports to avoid circular issues
BACKEND_PORT = os.getenv("BACKEND_PORT", "8000")
backend_url = os.getenv("BACKEND_URL", f"http://localhost:{BACKEND_PORT}")

# Export so it's accessible inside video_processor
import app
app.backend_url = backend_url

from video_processor import process_video_async
from privacy_mask import apply_privacy_masks_to_frame

ai_app = FastAPI(
    title="NETRA AI Microservice",
    description="Surveillance Computer Vision (YOLOv8 + OpenCV) microservice for public safety feeds.",
    version="1.0.0"
)

@ai_app.get("/")
def read_root():
    return {
        "status": "Healthy",
        "microservice": "NETRA AI Processing Engine",
        "yolo_model": "yolov8n.pt",
        "target_backend": backend_url
    }

class VideoAnalysisRequest(dict):
    # Minimal custom parsing
    pass

@ai_app.post("/analyze-video", status_code=status.HTTP_202_ACCEPTED)
async def analyze_video(
    request: dict,
    background_tasks: BackgroundTasks
):
    """
    Asynchronously processes a surveillance video in the background.
    """
    report_id = request.get("report_id")
    video_url = request.get("video_url")
    privacy_masks = request.get("privacy_masks", [])

    if not report_id or not video_url:
        raise HTTPException(
            status_code=400,
            detail="Fields 'report_id' and 'video_url' are required."
        )

    # Schedule background worker execution
    background_tasks.add_task(
        process_video_async,
        report_id=report_id,
        video_url=video_url,
        privacy_masks=privacy_masks
    )

    return {
        "status": "Processing",
        "message": f"AI video processing scheduled for report {report_id}."
    }


@ai_app.post("/apply-mask")
async def apply_mask(
    file: UploadFile = File(...),
    masks: str = Form("[]")
):
    """
    Applies custom privacy blurring polygons directly onto a single video frame.
    """
    try:
        # Load JSON masks from Form data
        parsed_masks = json.loads(masks)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format for masks coordinates.")

    try:
        # Read image bytes and convert to OpenCV format
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise Exception("Failed to decode frame bytes.")
            
        # Process frame
        masked_frame = apply_privacy_masks_to_frame(frame, parsed_masks, fill_type="blur")
        
        # Convert back to jpeg bytes
        _, encoded_img = cv2.imencode(".jpg", masked_frame)
        return Response(content=encoded_img.tobytes(), media_type="image/jpeg")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Privacy mask calculation failed: {str(e)}"
        )

# Direct execution capability
app = ai_app
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
