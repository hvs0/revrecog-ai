from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
from models import Client, MarginHistory, LeakageAlert, Setting

router = APIRouter(prefix="/api/clients", tags=["Clients"])


class ClientCreate(BaseModel):
    name: str
    industry: str
    geography: str
    billing_model: str
    contract_value: float = 0.0
    monthly_revenue: float = 0.0
    monthly_cost: float = 0.0
    net_margin_pct: float = 0.0
    status: str = "active"
    account_manager: Optional[str] = None
    start_date: Optional[date] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    geography: Optional[str] = None
    billing_model: Optional[str] = None
    contract_value: Optional[float] = None
    monthly_revenue: Optional[float] = None
    monthly_cost: Optional[float] = None
    net_margin_pct: Optional[float] = None
    status: Optional[str] = None
    account_manager: Optional[str] = None


@router.get("/")
def get_clients(db: Session = Depends(get_db)):
    """All clients with profitability metrics."""
    clients = db.query(Client).all()
    result = []
    for c in clients:
        open_alerts = db.query(func.count(LeakageAlert.id)).filter(
            LeakageAlert.client_id == c.id,
            LeakageAlert.status.in_(["open", "acknowledged"])
        ).scalar() or 0

        result.append({
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "geography": c.geography,
            "billing_model": c.billing_model,
            "contract_value": c.contract_value,
            "monthly_revenue": c.monthly_revenue,
            "monthly_cost": c.monthly_cost,
            "net_margin_pct": round(c.net_margin_pct, 1),
            "status": c.status,
            "account_manager": c.account_manager,
            "start_date": str(c.start_date) if c.start_date else None,
            "open_alerts": open_alerts,
        })
    return {"clients": result, "total": len(result)}


@router.get("/at-risk")
def get_at_risk_clients(db: Session = Depends(get_db)):
    """Clients below margin threshold with AI recommendations."""
    # Get threshold from settings
    threshold_setting = db.query(Setting).filter(Setting.key == "margin_threshold").first()
    threshold = float(threshold_setting.value) if threshold_setting else 12.0

    at_risk = db.query(Client).filter(
        (Client.net_margin_pct < threshold) | (Client.status == "at_risk")
    ).all()

    result = []
    for c in at_risk:
        # Get recent margin trend
        recent_margins = db.query(MarginHistory).filter(
            MarginHistory.client_id == c.id
        ).order_by(MarginHistory.period.desc()).limit(3).all()

        margin_trend = "stable"
        if len(recent_margins) >= 2:
            if recent_margins[0].net_margin_pct < recent_margins[1].net_margin_pct:
                margin_trend = "declining"
            elif recent_margins[0].net_margin_pct > recent_margins[1].net_margin_pct:
                margin_trend = "improving"

        # AI recommendations based on analysis
        recommendations = []
        if c.net_margin_pct < 8:
            recommendations.append("URGENT: Consider contract renegotiation or scope reduction")
        if c.billing_model == "T&M" and c.net_margin_pct < 15:
            recommendations.append("Switch to hybrid/retainer model to improve predictability")
        if margin_trend == "declining":
            recommendations.append("Schedule QBR to address margin erosion")

        open_leakage = db.query(func.sum(LeakageAlert.amount)).filter(
            LeakageAlert.client_id == c.id,
            LeakageAlert.status.in_(["open", "acknowledged"])
        ).scalar() or 0
        if open_leakage > 0:
            recommendations.append(f"Recover ₹{open_leakage:,.0f} in identified revenue leakage")

        if not recommendations:
            recommendations.append("Monitor closely - margin near threshold")

        result.append({
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "billing_model": c.billing_model,
            "net_margin_pct": round(c.net_margin_pct, 1),
            "monthly_revenue": c.monthly_revenue,
            "margin_trend": margin_trend,
            "status": c.status,
            "account_manager": c.account_manager,
            "open_leakage_amount": round(open_leakage, 0),
            "recommendations": recommendations,
        })

    return {
        "threshold": threshold,
        "at_risk_clients": result,
        "total": len(result)
    }


@router.get("/{client_id}")
def get_client_detail(client_id: int, db: Session = Depends(get_db)):
    """Client detail with margin history and leakage alerts."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Margin history
    margin_history = db.query(MarginHistory).filter(
        MarginHistory.client_id == client_id
    ).order_by(MarginHistory.period).all()

    # Leakage alerts
    alerts = db.query(LeakageAlert).filter(
        LeakageAlert.client_id == client_id
    ).order_by(LeakageAlert.detected_date.desc()).all()

    return {
        "id": client.id,
        "name": client.name,
        "industry": client.industry,
        "geography": client.geography,
        "billing_model": client.billing_model,
        "contract_value": client.contract_value,
        "monthly_revenue": client.monthly_revenue,
        "monthly_cost": client.monthly_cost,
        "net_margin_pct": round(client.net_margin_pct, 1),
        "status": client.status,
        "account_manager": client.account_manager,
        "start_date": str(client.start_date) if client.start_date else None,
        "margin_history": [
            {
                "period": mh.period,
                "revenue": round(mh.revenue, 0),
                "direct_cost": round(mh.direct_cost, 0),
                "allocated_cost": round(mh.allocated_cost, 0),
                "gross_margin_pct": round(mh.gross_margin_pct, 1),
                "net_margin_pct": round(mh.net_margin_pct, 1),
            } for mh in margin_history
        ],
        "leakage_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "description": a.description,
                "amount": a.amount,
                "severity": a.severity,
                "status": a.status,
                "detected_date": str(a.detected_date),
            } for a in alerts
        ],
    }


@router.post("/")
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    """Create a new client."""
    client = Client(
        name=client_data.name,
        industry=client_data.industry,
        geography=client_data.geography,
        billing_model=client_data.billing_model,
        contract_value=client_data.contract_value,
        monthly_revenue=client_data.monthly_revenue,
        monthly_cost=client_data.monthly_cost,
        net_margin_pct=client_data.net_margin_pct,
        status=client_data.status,
        account_manager=client_data.account_manager,
        start_date=client_data.start_date,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return {"id": client.id, "name": client.name, "message": "Client created successfully"}


@router.put("/{client_id}")
def update_client(client_id: int, client_data: ClientUpdate, db: Session = Depends(get_db)):
    """Update a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = client_data.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return {"id": client.id, "name": client.name, "message": "Client updated successfully"}


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()
    return {"message": f"Client '{client.name}' deleted successfully"}
