from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
import uuid
import datetime
from app.core.firebase_config import db
from app.core.security import (
    get_current_user, RoleChecker, UserRoles, get_password_hash,
    generate_mfa_secret, get_mfa_uri, verify_mfa_token
)
from app.services.audit_service import AuditService
from app.models.schemas import UserResponse, UserUpdate, UserCreatePolice

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get profile information for the authenticated user.
    """
    return UserResponse(
        uid=current_user.get("uid"),
        email=current_user.get("email"),
        full_name=current_user.get("full_name"),
        phone_number=current_user.get("phone_number"),
        role=current_user.get("role"),
        mfa_enabled=current_user.get("mfa_enabled", False),
        badge_number=current_user.get("badge_number"),
        department=current_user.get("department"),
        created_at=current_user.get("created_at", "")
    )


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    profile_update: UserUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Update profile data for the authenticated user (name, phone only).
    """
    uid = current_user.get("uid")
    update_data = {}
    if profile_update.full_name is not None:
        update_data["full_name"] = profile_update.full_name
    if profile_update.phone_number is not None:
        update_data["phone_number"] = profile_update.phone_number
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update.")
        
    db.collection("users").document(uid).update(update_data)
    
    # Audit log
    AuditService.log_event(
        operator_uid=uid,
        operator_email=current_user.get("email"),
        action="PROFILE_UPDATE",
        details=f"User updated profile fields: {list(update_data.keys())}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    # Fetch updated user
    updated_doc = db.collection("users").document(uid).get().to_dict()
    updated_doc["uid"] = uid
    return UserResponse(**updated_doc)


@router.post("/mfa/setup")
async def setup_mfa(current_user: dict = Depends(get_current_user)):
    """
    Generate secret key and QR code URI for authenticator registration.
    """
    uid = current_user.get("uid")
    email = current_user.get("email")
    
    secret = generate_mfa_secret()
    qr_uri = get_mfa_uri(secret, email)
    
    # Temporarily store secret in user document
    db.collection("users").document(uid).update({
        "temp_mfa_secret": secret
    })
    
    return {
        "mfa_secret": secret,
        "mfa_qr_uri": qr_uri
    }


@router.post("/mfa/enable")
async def enable_mfa(token_in: dict, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Verify and enable Multi-Factor Authentication for the user.
    """
    uid = current_user.get("uid")
    token = token_in.get("token")
    
    user_doc = db.collection("users").document(uid).get().to_dict()
    temp_secret = user_doc.get("temp_mfa_secret")
    
    if not temp_secret or not token:
        raise HTTPException(status_code=400, detail="MFA setup has not been initialized.")
        
    if not verify_mfa_token(temp_secret, token):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    # Commit MFA activation
    db.collection("users").document(uid).update({
        "mfa_enabled": True,
        "mfa_secret": temp_secret,
        "temp_mfa_secret": ""
    })
    
    AuditService.log_event(
        operator_uid=uid,
        operator_email=current_user.get("email"),
        action="MFA_ENABLED",
        details="MFA successfully activated for user",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return {"message": "Multi-Factor Authentication enabled successfully."}


@router.post("/police", response_model=UserResponse, dependencies=[Depends(RoleChecker([UserRoles.ADMIN]))])
async def create_police_account(
    police_in: UserCreatePolice,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Admin-only endpoint to create police/investigation personnel.
    """
    users_ref = db.collection("users")
    exists_query = users_ref.where("email", "==", police_in.email).get()
    if exists_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    hashed_password = get_password_hash(police_in.password)
    new_uid = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    police_data = {
        "uid": new_uid,
        "email": police_in.email,
        "hashed_password": hashed_password,
        "full_name": police_in.full_name,
        "phone_number": police_in.phone_number,
        "role": police_in.role,
        "mfa_enabled": False,
        "mfa_secret": "",
        "created_at": created_at,
        "badge_number": police_in.badge_number,
        "department": police_in.department
    }
    
    db.collection("users").document(new_uid).set(police_data)
    
    AuditService.log_event(
        operator_uid=admin_user.get("uid"),
        operator_email=admin_user.get("email"),
        action="POLICE_ACCOUNT_CREATED",
        details=f"Admin created {police_in.role} account for {police_in.email} in {police_in.department}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return UserResponse(**police_data)
