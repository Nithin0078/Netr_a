import httpx
import logging
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger("netra.ai_client")
logger.setLevel(logging.INFO)

class AIClient:
    @staticmethod
    async def trigger_video_analysis(report_id: str, video_url: str) -> Dict[str, Any]:
        """
        Calls the AI microservice to queue YOLOv8 processing of an uploaded incident video.
        """
        async with httpx.AsyncClient() as client:
            try:
                # We send the report ID and video URL to the AI microservice
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/analyze-video",
                    json={"report_id": report_id, "video_url": video_url},
                    timeout=10.0
                )
                if response.status_code == 202:
                    logger.info(f"AI analysis successfully scheduled for report {report_id}")
                    return response.json()
                else:
                    logger.error(f"AI microservice returned code {response.status_code}: {response.text}")
                    return {"status": "Failed", "error": f"Service returned code {response.status_code}"}
            except Exception as e:
                logger.error(f"Failed to connect to AI microservice at {settings.AI_SERVICE_URL}: {e}")
                return {"status": "Failed", "error": "AI service offline"}

    @staticmethod
    async def process_live_frame_masking(image_bytes: bytes, privacy_masks: List[Dict[str, Any]]) -> bytes:
        """
        Sends frame bytes and privacy mask geometries to the AI microservice to apply blurred polygon privacy zones.
        """
        async with httpx.AsyncClient() as client:
            try:
                files = {"file": ("frame.jpg", image_bytes, "image/jpeg")}
                data = {"masks": json.dumps(privacy_masks)}
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/apply-mask",
                    files=files,
                    data=data,
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.content
                else:
                    logger.error("AI microservice mask application failed.")
                    return image_bytes
            except Exception as e:
                logger.error(f"AI service connection failed for live frame masking: {e}")
                return image_bytes
