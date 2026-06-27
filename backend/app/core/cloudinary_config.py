import os
import logging
import shutil
import uuid
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger("netra.cloudinary")
logger.setLevel(logging.INFO)

cloudinary_initialized = False

try:
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True
        )
        cloudinary_initialized = True
        logger.info("Cloudinary successfully configured.")
    else:
        logger.warning("Cloudinary credentials missing. Media uploads will fall back to local disk storage.")
except Exception as e:
    logger.error(f"Cloudinary setup failed: {e}. Falling back to local storage.")


def upload_media(file_bytes: bytes, file_name: str, folder: str = "netra_surveillance") -> str:
    """
    Uploads a file to Cloudinary if initialized, otherwise saves to local directory and returns URL.
    """
    if cloudinary_initialized:
        try:
            result = cloudinary.uploader.upload(
                file_bytes,
                public_id=f"{folder}/{uuid.uuid4()}_{file_name}",
                resource_type="auto"
            )
            return result.get("secure_url")
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}. Falling back to local mock upload.")

    # Fallback: Save local mock upload
    local_dir = os.path.join(os.getcwd(), "media_storage", folder)
    os.makedirs(local_dir, exist_ok=True)
    
    safe_name = f"{uuid.uuid4()}_{file_name}"
    local_path = os.path.join(local_dir, safe_name)
    
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    
    # Return a local relative URL that our server can serve
    return f"/media/{folder}/{safe_name}"
