from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- AUTH & USER SCHEMAS ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone_number: str

class UserCreatePolice(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone_number: str
    badge_number: str
    department: str
    role: str = Field("Police Officer", pattern="^(Police Officer|Investigator|Supervisor|Admin)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MfaVerify(BaseModel):
    email: EmailStr
    mfa_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    mfa_required: bool = False
    mfa_secret_qr: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    uid: str
    email: str
    full_name: str
    phone_number: str
    role: str
    mfa_enabled: bool
    badge_number: Optional[str] = None
    department: Optional[str] = None
    created_at: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None

# --- CAMERA SCHEMAS ---
class Point(BaseModel):
    x: float
    y: float

class PrivacyMaskZone(BaseModel):
    points: List[Point]

class CameraCreate(BaseModel):
    name: str
    stream_url: str
    location_lat: float
    location_lng: float
    description: Optional[str] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    stream_url: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    description: Optional[str] = None
    is_paused: Optional[bool] = None
    is_revoked: Optional[bool] = None
    privacy_masks: Optional[List[PrivacyMaskZone]] = None

class CameraResponse(BaseModel):
    id: str
    owner_uid: str
    name: str
    stream_url: str
    location_lat: float
    location_lng: float
    description: Optional[str] = None
    is_paused: bool
    is_revoked: bool
    privacy_masks: List[Dict[str, Any]] = []
    created_at: str

# --- CAMERA ACCESS REQUEST SCHEMAS ---
class AccessRequestCreate(BaseModel):
    camera_id: str
    reason: str
    duration_hours: int = Field(default=24, ge=1, le=168)

class AccessRequestUpdate(BaseModel):
    status: str = Field(..., pattern="^(Approved|Denied)$")

class AccessRequestResponse(BaseModel):
    id: str
    camera_id: str
    requested_by_uid: str
    requested_by_name: str
    reason: str
    status: str
    duration_hours: int
    approved_at: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str

# --- INCIDENT REPORT SCHEMAS ---
class IncidentReportCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    incident_datetime: str
    cctv_file_url: Optional[str] = None

class IncidentReportResponse(BaseModel):
    id: str
    citizen_uid: str
    citizen_name: str
    title: str
    description: str
    category: str
    location: str
    incident_datetime: str
    video_url: Optional[str] = None
    ai_status: str  # Pending, Processing, Completed, Failed
    ai_results: Optional[Dict[str, Any]] = None
    created_at: str

# --- INVESTIGATION WORKFLOW SCHEMAS ---
class EvidenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    file_url: str
    media_type: str = Field("Image", pattern="^(Image|Video)$")

class CaseCreate(BaseModel):
    title: str
    description: str
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    linked_report_ids: List[str] = []

class CaseUpdate(BaseModel):
    status: str = Field("In Progress", pattern="^(Open|In Progress|Suspended|Closed)$")
    findings: Optional[str] = None
    assigned_to_uid: Optional[str] = None

class CaseResponse(BaseModel):
    id: str
    case_number: str
    title: str
    description: str
    status: str
    priority: str
    findings: Optional[str] = None
    created_by_uid: str
    assigned_to_uid: Optional[str] = None
    linked_reports: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []
    created_at: str

# --- AUDIT & ANALYTICS SCHEMAS ---
class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    operator_uid: str
    operator_email: str
    action: str
    details: str
    ip_address: str
    previous_hash: str
    entry_hash: str

class DashboardAnalytics(BaseModel):
    total_cameras: int
    active_cameras: int
    paused_cameras: int
    revoked_cameras: int
    crime_reports: int
    ongoing_investigations: int
    ai_alerts_count: int
    system_health: str
    activity_trends: List[Dict[str, Any]]
    alert_categories: Dict[str, int]
