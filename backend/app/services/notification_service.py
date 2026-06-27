import logging
from datetime import datetime, timezone
from app.core.firebase_config import db

logger = logging.getLogger("netra.notifications")
logger.setLevel(logging.INFO)

class NotificationService:
    @staticmethod
    def send_notification(user_uid: str, title: str, message: str, notification_type: str = "general"):
        """
        Saves a notification to the database for the user.
        Types: 'camera_access_request', 'camera_accessed', 'investigation_update', 'general'
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            payload = {
                "user_uid": user_uid,
                "title": title,
                "message": message,
                "type": notification_type,
                "is_read": False,
                "timestamp": timestamp
            }
            # Save to Firestore
            db.collection("notifications").add(payload)
            logger.info(f"Notification queued for user {user_uid}: [{title}] {message}")
            
            # Simulate real-time dispatch (e.g., in a production setting we could invoke WebSockets or Firebase FCM)
            return True
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False

    @staticmethod
    def notify_citizen_of_access(citizen_uid: str, camera_name: str, officer_name: str, action: str = "accessed"):
        """
        Specifically alerts a citizen that their camera was accessed or requested.
        """
        title = "CCTV Footage Request" if action == "requested" else "CCTV Footage Accessed"
        message = (
            f"Officer {officer_name} has requested access permissions to view your camera: {camera_name}."
            if action == "requested" else
            f"Officer {officer_name} has viewed/downloaded recorded footage from your camera: {camera_name}."
        )
        return NotificationService.send_notification(
            user_uid=citizen_uid,
            title=title,
            message=message,
            notification_type="camera_accessed" if action == "accessed" else "camera_access_request"
        )
