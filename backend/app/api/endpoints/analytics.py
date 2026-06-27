from fastapi import APIRouter, Depends
from app.core.firebase_config import db
from app.core.security import get_current_user, RoleChecker, UserRoles
from app.models.schemas import DashboardAnalytics

router = APIRouter()

@router.get("/", response_model=DashboardAnalytics, dependencies=[Depends(RoleChecker(UserRoles.ALL_POLICE))])
async def get_dashboard_analytics():
    """
    Police only: Get combined dashboard metrics.
    """
    # 1. Fetch camera counts
    cameras = db.collection("cameras").get()
    total_cameras = len(cameras)
    active_cameras = 0
    paused_cameras = 0
    revoked_cameras = 0
    
    for doc in cameras:
        cam = doc.to_dict()
        if cam.get("is_revoked", False):
            revoked_cameras += 1
        elif cam.get("is_paused", False):
            paused_cameras += 1
        else:
            active_cameras += 1

    # 2. Fetch crime reports
    reports = db.collection("reports").get()
    crime_reports = len(reports)
    
    ai_alerts_count = 0
    alert_categories = {}
    
    for r_doc in reports:
        rep = r_doc.to_dict()
        ai_res = rep.get("ai_results", {})
        alerts = ai_res.get("alerts", [])
        ai_alerts_count += len(alerts)
        
        for alert in alerts:
            cat = alert.get("type", "Suspicious Activity")
            alert_categories[cat] = alert_categories.get(cat, 0) + 1

    # 3. Fetch investigations
    cases = db.collection("cases").get()
    ongoing_investigations = 0
    for doc in cases:
        if doc.to_dict().get("status") in ["Open", "In Progress"]:
            ongoing_investigations += 1

    # 4. Generate some mock trend data for activity graph
    activity_trends = [
        {"date": "Monday", "detections": 12, "incidents": 2},
        {"date": "Tuesday", "detections": 18, "incidents": 4},
        {"date": "Wednesday", "detections": 15, "incidents": 1},
        {"date": "Thursday", "detections": 24, "incidents": 5},
        {"date": "Friday", "detections": 30, "incidents": 7},
        {"date": "Saturday", "detections": 45, "incidents": 10},
        {"date": "Sunday", "detections": 35, "incidents": 6},
    ]

    return DashboardAnalytics(
        total_cameras=total_cameras,
        active_cameras=active_cameras,
        paused_cameras=paused_cameras,
        revoked_cameras=revoked_cameras,
        crime_reports=crime_reports,
        ongoing_investigations=ongoing_investigations,
        ai_alerts_count=ai_alerts_count,
        system_health="Operational",
        activity_trends=activity_trends,
        alert_categories=alert_categories if alert_categories else {"Person Detection": 0}
    )
