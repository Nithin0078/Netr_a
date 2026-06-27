from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.firebase_config import db
from app.core.security import get_current_user, RoleChecker, UserRoles
from app.services.audit_service import AuditService
from app.models.schemas import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse], dependencies=[Depends(RoleChecker([UserRoles.SUPERVISOR, UserRoles.ADMIN]))])
async def get_audit_trail():
    """
    Supervisor and Admin only: Retrieve all audit logs in descending chronological order.
    """
    logs_snap = db.collection("audit_logs").order_by("timestamp", direction="DESCENDING").get()
    
    logs = []
    for doc in logs_snap:
        d = doc.to_dict()
        d["id"] = doc.id
        logs.append(AuditLogResponse(**d))
        
    return logs


@router.get("/verify", dependencies=[Depends(RoleChecker([UserRoles.SUPERVISOR, UserRoles.ADMIN]))])
async def verify_audit_ledger():
    """
    Runs block verification across the complete audit ledger database.
    """
    is_valid = AuditService.verify_ledger()
    if is_valid:
        return {"status": "Secure", "message": "All cryptographic hashes verified sequentially. Ledger is intact."}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ledger integrity check failed! Cryptographic mismatch detected."
        )
