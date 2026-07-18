"""
Data Portal Router - Upload, Extract, Auto-fill, Track Changes
This is the DATA ENTRY page backend - where teams upload invoices, contracts, timesheets
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import (
    Client, Contract, Invoice, BillableActivity, LeakageAlert,
    Payment, AuditLog, RevenueRecognition
)
from extraction_engine import (
    invoice_extractor, contract_extractor, timesheet_extractor,
    extract_text_from_pdf
)
from datetime import datetime, timedelta
from typing import Optional
import json

router = APIRouter(prefix="/api/data", tags=["Data Portal"])


# ============================================================
# INVOICE UPLOAD & OCR EXTRACTION
# ============================================================

@router.post("/upload/invoice")
async def upload_invoice(
    file: UploadFile = File(...),
    client_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload invoice PDF/Image -> Extract data via OCR -> Return extracted fields.
    User can review and confirm before saving.
    """
    content = await file.read()
    filename = file.filename or "unknown"

    # Extract text based on file type
    if filename.lower().endswith('.pdf'):
        text = extract_text_from_pdf(content)
    elif filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
        # For demo - simulate OCR. In production: use pytesseract or cloud OCR
        text = _simulate_ocr_for_demo(filename)
    elif filename.lower().endswith(('.csv', '.txt')):
        text = content.decode('utf-8', errors='ignore')
    else:
        raise HTTPException(400, "Unsupported file type. Use PDF, PNG, JPG, or CSV.")

    # Run extraction algorithm
    extracted = invoice_extractor.extract_from_text(text)
    extracted["source_file"] = filename
    extracted["file_size"] = len(content)

    # Try to match client
    if client_id:
        client = db.query(Client).filter(Client.id == client_id).first()
        if client:
            extracted["client_id"] = client.id
            extracted["client_name"] = client.name
    elif extracted.get("client_name"):
        # Try fuzzy match
        client = db.query(Client).filter(
            Client.name.ilike(f"%{extracted['client_name'][:10]}%")
        ).first()
        if client:
            extracted["client_id"] = client.id

    # Log the upload
    _log_action(db, "upload", "invoice", None, f"Uploaded invoice file: {filename}")

    return {
        "status": "extracted",
        "message": "Data extracted successfully. Review and confirm to save.",
        "extracted_data": extracted,
        "next_step": "POST /api/data/confirm/invoice with the extracted data to save"
    }


@router.post("/confirm/invoice")
async def confirm_invoice(
    invoice_number: str = Form(...),
    client_id: int = Form(...),
    amount: float = Form(...),
    tax_amount: float = Form(0),
    total_amount: float = Form(...),
    issue_date: str = Form(...),
    due_date: str = Form(None),
    po_number: str = Form(None),
    notes: str = Form(None),
    db: Session = Depends(get_db)
):
    """Confirm and save extracted invoice data to database"""
    # Parse dates
    try:
        issue_dt = datetime.strptime(issue_date, "%Y-%m-%d")
    except:
        issue_dt = datetime.utcnow()

    if due_date:
        try:
            due_dt = datetime.strptime(due_date, "%Y-%m-%d")
        except:
            due_dt = issue_dt + timedelta(days=30)
    else:
        due_dt = issue_dt + timedelta(days=30)

    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=client_id,
        amount=amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        issue_date=issue_dt,
        due_date=due_dt,
        status="Pending",
        po_number=po_number,
        notes=notes,
    )
    db.add(invoice)
    db.flush()

    _log_action(db, "create", "invoice", invoice.id, f"Invoice {invoice_number} created via OCR upload for client {client_id}")
    db.commit()

    return {"id": invoice.id, "invoice_number": invoice_number, "message": "Invoice saved successfully", "status": "Pending"}


# ============================================================
# CONTRACT UPLOAD & EXTRACTION
# ============================================================

