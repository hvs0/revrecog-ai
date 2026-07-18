from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
from models import Invoice, Payment, Client

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


class InvoiceCreate(BaseModel):
    invoice_number: str
    client_id: int
    amount: float
    tax_amount: float = 0.0
    total_amount: float
    issue_date: date
    due_date: date
    status: str = "Pending"
    po_number: Optional[str] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    po_number: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def get_invoices(db: Session = Depends(get_db)):
    """All invoices with client names."""
    invoices = db.query(Invoice).order_by(Invoice.issue_date.desc()).all()
    result = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "client_name": client.name if client else "Unknown",
            "amount": inv.amount,
            "tax_amount": inv.tax_amount,
            "total_amount": inv.total_amount,
            "issue_date": str(inv.issue_date),
            "due_date": str(inv.due_date),
            "paid_date": str(inv.paid_date) if inv.paid_date else None,
            "status": inv.status,
            "po_number": inv.po_number,
        })
    return {"invoices": result, "total": len(result)}


@router.get("/summary")
def get_invoice_summary(db: Session = Depends(get_db)):
    """Invoice totals by status."""
    statuses = ["Draft", "Pending", "Sent", "Paid", "Overdue", "Disputed"]
    summary = []
    for status in statuses:
        count = db.query(func.count(Invoice.id)).filter(Invoice.status == status).scalar() or 0
        total = db.query(func.sum(Invoice.total_amount)).filter(Invoice.status == status).scalar() or 0
        summary.append({
            "status": status,
            "count": count,
            "total_amount": round(total, 0),
        })

    total_invoiced = db.query(func.sum(Invoice.total_amount)).scalar() or 0
    total_paid = db.query(func.sum(Invoice.total_amount)).filter(Invoice.status == "Paid").scalar() or 0
    total_overdue = db.query(func.sum(Invoice.total_amount)).filter(Invoice.status == "Overdue").scalar() or 0

    return {
        "by_status": summary,
        "total_invoiced": round(total_invoiced, 0),
        "total_paid": round(total_paid, 0),
        "total_overdue": round(total_overdue, 0),
        "collection_rate": round(total_paid / total_invoiced * 100, 1) if total_invoiced > 0 else 0,
    }


@router.get("/{invoice_id}")
def get_invoice_detail(invoice_id: int, db: Session = Depends(get_db)):
    """Invoice detail with payments."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    payments = db.query(Payment).filter(Payment.invoice_id == invoice.id).all()

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "client_name": client.name if client else "Unknown",
        "amount": invoice.amount,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "issue_date": str(invoice.issue_date),
        "due_date": str(invoice.due_date),
        "paid_date": str(invoice.paid_date) if invoice.paid_date else None,
        "status": invoice.status,
        "po_number": invoice.po_number,
        "notes": invoice.notes,
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "payment_date": str(p.payment_date),
                "payment_method": p.payment_method,
                "reference_number": p.reference_number,
                "status": p.status,
            } for p in payments
        ],
        "total_paid": sum(p.amount for p in payments),
        "balance_due": invoice.total_amount - sum(p.amount for p in payments),
    }


@router.post("/")
def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db)):
    """Create a new invoice."""
    # Verify client
    client = db.query(Client).filter(Client.id == invoice_data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check unique invoice number
    existing = db.query(Invoice).filter(Invoice.invoice_number == invoice_data.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists")

    invoice = Invoice(
        invoice_number=invoice_data.invoice_number,
        client_id=invoice_data.client_id,
        amount=invoice_data.amount,
        tax_amount=invoice_data.tax_amount,
        total_amount=invoice_data.total_amount,
        issue_date=invoice_data.issue_date,
        due_date=invoice_data.due_date,
        status=invoice_data.status,
        po_number=invoice_data.po_number,
        notes=invoice_data.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"id": invoice.id, "invoice_number": invoice.invoice_number, "message": "Invoice created successfully"}


@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid(invoice_id: int, db: Session = Depends(get_db)):
    """Mark an invoice as paid."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == "Paid":
        raise HTTPException(status_code=400, detail="Invoice already marked as paid")

    invoice.status = "Paid"
    invoice.paid_date = date.today()

    # Create payment record
    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.total_amount,
        payment_date=date.today(),
        payment_method="NEFT",
        reference_number=f"REF-AUTO-{invoice.id}",
        status="completed",
    )
    db.add(payment)
    db.commit()

    return {"message": f"Invoice {invoice.invoice_number} marked as paid", "paid_date": str(date.today())}


@router.put("/{invoice_id}")
def update_invoice(invoice_id: int, invoice_data: InvoiceUpdate, db: Session = Depends(get_db)):
    """Update an invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = invoice_data.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)
    return {"id": invoice.id, "invoice_number": invoice.invoice_number, "message": "Invoice updated successfully"}
