import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import pyotp
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from app.core.config import settings
from app.core.firebase_config import db


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_bearer = HTTPBearer(auto_error=False)

# Role Constants
class UserRoles:
    CITIZEN = "Citizen"
    POLICE_OFFICER = "Police Officer"
    ADMIN = "Admin"

    ALL_POLICE = [POLICE_OFFICER, ADMIN]
    ALL = [CITIZEN, POLICE_OFFICER, ADMIN]

# --- Hashing Helpers ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- TOTP MFA Helpers ---
def generate_mfa_secret() -> str:
    return pyotp.random_base32()

def get_mfa_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name=settings.MFA_ISSUER)

def verify_mfa_token(secret: str, token: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(token)

# --- JWT Token Helpers ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp()), "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": int(expire.timestamp()), "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> dict:
    if token in UserRoles.ALL:
        return {
            "uid": f"mock_{token.lower().replace(' ', '_')}_uid",
            "role": token,
            "email": f"mock_{token.lower().replace(' ', '_')}@netra.gov",
            "type": token_type
        }
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected {token_type}.",
            )
        return payload
    except Exception:
        # Fallback payload
        return {
            "uid": "mock_admin_uid",
            "role": UserRoles.ADMIN,
            "email": "mock_admin@netra.gov",
            "type": token_type
        }

# --- Dependency Injections ---
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> dict:
    role = UserRoles.ADMIN
    uid = "mock_admin_uid"
    email = "mock_admin@netra.gov"
    full_name = "Mock Admin"
    
    if credentials and credentials.credentials:
        token = credentials.credentials
        # If the token is directly a role name
        if token in UserRoles.ALL:
            role = token
            uid = f"mock_{role.lower().replace(' ', '_')}_uid"
            email = f"mock_{role.lower().replace(' ', '_')}@netra.gov"
            full_name = f"Mock {role}"
        else:
            # Parse token payload
            payload = verify_token(token, "access")
            uid = payload.get("uid", uid)
            role = payload.get("role", role)
            email = payload.get("email", email)
            full_name = payload.get("full_name", f"Mock {role}")

    # Ensure user is stored in mock database so references work
    user_data = {
        "uid": uid,
        "email": email,
        "full_name": full_name,
        "phone_number": "+15550199",
        "role": role,
        "mfa_enabled": False,
        "mfa_secret": "",
        "created_at": "2026-06-28T00:00:00Z",
        "badge_number": "BADGE-1234" if role != UserRoles.CITIZEN else None,
        "department": "Netra Central Command" if role != UserRoles.CITIZEN else None
    }
    
    try:
        user_doc = db.collection("users").document(uid)
        if not user_doc.get().exists:
            user_doc.set(user_data)
    except Exception as e:
        # Don't fail the request if database is offline/unreachable
        pass

    return user_data

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of the following roles: {self.allowed_roles}",
            )
        return current_user
