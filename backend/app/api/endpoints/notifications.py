from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.core.firebase_config import db
from app.core.security import get_current_user

router = APIRouter()

@router.get("/")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """
    Get notifications for the logged-in user.
    """
    uid = current_user.get("uid")
    notifications = (
    db.collection("notifications")
    .where("user_uid", "==", uid)
    .get()
    )
    
    results = []
    for doc in notifications:
        item = doc.to_dict()
        item["id"] = doc.id
        results.append(item)
        
    return results

@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """
    Mark a notification as read.
    """
    notif_ref = db.collection("notifications").document(notification_id)
    notif_doc = notif_ref.get()
    
    if not notif_doc.exists:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif_data = notif_doc.to_dict()
    if notif_data.get("user_uid") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    notif_ref.update({"is_read": True})
    return {"message": "Notification marked as read"}
