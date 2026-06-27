import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File, Form
from app.core.firebase_config import db
from app.core.security import get_current_user, RoleChecker, UserRoles
from app.core.cloudinary_config import upload_media
from app.services.audit_service import AuditService
from app.services.ai_client import AIClient
from app.models.schemas import IncidentReportResponse

router = APIRouter()

@router.post("/upload", dependencies=[Depends(RoleChecker([UserRoles.CITIZEN]))])
async def upload_evidence_video(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a CCTV incident video clip to Cloudinary (or local fallback).
    """
    # File validation
    allowed_types = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Only videos and images are allowed."
        )

    try:
        file_bytes = await file.read()
        media_url = upload_media(file_bytes, file.filename, folder="incidents")
        return {"media_url": media_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Media upload failed: {str(e)}"
        )


@router.post("/", response_model=IncidentReportResponse, dependencies=[Depends(RoleChecker([UserRoles.CITIZEN]))])
async def submit_crime_report(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    incident_datetime: str = Form(...),
    video: Optional[UploadFile] = File(None),
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a crime report. Uploads video if attached and kicks off YOLO AI evaluation.
    """
    report_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    video_url = None
    if video:
        # Save video
        file_bytes = await video.read()
        video_url = upload_media(file_bytes, video.filename, folder="incidents")
        
    ai_status = "Pending"
    if video_url:
        ai_status = "Processing"

    report_data = {
        "id": report_id,
        "citizen_uid": current_user.get("uid"),
        "citizen_name": current_user.get("full_name"),
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "incident_datetime": incident_datetime,
        "video_url": video_url,
        "ai_status": ai_status,
        "ai_results": {},
        "created_at": created_at
    }
    
    db.collection("reports").document(report_id).set(report_data)
    
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="REPORT_SUBMIT",
        details=f"Submitted crime report: '{title}' (ID: {report_id})",
        ip_address=request.client.host if request and request.client else "unknown"
    )

    # Launch AI processing in the background (asynchronous REST call)
    if video_url:
        import asyncio
        asyncio.create_task(AIClient.trigger_video_analysis(report_id, video_url))
        
    return IncidentReportResponse(**report_data)


@router.get("/", response_model=List[IncidentReportResponse])
async def list_reports(current_user: dict = Depends(get_current_user)):
    """
    List reports. Citizens see only theirs. Police see everything.
    """
    role = current_user.get("role")
    uid = current_user.get("uid")
    reports_ref = db.collection("reports")
    
    if role == UserRoles.CITIZEN:
        query_results = reports_ref.where("citizen_uid", "==", uid).get()
    else:
        query_results = reports_ref.get()
        
    reports = []
    for doc in query_results:
        reports.append(IncidentReportResponse(**doc.to_dict()))
        
    return reports


@router.get("/{report_id}", response_model=IncidentReportResponse)
async def get_report_details(report_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get detailed report and any YOLO AI inference results.
    """
    report_doc = db.collection("reports").document(report_id).get()
    if not report_doc.exists:
        raise HTTPException(status_code=404, detail="Incident report not found.")
        
    report_data = report_doc.to_dict()
    
    # Enforce access boundaries
    if current_user.get("role") == UserRoles.CITIZEN and report_data.get("citizen_uid") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Unauthorized access to this report.")
        
    return IncidentReportResponse(**report_data)


@router.post("/{report_id}/ai-callback")
async def ai_analysis_callback(report_id: str, payload: dict):
    """
    Callback endpoint used by the AI Microservice to write back detection analytics logs.
    """
    report_doc = db.collection("reports").document(report_id).get()
    if not report_doc.exists:
        raise HTTPException(status_code=404, detail="Report not found.")
        
    status_str = payload.get("status", "Completed")
    results = payload.get("results", {})
    
    db.collection("reports").document(report_id).update({
        "ai_status": status_str,
        "ai_results": results
    })
    
    return {"message": "AI analysis results integrated."}
