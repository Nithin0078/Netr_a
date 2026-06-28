import datetime
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.core.firebase_config import db
from app.core.security import get_current_user, RoleChecker, UserRoles
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.schemas import (
    CameraCreate, CameraUpdate, CameraResponse,
    AccessRequestCreate, AccessRequestResponse, AccessRequestUpdate
)

router = APIRouter()

# --- CITIZEN CAMERA MANAGEMENT ENDPOINTS ---

@router.post("/", response_model=CameraResponse, dependencies=[Depends(RoleChecker([UserRoles.CITIZEN]))])
async def register_camera(
    camera_in: CameraCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Citizen registers a new CCTV camera.
    """
    camera_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    camera_data = {
        "id": camera_id,
        "owner_uid": current_user.get("uid"),
        "name": camera_in.name,
        "stream_url": camera_in.stream_url,
        "location_lat": camera_in.location_lat,
        "location_lng": camera_in.location_lng,
        "description": camera_in.description,
        "is_paused": False,
        "is_revoked": False,
        "privacy_masks": [],
        "created_at": created_at
    }
    
    db.collection("cameras").document(camera_id).set(camera_data)
    
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="CAMERA_REGISTER",
        details=f"Registered CCTV camera: '{camera_in.name}' (ID: {camera_id})",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return CameraResponse(**camera_data)


@router.get("/", response_model=List[CameraResponse])
async def list_user_cameras(current_user: dict = Depends(get_current_user)):
    """
    Get cameras list. Citizens get their own cameras. Police get all active/unrevoked cameras.
    """
    cameras_ref = db.collection("cameras")
    role = current_user.get("role")
    uid = current_user.get("uid")
    
    if role == UserRoles.CITIZEN:
        query_results = cameras_ref.where("owner_uid", "==", uid).get()
    else:
        # Police can see all cameras that are not revoked
        query_results = cameras_ref.where("is_revoked", "==", False).get()
        
    cameras = []
    for doc in query_results:
        c_data = doc.to_dict()
        cameras.append(CameraResponse(**c_data))
        
    return cameras


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    camera_update: CameraUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Update camera configurations. Only the citizen owner can modify their camera settings.
    """
    cam_doc = db.collection("cameras").document(camera_id).get()
    if not cam_doc.exists:
        raise HTTPException(status_code=404, detail="Camera not found.")
        
    cam_data = cam_doc.to_dict()
    if cam_data.get("owner_uid") != current_user.get("uid") and current_user.get("role") != UserRoles.ADMIN:
        raise HTTPException(status_code=403, detail="Permission denied. You do not own this camera.")
        
    update_dict = {}
    if camera_update.name is not None:
        update_dict["name"] = camera_update.name
    if camera_update.stream_url is not None:
        update_dict["stream_url"] = camera_update.stream_url
    if camera_update.location_lat is not None:
        update_dict["location_lat"] = camera_update.location_lat
    if camera_update.location_lng is not None:
        update_dict["location_lng"] = camera_update.location_lng
    if camera_update.description is not None:
        update_dict["description"] = camera_update.description
    if camera_update.is_paused is not None:
        update_dict["is_paused"] = camera_update.is_paused
    if camera_update.is_revoked is not None:
        update_dict["is_revoked"] = camera_update.is_revoked
    if camera_update.privacy_masks is not None:
        # Serialize list of privacy mask models into dict format for Firestore
        update_dict["privacy_masks"] = [mask.model_dump() for mask in camera_update.privacy_masks]
        
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided to update.")
        
    db.collection("cameras").document(camera_id).update(update_dict)
    
    # Audit log
    action_type = "CAMERA_UPDATE"
    if "is_paused" in update_dict:
        action_type = "CAMERA_PAUSE" if update_dict["is_paused"] else "CAMERA_RESUME"
    elif "is_revoked" in update_dict:
        action_type = "CAMERA_REVOKE" if update_dict["is_revoked"] else "CAMERA_RESTORE"
        
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action=action_type,
        details=f"Modified camera {camera_id}: {list(update_dict.keys())}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    # Return updated camera
    updated_cam = db.collection("cameras").document(camera_id).get().to_dict()
    return CameraResponse(**updated_cam)


# --- POLICE ACCESS REQUEST WORKFLOWS ---

@router.post("/requests", response_model=AccessRequestResponse, dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def request_camera_access(
    req_in: AccessRequestCreate,
    request: Request,
    police_user: dict = Depends(get_current_user)
):
    """
    Police officer requests access to view citizen's camera stream.
    """
    cam_doc = db.collection("cameras").document(req_in.camera_id).get()
    if not cam_doc.exists:
        raise HTTPException(status_code=404, detail="Surveillance camera not found.")
        
    cam_data = cam_doc.to_dict()
    if cam_data.get("is_revoked", False):
        raise HTTPException(status_code=400, detail="Cannot request access to a revoked camera feed.")
        
    req_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    req_data = {
        "id": req_id,
        "camera_id": req_in.camera_id,
        "requested_by_uid": police_user.get("uid"),
        "requested_by_name": police_user.get("full_name"),
        "reason": req_in.reason,
        "status": "Pending",
        "duration_hours": req_in.duration_hours,
        "approved_at": None,
        "expires_at": None,
        "created_at": created_at
    }
    
    db.collection("access_requests").document(req_id).set(req_data)
    
    # Notify Citizen Owner
    NotificationService.notify_citizen_of_access(
        citizen_uid=cam_data.get("owner_uid"),
        camera_name=cam_data.get("name"),
        officer_name=police_user.get("full_name"),
        action="requested"
    )
    
    # Audit log
    AuditService.log_event(
        operator_uid=police_user.get("uid"),
        operator_email=police_user.get("email"),
        action="CAMERA_ACCESS_REQUEST",
        details=f"Requested access to camera {req_in.camera_id} for {req_in.duration_hours} hours. Reason: {req_in.reason}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return AccessRequestResponse(**req_data)


@router.get("/requests/citizen", response_model=List[AccessRequestResponse], dependencies=[Depends(RoleChecker([UserRoles.CITIZEN]))])
async def list_citizen_received_requests(current_user: dict = Depends(get_current_user)):
    """
    List all camera access requests received by the current citizen.
    """
    citizen_uid = current_user.get("uid")
    # Fetch all citizen cameras
    cameras = db.collection("cameras").where("owner_uid", "==", citizen_uid).get()
    camera_ids = [cam.id for cam in cameras]
    
    if not camera_ids:
        return []
        
    # Query requests for these camera IDs
    requests_snap = db.collection("access_requests").where("camera_id", "in", camera_ids).get()
    
    return [AccessRequestResponse(**doc.to_dict()) for doc in requests_snap]


@router.get("/requests/police", response_model=List[AccessRequestResponse], dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def list_police_submitted_requests(current_user: dict = Depends(get_current_user)):
    """
    List all camera access requests made by this police officer.
    """
    uid = current_user.get("uid")
    requests_snap = db.collection("access_requests").where("requested_by_uid", "==", uid).get()
    return [AccessRequestResponse(**doc.to_dict()) for doc in requests_snap]


@router.put("/requests/{request_id}", response_model=AccessRequestResponse, dependencies=[Depends(RoleChecker([UserRoles.CITIZEN]))])
async def resolve_access_request(
    request_id: str,
    resolution: AccessRequestUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Citizen approves or denies a police request.
    """
    req_doc = db.collection("access_requests").document(request_id).get()
    if not req_doc.exists:
        raise HTTPException(status_code=404, detail="Access request not found.")
        
    req_data = req_doc.to_dict()
    camera_id = req_data.get("camera_id")
    
    # Check ownership
    cam_data = db.collection("cameras").document(camera_id).get().to_dict()
    if cam_data.get("owner_uid") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Unauthorized: you do not own the requested camera.")
        
    now = datetime.datetime.utcnow()
    update_data = {
        "status": resolution.status
    }
    
    if resolution.status == "Approved":
        approved_at = now.isoformat()
        expires_at = (now + datetime.timedelta(hours=req_data.get("duration_hours", 24))).isoformat()
        update_data["approved_at"] = approved_at
        update_data["expires_at"] = expires_at
    else:
        update_data["approved_at"] = None
        update_data["expires_at"] = None
        
    db.collection("access_requests").document(request_id).update(update_data)
    
    # Send Notification to requesting officer
    NotificationService.send_notification(
        user_uid=req_data.get("requested_by_uid"),
        title=f"Camera Access {resolution.status}",
        message=f"Citizen {current_user.get('full_name')} has {resolution.status.lower()} your request for camera {cam_data.get('name')}.",
        notification_type="camera_access_request"
    )
    
    # Audit log
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action=f"CAMERA_ACCESS_{resolution.status.upper()}",
        details=f"Citizen resolved request {request_id} for camera {camera_id} as {resolution.status}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    req_data.update(update_data)
    return AccessRequestResponse(**req_data)


# --- STREAMING VALIDATION ENDPOINT ---

@router.get("/{camera_id}/stream", dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def authorize_stream_view(
    camera_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Validates if the requesting officer has approved access.
    Returns the feed details, or raises 403 Forbidden.
    """
    cam_doc = db.collection("cameras").document(camera_id).get()
    if not cam_doc.exists:
        raise HTTPException(status_code=404, detail="Camera not found.")
        
    cam_data = cam_doc.to_dict()
    if cam_data.get("is_revoked", False):
        raise HTTPException(status_code=403, detail="Access denied. Owner has revoked camera sharing.")
    if cam_data.get("is_paused", False):
        raise HTTPException(status_code=403, detail="Access denied. Camera stream is temporarily paused by owner.")
        
    # Validate access requests
    uid = current_user.get("uid")
    
    # Exception: Admins can view with auto-auditing (bypass with warning)
    # But standard Officers require a valid active approval.
    requests_snap = db.collection("access_requests") \
        .where("camera_id", "==", camera_id) \
        .where("requested_by_uid", "==", uid) \
        .where("status", "==", "Approved").get()
        
    now_str = datetime.datetime.utcnow().isoformat()
    valid_access = False
    
    for doc in requests_snap:
        r_data = doc.to_dict()
        expires_at = r_data.get("expires_at")
        if expires_at and expires_at > now_str:
            valid_access = True
            break
            
    # Bypassing for Admin if no request exists, but with CRITICAL audit logs
    is_privileged_bypass = current_user.get("role") == UserRoles.ADMIN
    
    if not valid_access and not is_privileged_bypass:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. You do not have approved, active access to this camera feed."
        )
        
    # Log access audit event
    action = "CAMERA_STREAM_BYPASS" if (not valid_access and is_privileged_bypass) else "CAMERA_STREAM_VIEW"
    details = f"Officer viewed live camera: '{cam_data.get('name')}'"
    if not valid_access and is_privileged_bypass:
        details = f"PRIVILEGED BYPASS: Admin viewed camera: '{cam_data.get('name')}' without prior approved request."
        
    AuditService.log_event(
        operator_uid=uid,
        operator_email=current_user.get("email"),
        action=action,
        details=details,
        ip_address=request.client.host if request.client else "unknown"
    )
    
    # Send Notification to Citizen Owner
    NotificationService.notify_citizen_of_access(
        citizen_uid=cam_data.get("owner_uid"),
        camera_name=cam_data.get("name"),
        officer_name=current_user.get("full_name"),
        action="accessed"
    )

    return {
        "status": "Authorized",
        "stream_url": cam_data.get("stream_url"),
        "privacy_masks": cam_data.get("privacy_masks", []),
        "bypass_triggered": (not valid_access and is_privileged_bypass)
    }