@router.post("/upload/contract")
async def upload_contract(
    file: UploadFile = File(...),
    client_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload contract PDF -> Extract billing terms, value, dates"""
    content = await file.read()
    filename = file.filename or "unknown"

    if filename.lower().endswith('.pdf'):
        text = extract_text_from_pdf(content)
    else:
        text = content.decode('utf-8', errors='ignore')

    extracted = contract_extractor.extract_from_text(text)
    extracted["source_file"] = filename

    if client_id:
        client = db.query(Client).filter(Client.id == client_id).first()
        if client:
            extracted["client_id"] = client.id
            extracted["client_name"] = client.name

    _log_action(db, "upload", "contract", None, f"Uploaded contract file: {filename}")
    db.commit()

    return {
        "status": "extracted",
        "message": "Contract data extracted. Review and confirm.",
        "extracted_data": extracted,
    }


@router.post("/confirm/contract")
async def confirm_contract(
    contract_id_str: str = Form(...),
    client_id: int = Form(...),
    title: str = Form(...),
    billing_model: str = Form(...),
    total_value: float = Form(...),
    monthly_value: float = Form(0),
    start_date: str = Form(...),
    end_date: str = Form(None),
    payment_terms: str = Form("Net 30"),
    db: Session = Depends(get_db)
):
    """Save extracted contract data"""
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    except:
        start_dt = datetime.utcnow()

    end_dt = None
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except:
            end_dt = start_dt + timedelta(days=365)

    contract = Contract(
        contract_id=contract_id_str,
        client_id=client_id,
        title=title,
        billing_model=billing_model,
        total_value=total_value,
        monthly_value=monthly_value or (total_value / 12),
        start_date=start_dt,
        end_date=end_dt,
        payment_terms=payment_terms,
        status="active",
        asc606_step=1,
    )
    db.add(contract)
    db.flush()

    _log_action(db, "create", "contract", contract.id, f"Contract {contract_id_str} created via upload")
    db.commit()

    return {"id": contract.id, "contract_id": contract_id_str, "message": "Contract saved successfully"}


# ============================================================
# TIMESHEET/BILLABLE UPLOAD (CSV/Excel)
# ============================================================

@router.post("/upload/timesheet")
async def upload_timesheet(
    file: UploadFile = File(...),
    client_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Upload CSV timesheet -> Auto-create billable activities"""
    content = await file.read()
    text = content.decode('utf-8', errors='ignore')

    items = timesheet_extractor.extract_from_csv_text(text)
    if not items:
        raise HTTPException(400, "Could not parse timesheet. Use CSV format: employee,type,quantity,rate,description,date")

    created = 0
    for item in items:
        activity = BillableActivity(
            client_id=client_id,
            activity_type=item.get("activity_type", "hours"),
            description=item.get("description", ""),
            quantity=item.get("quantity", 0),
            rate=item.get("rate", 0),
            amount=round(item.get("quantity", 0) * item.get("rate", 0), 2),
            date=datetime.utcnow(),
            billed=False,
            employee_name=item.get("employee_name", ""),
        )
        db.add(activity)
        created += 1

    _log_action(db, "bulk_import", "billable_activity", None, f"Imported {created} timesheet entries for client {client_id}")
    db.commit()

    return {
        "message": f"Imported {created} billable activities",
        "items_imported": created,
        "items_parsed": len(items),
    }


# ============================================================
# MANUAL DATA ENTRY (for any section)
# ============================================================

@router.post("/entry/billable")
async def manual_billable_entry(
    client_id: int = Form(...),
    activity_type: str = Form(...),
    description: str = Form(""),
    quantity: float = Form(...),
    rate: float = Form(...),
    employee_name: str = Form(""),
    date: str = Form(None),
    db: Session = Depends(get_db)
):
    """Manual entry of billable activity"""
    activity = BillableActivity(
        client_id=client_id,
        activity_type=activity_type,
        description=description,
        quantity=quantity,
        rate=rate,
        amount=round(quantity * rate, 2),
        date=datetime.strptime(date, "%Y-%m-%d") if date else datetime.utcnow(),
        billed=False,
        employee_name=employee_name,
    )
    db.add(activity)
    db.flush()

    _log_action(db, "create", "billable_activity", activity.id, f"Manual entry: {activity_type} - {quantity} x {rate}")
    db.commit()

    return {"id": activity.id, "amount": activity.amount, "message": "Billable activity recorded"}


@router.post("/entry/payment")
async def manual_payment_entry(
    invoice_id: int = Form(...),
    amount: float = Form(...),
    payment_method: str = Form("Bank Transfer"),
    reference_number: str = Form(""),
    payment_date: str = Form(None),
    db: Session = Depends(get_db)
):
    """Record a payment against an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    payment = Payment(
        invoice_id=invoice_id,
        amount=amount,
        payment_date=datetime.strptime(payment_date, "%Y-%m-%d") if payment_date else datetime.utcnow(),
        payment_method=payment_method,
        reference_number=reference_number,
        status="completed",
    )
    db.add(payment)

    # Update invoice status
    invoice.status = "Paid"
    invoice.paid_date = payment.payment_date

    _log_action(db, "create", "payment", None, f"Payment of Rs. {amount} recorded for invoice {invoice.invoice_number}")
    db.commit()

    return {"message": f"Payment recorded. Invoice {invoice.invoice_number} marked as Paid."}


# ============================================================
# CHANGE TRACKING - View history for any entity
# ============================================================

@router.get("/changes")
def get_change_history(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get change/audit history - filterable by entity"""
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    logs = query.limit(limit).all()
    return {
        "total": len(logs),
        "changes": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "description": log.description,
                "user": log.user_name,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


# ============================================================
# BULK OPERATIONS
# ============================================================

@router.post("/bulk/mark-billed")
async def bulk_mark_billed(
    activity_ids: str = Form(...),
    invoice_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Mark multiple billable activities as billed (link to invoice)"""
    ids = [int(i) for i in activity_ids.split(",") if i.strip().isdigit()]
    updated = 0
    for aid in ids:
        activity = db.query(BillableActivity).filter(BillableActivity.id == aid).first()
        if activity and not activity.billed:
            activity.billed = True
            activity.invoice_id = invoice_id
            updated += 1

    _log_action(db, "bulk_update", "billable_activity", None, f"Marked {updated} activities as billed for invoice {invoice_id}")
    db.commit()

    return {"message": f"{updated} activities marked as billed", "updated_count": updated}


@router.delete("/delete/{entity_type}/{entity_id}")
async def delete_entity(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    """Delete any entity with audit trail"""
    model_map = {
        "invoice": Invoice,
        "contract": Contract,
        "billable": BillableActivity,
        "alert": LeakageAlert,
    }
    model = model_map.get(entity_type)
    if not model:
        raise HTTPException(400, f"Invalid entity type: {entity_type}")

    record = db.query(model).filter(model.id == entity_id).first()
    if not record:
        raise HTTPException(404, f"{entity_type} {entity_id} not found")

    _log_action(db, "delete", entity_type, entity_id, f"Deleted {entity_type} #{entity_id}")
    db.delete(record)
    db.commit()

    return {"message": f"{entity_type} #{entity_id} deleted", "tracked": True}


# ============================================================
# HELPER
# ============================================================

def _log_action(db: Session, action: str, entity_type: str, entity_id: Optional[int], description: str):
    """Log every action for change tracking"""
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        user_name="Demo Admin",
        created_at=datetime.utcnow(),
    )
    db.add(log)


def _simulate_ocr_for_demo(filename: str) -> str:
    """Simulate OCR output for demo purposes"""
    return f"""
    INVOICE
    Invoice No: INV-2026-{datetime.now().strftime('%m%d')}
    Date: {datetime.now().strftime('%d/%m/%Y')}
    Due Date: {(datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y')}

    Bill To:
    Denave India Pvt. Ltd.
    Noida, UP

    Description                  Qty    Rate        Amount
    Telesales Services (hours)   160    1,500.00    2,40,000.00
    Field Sales (days)           22     3,500.00      77,000.00
    Digital Campaign Mgmt        1      1,50,000.00  1,50,000.00

    Subtotal:                                Rs. 4,67,000.00
    GST (18%):                               Rs.   84,060.00
    Grand Total:                             Rs. 5,51,060.00

    Payment Terms: Net 30
    Bank: HDFC Bank, A/C: 50100XXXXXXX
    GSTIN: 09AABCD1234E1Z5
    PO Number: PO-DEN-2026-0718
    """
