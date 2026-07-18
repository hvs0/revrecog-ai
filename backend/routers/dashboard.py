from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Client, Contract, Invoice, LeakageAlert, RevenueRecognition, MarginHistory, BillableActivity

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """KPIs: contract value, revenue, leakage, margins, clients."""
    total_contract_value = db.query(func.sum(Client.contract_value)).scalar() or 0
    total_monthly_revenue = db.query(func.sum(Client.monthly_revenue)).scalar() or 0
    total_monthly_cost = db.query(func.sum(Client.monthly_cost)).scalar() or 0
    active_clients = db.query(func.count(Client.id)).filter(Client.status == "active").scalar() or 0
    at_risk_clients = db.query(func.count(Client.id)).filter(Client.status == "at_risk").scalar() or 0
    total_clients = db.query(func.count(Client.id)).scalar() or 0

    # Leakage
    open_leakage = db.query(func.sum(LeakageAlert.amount)).filter(
        LeakageAlert.status.in_(["open", "acknowledged"])
    ).scalar() or 0
    open_alerts_count = db.query(func.count(LeakageAlert.id)).filter(
        LeakageAlert.status.in_(["open", "acknowledged"])
    ).scalar() or 0

    # Average margin
    avg_margin = db.query(func.avg(Client.net_margin_pct)).scalar() or 0

    # Unbilled activities
    unbilled_amount = db.query(func.sum(BillableActivity.amount)).filter(
        BillableActivity.billed == False
    ).scalar() or 0

    # Invoice collection
    paid_amount = db.query(func.sum(Invoice.total_amount)).filter(Invoice.status == "Paid").scalar() or 0
    total_invoiced = db.query(func.sum(Invoice.total_amount)).scalar() or 0
    collection_rate = round((paid_amount / total_invoiced * 100), 1) if total_invoiced > 0 else 0

    return {
        "total_contract_value": round(total_contract_value, 0),
        "monthly_revenue": round(total_monthly_revenue, 0),
        "monthly_cost": round(total_monthly_cost, 0),
        "net_margin_pct": round((total_monthly_revenue - total_monthly_cost) / total_monthly_revenue * 100, 1) if total_monthly_revenue > 0 else 0,
        "avg_client_margin": round(avg_margin, 1),
        "total_clients": total_clients,
        "active_clients": active_clients,
        "at_risk_clients": at_risk_clients,
        "open_leakage_amount": round(open_leakage, 0),
        "open_alerts_count": open_alerts_count,
        "unbilled_amount": round(unbilled_amount, 0),
        "collection_rate": collection_rate,
        "paid_amount": round(paid_amount, 0),
        "total_invoiced": round(total_invoiced, 0),
    }


@router.get("/profitability-snapshot")
def get_profitability_snapshot(db: Session = Depends(get_db)):
    """Quartile analysis of client profitability."""
    clients = db.query(Client).all()
    margins = sorted([c.net_margin_pct for c in clients])
    n = len(margins)

    # Quartile boundaries
    q1 = margins[n // 4] if n >= 4 else (margins[0] if n > 0 else 0)
    q2 = margins[n // 2] if n >= 2 else (margins[0] if n > 0 else 0)
    q3 = margins[3 * n // 4] if n >= 4 else (margins[-1] if n > 0 else 0)

    # Categorize clients
    categories = {"high_margin": [], "healthy": [], "watch": [], "critical": []}
    for c in clients:
        entry = {"id": c.id, "name": c.name, "margin": round(c.net_margin_pct, 1), "revenue": c.monthly_revenue}
        if c.net_margin_pct >= 25:
            categories["high_margin"].append(entry)
        elif c.net_margin_pct >= 15:
            categories["healthy"].append(entry)
        elif c.net_margin_pct >= 10:
            categories["watch"].append(entry)
        else:
            categories["critical"].append(entry)

    return {
        "quartiles": {"q1": round(q1, 1), "q2_median": round(q2, 1), "q3": round(q3, 1)},
        "categories": categories,
        "summary": {
            "high_margin_count": len(categories["high_margin"]),
            "healthy_count": len(categories["healthy"]),
            "watch_count": len(categories["watch"]),
            "critical_count": len(categories["critical"]),
        }
    }


@router.get("/monthly-trends")
def get_monthly_trends(db: Session = Depends(get_db)):
    """Grouped revenue/cost/margin by period from margin history."""
    results = db.query(
        MarginHistory.period,
        func.sum(MarginHistory.revenue).label("revenue"),
        func.sum(MarginHistory.direct_cost).label("direct_cost"),
        func.sum(MarginHistory.allocated_cost).label("allocated_cost"),
    ).group_by(MarginHistory.period).order_by(MarginHistory.period).all()

    trends = []
    for row in results:
        total_cost = (row.direct_cost or 0) + (row.allocated_cost or 0)
        revenue = row.revenue or 0
        margin_pct = round((revenue - total_cost) / revenue * 100, 1) if revenue > 0 else 0
        trends.append({
            "period": row.period,
            "revenue": round(revenue, 0),
            "direct_cost": round(row.direct_cost or 0, 0),
            "allocated_cost": round(row.allocated_cost or 0, 0),
            "total_cost": round(total_cost, 0),
            "margin_pct": margin_pct
        })

    return {"trends": trends}


@router.get("/billing-breakdown")
def get_billing_breakdown(db: Session = Depends(get_db)):
    """Revenue breakdown by billing model."""
    results = db.query(
        Client.billing_model,
        func.count(Client.id).label("client_count"),
        func.sum(Client.monthly_revenue).label("total_revenue"),
        func.avg(Client.net_margin_pct).label("avg_margin"),
    ).group_by(Client.billing_model).all()

    breakdown = []
    for row in results:
        breakdown.append({
            "billing_model": row.billing_model,
            "client_count": row.client_count,
            "total_revenue": round(row.total_revenue or 0, 0),
            "avg_margin": round(row.avg_margin or 0, 1),
        })

    return {"breakdown": breakdown}


@router.get("/alerts-summary")
def get_alerts_summary(db: Session = Depends(get_db)):
    """Alert counts by type and severity."""
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
    ).filter(LeakageAlert.status.in_(["open", "acknowledged"])).group_by(LeakageAlert.severity).all()

    total_open = db.query(func.count(LeakageAlert.id)).filter(
        LeakageAlert.status.in_(["open", "acknowledged"])
    ).scalar() or 0

    return {
        "total_open_alerts": total_open,
        "by_type": [{"type": r.alert_type, "count": r.count, "amount": round(r.total_amount or 0, 0)} for r in by_type],
        "by_severity": [{"severity": r.severity, "count": r.count} for r in by_severity],
    }
