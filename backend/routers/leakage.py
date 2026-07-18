from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
from models import LeakageAlert, BillableActivity, Client

router = APIRouter(prefix="/api/leakage", tags=["Revenue Leakage"])


class ResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


@router.get("/")
def get_leakage_alerts(db: Session = Depends(get_db)):
    """All leakage alerts."""
    alerts = db.query(LeakageAlert).order_by(LeakageAlert.detected_date.desc()).all()
    result = []
    for a in alerts:
        client = db.query(Client).filter(Client.id == a.client_id).first()
        result.append({
            "id": a.id,
            "client_id": a.client_id,
            "client_name": client.name if client else "Unknown",
            "alert_type": a.alert_type,
            "description": a.description,
            "amount": a.amount,
            "severity": a.severity,
            "status": a.status,
            "detected_date": str(a.detected_date),
            "resolved_date": str(a.resolved_date) if a.resolved_date else None,
            "resolution_notes": a.resolution_notes,
        })
    return {"alerts": result, "total": len(result)}


@router.get("/summary")
def get_leakage_summary(db: Session = Depends(get_db)):
    """Summary: totals, by type, recovery rate."""
    total_leakage = db.query(func.sum(LeakageAlert.amount)).filter(
        LeakageAlert.status.in_(["open", "acknowledged"])
    ).scalar() or 0

    resolved_amount = db.query(func.sum(LeakageAlert.amount)).filter(
        LeakageAlert.status == "resolved"
    ).scalar() or 0

    all_amount = db.query(func.sum(LeakageAlert.amount)).scalar() or 0
    recovery_rate = round(resolved_amount / all_amount * 100, 1) if all_amount > 0 else 0

    # By type
    by_type = db.query(
        LeakageAlert.alert_type,
        func.count(LeakageAlert.id).label("count"),
        func.sum(LeakageAlert.amount).label("total_amount"),
    ).filter(LeakageAlert.status.in_(["open", "acknowledged"])).group_by(LeakageAlert.alert_type).all()

    # By severity
    by_severity = db.query(
        LeakageAlert.severity,
        func.count(LeakageAlert.id).label("count"),
        func.sum(LeakageAlert.amount).label("total_amount"),
    ).filter(LeakageAlert.status.in_(["open", "acknowledged"])).group_by(LeakageAlert.severity).all()

    # Counts by status
    open_count = db.query(func.count(LeakageAlert.id)).filter(LeakageAlert.status == "open").scalar() or 0
    acknowledged_count = db.query(func.count(LeakageAlert.id)).filter(LeakageAlert.status == "acknowledged").scalar() or 0
    resolved_count = db.query(func.count(LeakageAlert.id)).filter(LeakageAlert.status == "resolved").scalar() or 0

    return {
        "total_open_leakage": round(total_leakage, 0),
        "total_resolved_amount": round(resolved_amount, 0),
        "recovery_rate": recovery_rate,
        "counts": {
            "open": open_count,
            "acknowledged": acknowledged_count,
            "resolved": resolved_count,
        },
        "by_type": [{"type": r.alert_type, "count": r.count, "amount": round(r.total_amount or 0, 0)} for r in by_type],
        "by_severity": [{"severity": r.severity, "count": r.count, "amount": round(r.total_amount or 0, 0)} for r in by_severity],
    }


@router.get("/unbilled")
def get_unbilled_activities(db: Session = Depends(get_db)):
    """Unbilled activities summary."""
    unbilled = db.query(BillableActivity).filter(BillableActivity.billed == False).all()

    # Group by client
    by_client = {}
    for act in unbilled:
        if act.client_id not in by_client:
            client = db.query(Client).filter(Client.id == act.client_id).first()
            by_client[act.client_id] = {
                "client_id": act.client_id,
                "client_name": client.name if client else "Unknown",
                "total_amount": 0,
                "activity_count": 0,
                "activities": [],
            }
        by_client[act.client_id]["total_amount"] += act.amount
        by_client[act.client_id]["activity_count"] += 1
        if len(by_client[act.client_id]["activities"]) < 5:  # Limit detail
            by_client[act.client_id]["activities"].append({
                "id": act.id,
                "activity_type": act.activity_type,
                "description": act.description,
                "amount": act.amount,
                "date": str(act.date),
                "employee_name": act.employee_name,
            })

    total_unbilled = sum(item["total_amount"] for item in by_client.values())

    return {
        "total_unbilled_amount": round(total_unbilled, 0),
        "total_unbilled_activities": len(unbilled),
        "by_client": sorted(by_client.values(), key=lambda x: x["total_amount"], reverse=True),
    }


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, request: ResolveRequest, db: Session = Depends(get_db)):
    """Resolve a leakage alert."""
    alert = db.query(LeakageAlert).filter(LeakageAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert already resolved")

    alert.status = "resolved"
    alert.resolved_date = date.today()
    alert.resolution_notes = request.resolution_notes or "Resolved"

    db.commit()
    return {"message": f"Alert {alert_id} resolved", "resolved_date": str(date.today())}


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Acknowledge a leakage alert."""
    alert = db.query(LeakageAlert).filter(LeakageAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status != "open":
        raise HTTPException(status_code=400, detail="Only open alerts can be acknowledged")

    alert.status = "acknowledged"
    db.commit()
    return {"message": f"Alert {alert_id} acknowledged"}
