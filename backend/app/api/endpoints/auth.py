from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.core.config import settings
from app.core.firebase_config import db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    verify_token, generate_mfa_secret, get_mfa_uri, verify_mfa_token, UserRoles
)
from app.services.audit_service import AuditService
from app.models.schemas import UserRegister, UserLogin, MfaVerify, TokenResponse, RefreshTokenRequest

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register_citizen(user_in: UserRegister, request: Request):
    """
    Public registration endpoint for Citizens.
    """
    # Check if user already exists
    user_ref = db.collection("users")
    exists_query = user_ref.where("email", "==", user_in.email).get()
    if exists_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Hash password
    hashed_password = get_password_hash(user_in.password)
    
    # Store citizen user
    import uuid
    uid = str(uuid.uuid4())
    import datetime
    created_at = datetime.datetime.utcnow().isoformat()
    
    user_data = {
        "uid": uid,
        "email": user_in.email,
        "hashed_password": hashed_password,
        "full_name": user_in.full_name,
        "phone_number": user_in.phone_number,
        "role": UserRoles.CITIZEN,
        "mfa_enabled": False,
        "mfa_secret": "",
        "created_at": created_at,
        "badge_number": None,
        "department": None
    }
    
    db.collection("users").document(uid).set(user_data)
    
    # Audit log
    AuditService.log_event(
        operator_uid=uid,
        operator_email=user_in.email,
        action="USER_REGISTER",
        details="Citizen account self-registered",
        ip_address=request.client.host if request.client else "unknown"
    )

    # Generate JWT
    access_token = create_access_token({"uid": uid, "role": UserRoles.CITIZEN, "email": user_in.email})
    refresh_token = create_refresh_token({"uid": uid, "role": UserRoles.CITIZEN, "email": user_in.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=UserRoles.CITIZEN,
        full_name=user_in.full_name
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """
    Login endpoint for Citizens and Police personnel.
    """
    users_ref = db.collection("users")
    user_query = users_ref.where("email", "==", credentials.email).get()
    
    if not user_query:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    user_doc = user_query[0]
    user_data = user_doc.to_dict()
    uid = user_doc.id

    if not verify_password(credentials.password, user_data.get("hashed_password", "")):
        # Audit fail
        AuditService.log_event(
            operator_uid="unknown",
            operator_email=credentials.email,
            action="LOGIN_FAILED",
            details="Invalid password attempt",
            ip_address=request.client.host if request.client else "unknown"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Audit success
    AuditService.log_event(
        operator_uid=uid,
        operator_email=credentials.email,
        action="LOGIN_SUCCESS",
        details=f"User logged in as {user_data.get('role')}",
        ip_address=request.client.host if request.client else "unknown"
    )

    # Check Multi-Factor Authentication
    if user_data.get("mfa_enabled", False):
        # Return partial session token for verification
        temp_token = create_access_token(
            {"uid": uid, "role": user_data.get("role"), "email": credentials.email},
            expires_delta=timedelta(minutes=5)
        )
        return TokenResponse(
            access_token=temp_token,
            refresh_token="",
            role=user_data.get("role"),
            full_name=user_data.get("full_name"),
            mfa_required=True
        )

    # Standard Login - issue full tokens
    access_token = create_access_token({"uid": uid, "role": user_data.get("role"), "email": credentials.email})
    refresh_token = create_refresh_token({"uid": uid, "role": user_data.get("role"), "email": credentials.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user_data.get("role"),
        full_name=user_data.get("full_name")
    )


@router.post("/verify-mfa", response_model=TokenResponse)
async def verify_mfa(mfa_in: MfaVerify, request: Request):
    """
    Verifies a TOTP token and issues full sessions tokens.
    """
    users_ref = db.collection("users")
    user_query = users_ref.where("email", "==", mfa_in.email).get()
    
    if not user_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
        
    user_doc = user_query[0]
    user_data = user_doc.to_dict()
    uid = user_doc.id
    
    mfa_secret = user_data.get("mfa_secret")
    if not mfa_secret or not verify_mfa_token(mfa_secret, mfa_in.mfa_token):
        AuditService.log_event(
            operator_uid=uid,
            operator_email=mfa_in.email,
            action="MFA_FAILED",
            details="Invalid MFA code entered",
            ip_address=request.client.host if request.client else "unknown"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA verification code"
        )
        
    AuditService.log_event(
        operator_uid=uid,
        operator_email=mfa_in.email,
        action="MFA_SUCCESS",
        details="MFA verification completed",
        ip_address=request.client.host if request.client else "unknown"
    )

    access_token = create_access_token({"uid": uid, "role": user_data.get("role"), "email": mfa_in.email})
    refresh_token = create_refresh_token({"uid": uid, "role": user_data.get("role"), "email": mfa_in.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user_data.get("role"),
        full_name=user_data.get("full_name")
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_req: RefreshTokenRequest):
    """
    Acquire new access tokens via a valid refresh token.
    """
    payload = verify_token(refresh_req.refresh_token, "refresh")
    uid = payload.get("uid")
    role = payload.get("role")
    email = payload.get("email")
    
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
         raise HTTPException(status_code=401, detail="User account not found")
         
    user_data = user_doc.to_dict()
    
    access_token = create_access_token({"uid": uid, "role": role, "email": email})
    refresh_token = create_refresh_token({"uid": uid, "role": role, "email": email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=role,
        full_name=user_data.get("full_name")
    )
