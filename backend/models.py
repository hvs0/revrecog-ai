from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False, default="viewer")  # admin/manager/viewer
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    password_hash = Column(String, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    industry = Column(String, nullable=False)
    geography = Column(String, nullable=False)
    billing_model = Column(String, nullable=False)  # T&M/Milestone/Retainer/Performance/Hybrid
    contract_value = Column(Float, default=0.0)
    monthly_revenue = Column(Float, default=0.0)
    monthly_cost = Column(Float, default=0.0)
    net_margin_pct = Column(Float, default=0.0)
    status = Column(String, default="active")  # active/at_risk/churned
    account_manager = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    contracts = relationship("Contract", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
    leakage_alerts = relationship("LeakageAlert", back_populates="client", cascade="all, delete-orphan")
    billable_activities = relationship("BillableActivity", back_populates="client", cascade="all, delete-orphan")
    revenue_recognitions = relationship("RevenueRecognition", back_populates="client", cascade="all, delete-orphan")
    margin_histories = relationship("MarginHistory", back_populates="client", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String, unique=True, nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String, nullable=False)
    billing_model = Column(String, nullable=False)
    total_value = Column(Float, default=0.0)
    monthly_value = Column(Float, default=0.0)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    payment_terms = Column(String, nullable=True)
    escalation_clause = Column(String, nullable=True)
    performance_triggers = Column(Text, nullable=True)  # JSON
    milestones = Column(Text, nullable=True)  # JSON
    asc606_step = Column(Integer, default=1)  # 1-5
    status = Column(String, default="active")  # active/completed/terminated
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="contracts")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    status = Column(String, default="Pending")  # Draft/Pending/Sent/Paid/Overdue/Disputed
    po_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
    billable_activities = relationship("BillableActivity", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String, nullable=True)  # NEFT/RTGS/Cheque/UPI
    reference_number = Column(String, nullable=True)
    status = Column(String, default="completed")  # completed/pending/failed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")


class BillableActivity(Base):
    __tablename__ = "billable_activities"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    activity_type = Column(String, nullable=False)  # hours/calls/meetings/deliverables
    description = Column(String, nullable=True)
    quantity = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    billed = Column(Boolean, default=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    employee_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="billable_activities")
    invoice = relationship("Invoice", back_populates="billable_activities")


class LeakageAlert(Base):
    __tablename__ = "leakage_alerts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # unbilled_hours/missed_escalation/scope_creep/undercharging
    description = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    severity = Column(String, default="medium")  # critical/high/medium/low
    status = Column(String, default="open")  # open/acknowledged/resolved
    detected_date = Column(Date, nullable=False)
    resolved_date = Column(Date, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="leakage_alerts")


class RevenueRecognition(Base):
    __tablename__ = "revenue_recognitions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    period = Column(String, nullable=False)  # YYYY-MM
    recognized_revenue = Column(Float, default=0.0)
    deferred_revenue = Column(Float, default=0.0)
    unbilled_revenue = Column(Float, default=0.0)
    asc606_compliant = Column(Boolean, default=True)
    journal_entry_ref = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="revenue_recognitions")


class MarginHistory(Base):
    __tablename__ = "margin_histories"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    period = Column(String, nullable=False)  # YYYY-MM
    revenue = Column(Float, default=0.0)
    direct_cost = Column(Float, default=0.0)
    allocated_cost = Column(Float, default=0.0)
    gross_margin_pct = Column(Float, default=0.0)
    net_margin_pct = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="margin_histories")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    description = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
