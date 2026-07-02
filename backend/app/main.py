import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.api.api import api_router

# Initialize FastAPI App
app = FastAPI(
    title="NETRA API",
    description="Networked Eyes for Tactical Response and Awareness - Smart Surveillance & Public Safety API Backend",
    version="1.0.0"
)

# 1. Custom Middlewares
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
print("CORS Origins:", settings.cors_origins_list)
# 2. CORS Configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount Local Media storage for offline file uploading fallback
MEDIA_DIR = os.path.join(os.getcwd(), "media_storage")
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# 4. Integrate API Router
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "Healthy",
        "app": "NETRA (Networked Eyes for Tactical Response and Awareness)",
        "docs": "/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
