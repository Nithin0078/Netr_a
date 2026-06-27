import datetime
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.core.firebase_config import db
from app.core.security import get_current_user, RoleChecker, UserRoles
from app.services.audit_service import AuditService
from app.models.schemas import CaseCreate, CaseUpdate, CaseResponse, EvidenceCreate

router = APIRouter()

@router.post("/cases", response_model=CaseResponse, dependencies=[Depends(RoleChecker([UserRoles.SUPERVISOR, UserRoles.ADMIN]))])
async def create_investigation_case(
    case_in: CaseCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Supervisor or Admin creates a new criminal investigation case.
    """
    case_id = str(uuid.uuid4())
    case_number = f"CASE-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    created_at = datetime.datetime.utcnow().isoformat()
    
    # Resolve linked reports metadata if any
    linked_reports = []
    for report_id in case_in.linked_report_ids:
        report_doc = db.collection("reports").document(report_id).get()
        if report_doc.exists:
            rep_data = report_doc.to_dict()
            linked_reports.append({
                "id": report_id,
                "title": rep_data.get("title"),
                "category": rep_data.get("category"),
                "citizen_name": rep_data.get("citizen_name")
            })
            
    case_data = {
        "id": case_id,
        "case_number": case_number,
        "title": case_in.title,
        "description": case_in.description,
        "status": "Open",
        "priority": case_in.priority,
        "findings": None,
        "created_by_uid": current_user.get("uid"),
        "assigned_to_uid": None,
        "linked_reports": linked_reports,
        "evidence": [],
        "created_at": created_at
    }
    
    db.collection("cases").document(case_id).set(case_data)
    
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="CASE_CREATE",
        details=f"Created investigation {case_number}: '{case_in.title}'",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return CaseResponse(**case_data)


@router.get("/cases", response_model=List[CaseResponse], dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def list_cases(current_user: dict = Depends(get_current_user)):
    """
    List all ongoing public safety cases.
    """
    cases_snap = db.collection("cases").get()
    return [CaseResponse(**doc.to_dict()) for doc in cases_snap]


@router.get("/cases/{case_id}", response_model=CaseResponse, dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def get_case_details(
    case_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all info on a specific case, audit logged.
    """
    case_doc = db.collection("cases").document(case_id).get()
    if not case_doc.exists:
        raise HTTPException(status_code=404, detail="Case not found.")
        
    case_data = case_doc.to_dict()
    
    # Audit log access
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="CASE_VIEW",
        details=f"Viewed case file {case_data.get('case_number')}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    return CaseResponse(**case_data)


@router.put("/cases/{case_id}", response_model=CaseResponse, dependencies=[Depends(RoleChecker([UserRoles.INVESTIGATOR, UserRoles.SUPERVISOR, UserRoles.ADMIN]))])
async def update_case(
    case_id: str,
    case_update: CaseUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Update case parameters (assigned investigator, status, notes).
    """
    case_doc = db.collection("cases").document(case_id).get()
    if not case_doc.exists:
        raise HTTPException(status_code=404, detail="Case not found.")
        
    case_data = case_doc.to_dict()
    
    update_data = {}
    if case_update.status is not None:
        update_data["status"] = case_update.status
    if case_update.findings is not None:
        update_data["findings"] = case_update.findings
    if case_update.assigned_to_uid is not None:
        # Verify investigator exists
        inv_doc = db.collection("users").document(case_update.assigned_to_uid).get()
        if not inv_doc.exists:
            raise HTTPException(status_code=404, detail="Assigned investigator account not found.")
        update_data["assigned_to_uid"] = case_update.assigned_to_uid

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update.")
        
    db.collection("cases").document(case_id).update(update_data)
    
    # Audit logging
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="CASE_UPDATE",
        details=f"Updated investigation case {case_data.get('case_number')}: {list(update_data.keys())}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    # Fetch updated details
    updated_doc = db.collection("cases").document(case_id).get().to_dict()
    return CaseResponse(**updated_doc)


@router.post("/cases/{case_id}/evidence", response_model=CaseResponse, dependencies=[Depends(RoleChecker([UserRoles.INVESTIGATOR, UserRoles.SUPERVISOR, UserRoles.ADMIN]))])
async def add_evidence_to_case(
    case_id: str,
    evidence_in: EvidenceCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and link forensic evidence (video/images) to an ongoing case.
    """
    case_doc = db.collection("cases").document(case_id).get()
    if not case_doc.exists:
        raise HTTPException(status_code=404, detail="Case not found.")
        
    case_data = case_doc.to_dict()
    
    evidence_item = {
        "id": str(uuid.uuid4()),
        "name": evidence_in.name,
        "description": evidence_in.description,
        "file_url": evidence_in.file_url,
        "media_type": evidence_in.media_type,
        "uploaded_by": current_user.get("full_name"),
        "uploaded_at": datetime.datetime.utcnow().isoformat()
    }
    
    # Update array in Firestore
    current_evidence = case_data.get("evidence", [])
    current_evidence.append(evidence_item)
    
    db.collection("cases").document(case_id).update({
        "evidence": current_evidence
    })
    
    AuditService.log_event(
        operator_uid=current_user.get("uid"),
        operator_email=current_user.get("email"),
        action="EVIDENCE_ADD",
        details=f"Added evidence '{evidence_in.name}' to case {case_data.get('case_number')}",
        ip_address=request.client.host if request.client else "unknown"
    )
    
    case_data["evidence"] = current_evidence
    return CaseResponse(**case_data)
