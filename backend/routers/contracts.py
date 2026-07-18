from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
from models import Contract, Client

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])


class ContractCreate(BaseModel):
    contract_id: str
    client_id: int
    title: str
    billing_model: str
    total_value: float = 0.0
    monthly_value: float = 0.0
    start_date: date
    end_date: Optional[date] = None
    payment_terms: Optional[str] = None
    escalation_clause: Optional[str] = None
    performance_triggers: Optional[str] = None
    milestones: Optional[str] = None
    asc606_step: int = 1
    status: str = "active"


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    billing_model: Optional[str] = None
    total_value: Optional[float] = None
    monthly_value: Optional[float] = None
    end_date: Optional[date] = None
    payment_terms: Optional[str] = None
    escalation_clause: Optional[str] = None
    performance_triggers: Optional[str] = None
    milestones: Optional[str] = None
    asc606_step: Optional[int] = None
    status: Optional[str] = None


@router.get("/")
def get_contracts(db: Session = Depends(get_db)):
    """All contracts with client names."""
    contracts = db.query(Contract).all()
    result = []
    for c in contracts:
        client = db.query(Client).filter(Client.id == c.client_id).first()
        result.append({
            "id": c.id,
            "contract_id": c.contract_id,
            "client_id": c.client_id,
            "client_name": client.name if client else "Unknown",
            "title": c.title,
            "billing_model": c.billing_model,
            "total_value": c.total_value,
            "monthly_value": c.monthly_value,
            "start_date": str(c.start_date),
            "end_date": str(c.end_date) if c.end_date else None,
            "payment_terms": c.payment_terms,
            "escalation_clause": c.escalation_clause,
            "asc606_step": c.asc606_step,
            "status": c.status,
        })
    return {"contracts": result, "total": len(result)}


@router.get("/asc606-summary")
def get_asc606_summary(db: Session = Depends(get_db)):
    """ASC 606 compliance overview."""
    total = db.query(func.count(Contract.id)).scalar() or 0
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

    steps = []
    for row in by_step:
        steps.append({
            "step": row.asc606_step,
            "step_name": step_names.get(row.asc606_step, f"Step {row.asc606_step}"),
            "count": row.count,
            "total_value": round(row.total_value or 0, 0),
            "pct_of_total": round(row.count / total * 100, 1) if total > 0 else 0,
        })

    # Compliance rate (step 5 = fully compliant)
    fully_compliant = sum(1 for s in by_step if s.asc606_step == 5)
    compliant_count = sum(s.count for s in by_step if s.asc606_step >= 4)

    return {
        "total_contracts": total,
        "compliance_rate": round(compliant_count / total * 100, 1) if total > 0 else 0,
        "fully_recognized_count": sum(s.count for s in by_step if s.asc606_step == 5),
        "steps": steps,
    }


@router.get("/{contract_id}")
def get_contract_detail(contract_id: int, db: Session = Depends(get_db)):
    """Contract detail."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    client = db.query(Client).filter(Client.id == contract.client_id).first()

    return {
        "id": contract.id,
        "contract_id": contract.contract_id,
        "client_id": contract.client_id,
        "client_name": client.name if client else "Unknown",
        "title": contract.title,
        "billing_model": contract.billing_model,
        "total_value": contract.total_value,
        "monthly_value": contract.monthly_value,
        "start_date": str(contract.start_date),
        "end_date": str(contract.end_date) if contract.end_date else None,
        "payment_terms": contract.payment_terms,
        "escalation_clause": contract.escalation_clause,
        "performance_triggers": contract.performance_triggers,
        "milestones": contract.milestones,
        "asc606_step": contract.asc606_step,
        "status": contract.status,
        "created_at": str(contract.created_at) if contract.created_at else None,
    }


@router.post("/")
def create_contract(contract_data: ContractCreate, db: Session = Depends(get_db)):
    """Create a new contract."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == contract_data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check unique contract_id
    existing = db.query(Contract).filter(Contract.contract_id == contract_data.contract_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contract ID already exists")

    contract = Contract(
        contract_id=contract_data.contract_id,
        client_id=contract_data.client_id,
        title=contract_data.title,
        billing_model=contract_data.billing_model,
        total_value=contract_data.total_value,
        monthly_value=contract_data.monthly_value,
        start_date=contract_data.start_date,
        end_date=contract_data.end_date,
        payment_terms=contract_data.payment_terms,
        escalation_clause=contract_data.escalation_clause,
        performance_triggers=contract_data.performance_triggers,
        milestones=contract_data.milestones,
        asc606_step=contract_data.asc606_step,
        status=contract_data.status,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "contract_id": contract.contract_id, "message": "Contract created successfully"}


@router.put("/{contract_id}")
def update_contract(contract_id: int, contract_data: ContractUpdate, db: Session = Depends(get_db)):
    """Update a contract."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = contract_data.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(contract, key, value)

    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "contract_id": contract.contract_id, "message": "Contract updated successfully"}
