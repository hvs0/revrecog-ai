from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import RevenueRecognition, Client, Contract

router = APIRouter(prefix="/api/revenue", tags=["Revenue Recognition"])


@router.get("/recognition")
def get_revenue_recognition(db: Session = Depends(get_db)):
    """Monthly revenue recognition totals."""
    results = db.query(
        RevenueRecognition.period,
        func.sum(RevenueRecognition.recognized_revenue).label("recognized"),
        func.sum(RevenueRecognition.deferred_revenue).label("deferred"),
        func.sum(RevenueRecognition.unbilled_revenue).label("unbilled"),
        func.count(RevenueRecognition.id).label("entries"),
    ).group_by(RevenueRecognition.period).order_by(RevenueRecognition.period).all()

    # Compliance rate
    total_entries = db.query(func.count(RevenueRecognition.id)).scalar() or 0
    compliant_entries = db.query(func.count(RevenueRecognition.id)).filter(
        RevenueRecognition.asc606_compliant == True
    ).scalar() or 0

    monthly_data = []
    for row in results:
        monthly_data.append({
            "period": row.period,
            "recognized_revenue": round(row.recognized or 0, 0),
            "deferred_revenue": round(row.deferred or 0, 0),
            "unbilled_revenue": round(row.unbilled or 0, 0),
            "total_revenue": round((row.recognized or 0) + (row.deferred or 0) + (row.unbilled or 0), 0),
            "entry_count": row.entries,
        })

    return {
        "monthly": monthly_data,
        "compliance_rate": round(compliant_entries / total_entries * 100, 1) if total_entries > 0 else 0,
        "total_recognized": round(sum(m["recognized_revenue"] for m in monthly_data), 0),
        "total_deferred": round(sum(m["deferred_revenue"] for m in monthly_data), 0),
        "total_unbilled": round(sum(m["unbilled_revenue"] for m in monthly_data), 0),
    }


@router.get("/by-client")
def get_revenue_by_client(db: Session = Depends(get_db)):
    """Revenue recognition per client for current period."""
    # Get the most recent period
    latest_period = db.query(func.max(RevenueRecognition.period)).scalar()
    if not latest_period:
        return {"period": None, "clients": [], "total": 0}

    records = db.query(RevenueRecognition).filter(
        RevenueRecognition.period == latest_period
    ).all()

    result = []
    for rec in records:
        client = db.query(Client).filter(Client.id == rec.client_id).first()
        result.append({
            "client_id": rec.client_id,
            "client_name": client.name if client else "Unknown",
            "recognized_revenue": round(rec.recognized_revenue, 0),
            "deferred_revenue": round(rec.deferred_revenue, 0),
            "unbilled_revenue": round(rec.unbilled_revenue, 0),
            "asc606_compliant": rec.asc606_compliant,
            "journal_entry_ref": rec.journal_entry_ref,
        })

    # Sort by recognized revenue descending
    result.sort(key=lambda x: x["recognized_revenue"], reverse=True)

    return {
        "period": latest_period,
        "clients": result,
        "total": len(result),
        "totals": {
            "recognized": round(sum(r["recognized_revenue"] for r in result), 0),
            "deferred": round(sum(r["deferred_revenue"] for r in result), 0),
            "unbilled": round(sum(r["unbilled_revenue"] for r in result), 0),
        }
    }


@router.get("/asc606")
def get_asc606_distribution(db: Session = Depends(get_db)):
    """ASC 606 step distribution across contracts."""
    # Contract step distribution
    by_step = db.query(
        Contract.asc606_step,
        func.count(Contract.id).label("count"),
        func.sum(Contract.total_value).label("total_value"),
    ).group_by(Contract.asc606_step).all()

    step_names = {
        1: "Identify Contract",
        2: "Identify Performance Obligations",
        3: "Determine Transaction Price",
        4: "Allocate Transaction Price",
        5: "Recognize Revenue"
    }

    total_contracts = db.query(func.count(Contract.id)).scalar() or 0

    steps = []
    for row in by_step:
        steps.append({
            "step": row.asc606_step,
            "step_name": step_names.get(row.asc606_step, f"Step {row.asc606_step}"),
            "contract_count": row.count,
            "total_value": round(row.total_value or 0, 0),
            "pct": round(row.count / total_contracts * 100, 1) if total_contracts > 0 else 0,
        })

    # Revenue recognition compliance
    total_rev_entries = db.query(func.count(RevenueRecognition.id)).scalar() or 0
    compliant = db.query(func.count(RevenueRecognition.id)).filter(
        RevenueRecognition.asc606_compliant == True
    ).scalar() or 0
    non_compliant = total_rev_entries - compliant

    return {
        "total_contracts": total_contracts,
        "step_distribution": steps,
        "compliance": {
            "total_entries": total_rev_entries,
            "compliant": compliant,
            "non_compliant": non_compliant,
            "compliance_rate": round(compliant / total_rev_entries * 100, 1) if total_rev_entries > 0 else 0,
        }
    }
