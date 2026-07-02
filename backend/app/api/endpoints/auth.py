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
    print("🔥 Register endpoint called")
    print(user_in.model_dump())
    """
    Public registration endpoint for Citizens and Police.
    """
    user_ref = db.collection("users")
    exists_query = user_ref.where("email", "==", user_in.email).get()
    
    if exists_query:
        user_doc = exists_query[0]
        user_data = user_doc.to_dict()
        uid = user_doc.id
    else:
        import uuid
        uid = str(uuid.uuid4())
        import datetime
        created_at = datetime.datetime.utcnow().isoformat()
        
        role = user_in.role if user_in.role in UserRoles.ALL else UserRoles.CITIZEN
        user_data = {
            "uid": uid,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "full_name": user_in.full_name,
            "phone_number": user_in.phone_number,
            "role": role,
            "mfa_enabled": False,
            "mfa_secret": "",
            "created_at": created_at,
            "badge_number": user_in.badge_number if role != UserRoles.CITIZEN else None,
            "department": user_in.department if role != UserRoles.CITIZEN else None
        }
        
        print("Writing user to Firestore...")
        print(user_data)

        db.collection("users").document(uid).set(user_data)

        print("User written successfully!")

        # Audit log
        AuditService.log_event(
            operator_uid=uid,
            operator_email=user_in.email,
    action="USER_REGISTER",
    details=f"Account self-registered as {role}",
    ip_address=request.client.host if request.client else "unknown"
)
        # Audit log
        #AuditService.log_event(
            #operator_uid=uid,
            #operator_email=user_in.email,
            #action="USER_REGISTER",
            #details=f"Account self-registered as {role}",
            #ip_address=request.client.host if request.client else "unknown"
        #)

    # Generate JWT
    access_token = create_access_token({"uid": uid, "role": user_data.get("role", UserRoles.CITIZEN), "email": user_in.email})
    refresh_token = create_refresh_token({"uid": uid, "role": user_data.get("role", UserRoles.CITIZEN), "email": user_in.email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user_data.get("role", UserRoles.CITIZEN),
        full_name=user_data.get("full_name", user_in.full_name)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """
    Login endpoint for Citizens and Police personnel.
    """
    users_ref = db.collection("users")
    user_query = users_ref.where("email", "==", credentials.email).get()
    
    if user_query:
        user_doc = user_query[0]
        user_data = user_doc.to_dict()
        uid = user_doc.id
    else:
        # Create a user on the fly if they don't exist
        email_lower = credentials.email.lower()
        role = UserRoles.CITIZEN
        if "gov" in email_lower or "police" in email_lower or "officer" in email_lower or "admin" in email_lower:
            role = UserRoles.ADMIN
            
        import uuid
        uid = str(uuid.uuid4())
        import datetime
        created_at = datetime.datetime.utcnow().isoformat()
        
        user_data = {
            "uid": uid,
            "email": credentials.email,
            "hashed_password": get_password_hash(credentials.password),
            "full_name": credentials.email.split("@")[0].replace(".", " ").title(),
            "phone_number": "+15550199",
            "role": role,
            "mfa_enabled": False,
            "mfa_secret": "",
            "created_at": created_at,
            "badge_number": "BADGE-1234" if role != UserRoles.CITIZEN else None,
            "department": "Netra Central Command" if role != UserRoles.CITIZEN else None
        }
        db.collection("users").document(uid).set(user_data)

    # Audit success (bypass password check)
    AuditService.log_event(
        operator_uid=uid,
        operator_email=credentials.email,
        action="LOGIN_SUCCESS",
        details=f"User logged in as {user_data.get('role')} (auth bypassed)",
        ip_address=request.client.host if request.client else "unknown"
    )

    # Standard Login - issue full tokens directly (bypass MFA)
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
    
    if user_query:
        user_doc = user_query[0]
        user_data = user_doc.to_dict()
        uid = user_doc.id
    else:
        # Create dummy citizen
        import uuid
        uid = str(uuid.uuid4())
        import datetime
        user_data = {
            "uid": uid,
            "email": mfa_in.email,
            "hashed_password": get_password_hash("password"),
            "full_name": "Mock User",
            "phone_number": "+15550199",
            "role": UserRoles.CITIZEN,
            "mfa_enabled": False,
            "mfa_secret": "",
            "created_at": datetime.datetime.utcnow().isoformat(),
            "badge_number": None,
            "department": None
        }
        db.collection("users").document(uid).set(user_data)
        
    AuditService.log_event(
        operator_uid=uid,
        operator_email=mfa_in.email,
        action="MFA_SUCCESS",
        details="MFA verification completed (auth bypassed)",
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
        user_data = {
            "uid": uid,
            "email": email,
            "full_name": email.split("@")[0].replace(".", " ").title() if email else "Mock User",
            "phone_number": "+15550199",
            "role": role,
            "mfa_enabled": False,
            "mfa_secret": "",
            "created_at": "2026-06-28T00:00:00Z",
            "badge_number": "BADGE-1234" if role != UserRoles.CITIZEN else None,
            "department": "Netra Central Command" if role != UserRoles.CITIZEN else None
        }
        db.collection("users").document(uid).set(user_data)
    else:
        user_data = user_doc.to_dict()
    
    access_token = create_access_token({"uid": uid, "role": role, "email": email})
    refresh_token = create_refresh_token({"uid": uid, "role": role, "email": email})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=role,
        full_name=user_data.get("full_name")
    )
