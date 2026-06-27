from fastapi import APIRouter
from app.api.endpoints import (
    auth, users, cameras, reports, investigations, notifications, audit, analytics
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["Camera Feeds & Consent"])
api_router.include_router(reports.router, prefix="/reports", tags=["Incident Reports & AI"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigations & Evidence"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["Immutable Audit Trail"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Dashboard Analytics"])
