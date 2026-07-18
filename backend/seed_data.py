import random
import json
from datetime import date, datetime, timedelta
from database import SessionLocal, engine, Base
from models import (
    User, Client, Contract, Invoice, Payment, BillableActivity,
    LeakageAlert, RevenueRecognition, MarginHistory, Setting, AuditLog
)

random.seed(42)

# ==================== CLIENT DATA ====================
CLIENT_DATA = [
    {"name": "HDFC Bank", "industry": "Banking & Finance", "geography": "Mumbai", "billing_model": "Retainer", "margin": 28},
    {"name": "ICICI Prudential", "industry": "Insurance", "geography": "Mumbai", "billing_model": "T&M", "margin": 22},
    {"name": "Maruti Suzuki", "industry": "Automotive", "geography": "Delhi NCR", "billing_model": "Performance", "margin": 18},
    {"name": "Airtel", "industry": "Telecom", "geography": "Delhi NCR", "billing_model": "Hybrid", "margin": 24},
    {"name": "Jio Platforms", "industry": "Telecom", "geography": "Mumbai", "billing_model": "Milestone", "margin": 32},
    {"name": "Flipkart", "industry": "E-Commerce", "geography": "Bangalore", "billing_model": "T&M", "margin": 15},
    {"name": "Amazon India", "industry": "E-Commerce", "geography": "Bangalore", "billing_model": "Performance", "margin": 12},
    {"name": "Tata Motors", "industry": "Automotive", "geography": "Mumbai", "billing_model": "Retainer", "margin": 20},
    {"name": "Infosys BPO", "industry": "IT Services", "geography": "Bangalore", "billing_model": "T&M", "margin": 8},
    {"name": "Wipro Digital", "industry": "IT Services", "geography": "Bangalore", "billing_model": "Milestone", "margin": 6},
    {"name": "Sun Pharma", "industry": "Pharmaceuticals", "geography": "Mumbai", "billing_model": "Retainer", "margin": 26},
    {"name": "Kotak AMC", "industry": "Banking & Finance", "geography": "Mumbai", "billing_model": "Hybrid", "margin": 30},
    {"name": "Axis Bank", "industry": "Banking & Finance", "geography": "Mumbai", "billing_model": "T&M", "margin": 19},
    {"name": "Reliance Retail", "industry": "Retail", "geography": "Mumbai", "billing_model": "Performance", "margin": 16},
    {"name": "HUL", "industry": "FMCG", "geography": "Mumbai", "billing_model": "Retainer", "margin": 25},
    {"name": "ITC Foods", "industry": "FMCG", "geography": "Kolkata", "billing_model": "Milestone", "margin": 21},
    {"name": "Bajaj Finance", "industry": "Banking & Finance", "geography": "Pune", "billing_model": "Hybrid", "margin": 27},
    {"name": "Tech Mahindra", "industry": "IT Services", "geography": "Pune", "billing_model": "T&M", "margin": 10},
]

ACCOUNT_MANAGERS = [
    "Rajesh Kumar", "Priya Sharma", "Ankit Patel", "Sneha Reddy",
    "Vikram Singh", "Neha Gupta", "Arjun Menon", "Kavita Joshi"
]

EMPLOYEE_NAMES = [
    "Arun Verma", "Priya Nair", "Siddharth Rao", "Meera Iyer",
    "Karthik Subramaniam", "Divya Krishnan", "Rohit Agarwal", "Anjali Desai",
    "Manish Tiwari", "Pooja Hegde", "Rahul Deshpande", "Swati Mishra",
    "Deepak Pandey", "Ritu Bhatt", "Amit Saxena", "Nisha Kapoor",
    "Suresh Pillai", "Kavitha Rajan", "Gaurav Malhotra", "Shruti Bose"
]

ACTIVITY_DESCRIPTIONS = {
    "hours": [
        "Campaign setup and configuration", "Lead qualification calls",
        "Database management and cleaning", "Performance report generation",
        "Client strategy session", "Training session delivery",
        "Quality audit and compliance check", "Process optimization work",
        "Dashboard development", "Data analytics and insights"
    ],
    "calls": [
        "Client escalation call", "Weekly status update",
        "Campaign review discussion", "New requirement gathering",
        "Stakeholder alignment call", "Performance review call"
    ],
    "meetings": [
        "QBR presentation", "Campaign kickoff meeting",
        "Process improvement workshop", "Training needs assessment",
        "Vendor coordination meeting", "Strategy planning session"
    ],
    "deliverables": [
        "Monthly performance report", "Campaign analytics deck",
        "ROI analysis document", "Process SOP documentation",
        "Training material development", "Competitive intelligence report"
    ]
}


def generate_seed_data():
    """Generate all seed data for RevRecog AI + ClientMargin360."""
    db = SessionLocal()
    try:
        # ==================== USERS ====================
        users = [
            User(
                username="admin",
                full_name="Sanjay Mehta",
                email="sanjay.mehta@denave.com",
                role="admin",
                department="Finance",
                is_active=True,
                password_hash="$2b$12$LJ3m4ks9xKq5Z8v2N1W3xOQHfGz1r3k4J5m6N7p8Q9r0S1t2U3v4",
                last_login=datetime(2026, 7, 18, 9, 30),
                created_at=datetime(2025, 1, 15)
            ),
            User(
                username="finance_mgr",
                full_name="Aditi Jain",
                email="aditi.jain@denave.com",
                role="manager",
                department="Finance & Accounts",
                is_active=True,
                password_hash="$2b$12$KJ3m4ks9xKq5Z8v2N1W3xOQHfGz1r3k4J5m6N7p8Q9r0S1t2U3v4",
                last_login=datetime(2026, 7, 17, 14, 45),
                created_at=datetime(2025, 2, 1)
            ),
            User(
                username="viewer",
                full_name="Rahul Kapoor",
                email="rahul.kapoor@denave.com",
                role="viewer",
                department="Operations",
                is_active=True,
                password_hash="$2b$12$MJ3m4ks9xKq5Z8v2N1W3xOQHfGz1r3k4J5m6N7p8Q9r0S1t2U3v4",
                last_login=datetime(2026, 7, 16, 11, 0),
                created_at=datetime(2025, 3, 10)
            ),
        ]
        db.add_all(users)
        db.flush()

        # ==================== CLIENTS ====================
        clients = []
        for i, cd in enumerate(CLIENT_DATA):
            margin = cd["margin"]
            # Calculate revenue/cost from margin
            monthly_rev = random.randint(15, 85) * 100000  # 15L to 85L
            monthly_cost = monthly_rev * (1 - margin / 100)
            contract_value = monthly_rev * random.randint(12, 36)

            status = "active"
            if margin < 10:
                status = "at_risk"
            elif random.random() < 0.05:
                status = "churned"

            client = Client(
                name=cd["name"],
                industry=cd["industry"],
                geography=cd["geography"],
                billing_model=cd["billing_model"],
                contract_value=round(contract_value, 0),
                monthly_revenue=round(monthly_rev, 0),
                monthly_cost=round(monthly_cost, 0),
                net_margin_pct=margin + random.uniform(-2, 2),
                status=status,
                account_manager=random.choice(ACCOUNT_MANAGERS),
                start_date=date(2024, random.randint(1, 12), random.randint(1, 28)),
                created_at=datetime(2024, random.randint(1, 12), random.randint(1, 28))
            )
            clients.append(client)
        db.add_all(clients)
        db.flush()

        # ==================== CONTRACTS ====================
        billing_models_list = ["T&M", "Milestone", "Retainer", "Performance", "Hybrid"]
        contracts = []
        for i, client in enumerate(clients):
            contract = Contract(
                contract_id=f"DNV-{2024 + i // 12}-{(i + 1):04d}",
                client_id=client.id,
                title=f"{client.name} - Sales Enablement Services",
                billing_model=client.billing_model,
                total_value=client.contract_value,
                monthly_value=client.monthly_revenue,
                start_date=client.start_date,
                end_date=client.start_date + timedelta(days=random.choice([365, 548, 730])),
                payment_terms=random.choice(["Net 30", "Net 45", "Net 60", "Net 15"]),
                escalation_clause=random.choice([
                    "5% annual escalation on anniversary",
                    "CPI-linked quarterly adjustment",
                    "Performance-based 3-8% escalation",
                    "Fixed rate for contract duration",
                    "10% escalation after first 6 months"
                ]),
                performance_triggers=json.dumps({
                    "lead_conversion_min": random.randint(15, 35),
                    "sla_adherence_min": random.randint(90, 98),
                    "quality_score_min": random.randint(80, 95)
                }),
                milestones=json.dumps([
                    {"name": "Pilot Completion", "value_pct": 20, "status": "completed"},
                    {"name": "Full Rollout", "value_pct": 40, "status": random.choice(["completed", "in_progress"])},
                    {"name": "Optimization Phase", "value_pct": 25, "status": random.choice(["in_progress", "pending"])},
                    {"name": "Contract Renewal", "value_pct": 15, "status": "pending"}
                ]),
                asc606_step=random.randint(3, 5),
                status="active" if client.status != "churned" else "terminated",
                created_at=datetime.combine(client.start_date, datetime.min.time())
            )
            contracts.append(contract)
        db.add_all(contracts)
        db.flush()

        # ==================== INVOICES ====================
        invoice_statuses = ["Paid", "Paid", "Paid", "Sent", "Pending", "Overdue", "Disputed"]
        invoices = []
        invoice_counter = 1000
        for client in clients:
            for month_offset in range(6):
                invoice_counter += 1
                issue_dt = date(2026, 2 + month_offset, random.randint(1, 5))
                due_dt = issue_dt + timedelta(days=30)
                status = random.choice(invoice_statuses)
                paid_dt = due_dt - timedelta(days=random.randint(0, 10)) if status == "Paid" else None
                amount = client.monthly_revenue * random.uniform(0.85, 1.15)
                tax = amount * 0.18
                invoice = Invoice(
                    invoice_number=f"INV-2026-{invoice_counter}",
                    client_id=client.id,
                    amount=round(amount, 2),
                    tax_amount=round(tax, 2),
                    total_amount=round(amount + tax, 2),
                    issue_date=issue_dt,
                    due_date=due_dt,
                    paid_date=paid_dt,
                    status=status,
                    po_number=f"PO-{client.name[:3].upper()}-{random.randint(1000, 9999)}" if random.random() > 0.3 else None,
                    notes=random.choice([None, "Monthly retainer", "Milestone payment", "Performance bonus included"]),
                    created_at=datetime.combine(issue_dt, datetime.min.time())
                )
                invoices.append(invoice)
        db.add_all(invoices)
        db.flush()

        # ==================== PAYMENTS (for Paid invoices) ====================
        payments = []
        for inv in invoices:
            if inv.status == "Paid" and inv.paid_date:
                payment = Payment(
                    invoice_id=inv.id,
                    amount=inv.total_amount,
                    payment_date=inv.paid_date,
                    payment_method=random.choice(["NEFT", "RTGS", "Cheque", "UPI"]),
                    reference_number=f"REF-{random.randint(100000, 999999)}",
                    status="completed",
                    created_at=datetime.combine(inv.paid_date, datetime.min.time())
                )
                payments.append(payment)
        db.add_all(payments)
        db.flush()

        # ==================== BILLABLE ACTIVITIES (~1500, 15% unbilled) ====================
        activities = []
        activity_types = ["hours", "calls", "meetings", "deliverables"]
        rates = {"hours": (1500, 4500), "calls": (500, 1500), "meetings": (2000, 5000), "deliverables": (10000, 50000)}
        quantities = {"hours": (1, 8), "calls": (1, 5), "meetings": (1, 3), "deliverables": (1, 2)}

        for _ in range(1500):
            client = random.choice(clients)
            act_type = random.choice(activity_types)
            qty = random.randint(*quantities[act_type])
            rate = random.randint(*rates[act_type])
            amount = qty * rate
            act_date = date(2026, random.randint(5, 7), random.randint(1, 28))
            billed = random.random() > 0.15  # 85% billed

            # Link to invoice if billed
            client_invoices = [inv for inv in invoices if inv.client_id == client.id and inv.status == "Paid"]
            inv_id = random.choice(client_invoices).id if billed and client_invoices else None

            activity = BillableActivity(
                client_id=client.id,
                activity_type=act_type,
                description=random.choice(ACTIVITY_DESCRIPTIONS[act_type]),
                quantity=qty,
                rate=rate,
                amount=amount,
                date=act_date,
                billed=billed,
                invoice_id=inv_id,
                employee_name=random.choice(EMPLOYEE_NAMES),
                created_at=datetime.combine(act_date, datetime.min.time())
            )
            activities.append(activity)
        db.add_all(activities)
        db.flush()

        # ==================== LEAKAGE ALERTS (~50) ====================
        alert_types = ["unbilled_hours", "missed_escalation", "scope_creep", "undercharging"]
        severities = ["critical", "high", "medium", "low"]
        alert_statuses = ["open", "open", "open", "acknowledged", "resolved"]
        alert_descriptions = {
            "unbilled_hours": [
                "172 hours logged but not invoiced in current period",
                "Weekend overtime hours not captured in billing",
                "Training hours delivered but classified as non-billable",
                "Extended support hours beyond SLA not billed"
            ],
            "missed_escalation": [
                "Annual 5% escalation clause not applied since Q1",
                "Performance bonus trigger met but not invoiced",
                "CPI adjustment of 3.2% pending for 2 quarters",
                "Volume-based tier upgrade not reflected in billing"
            ],
            "scope_creep": [
                "Additional reporting deliverables not in SOW",
                "New geography coverage without contract amendment",
                "Extended team deployed without rate card update",
                "Weekend operations added without billing adjustment"
            ],
            "undercharging": [
                "Billing rate 15% below market for senior resources",
                "No charge for ad-hoc analytics requests",
                "Travel expenses absorbed instead of passed through",
                "Technology platform costs not recovered from client"
            ]
        }

        leakage_alerts = []
        for _ in range(50):
            client = random.choice(clients)
            alert_type = random.choice(alert_types)
            severity = random.choices(severities, weights=[15, 25, 40, 20])[0]
            status = random.choice(alert_statuses)
            detected = date(2026, random.randint(1, 7), random.randint(1, 28))
            resolved_dt = detected + timedelta(days=random.randint(3, 30)) if status == "resolved" else None

            alert = LeakageAlert(
                client_id=client.id,
                alert_type=alert_type,
                description=random.choice(alert_descriptions[alert_type]),
                amount=random.randint(50000, 1500000),
                severity=severity,
                status=status,
                detected_date=detected,
                resolved_date=resolved_dt,
                resolution_notes="Corrective invoice raised and escalation applied" if status == "resolved" else None,
                created_at=datetime.combine(detected, datetime.min.time())
            )
            leakage_alerts.append(alert)
        db.add_all(leakage_alerts)
        db.flush()

        # ==================== REVENUE RECOGNITION (7 months per client) ====================
        rev_recs = []
        periods = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
        for client in clients:
            for period in periods:
                recognized = client.monthly_revenue * random.uniform(0.88, 1.05)
                deferred = client.monthly_revenue * random.uniform(0.05, 0.20)
                unbilled = client.monthly_revenue * random.uniform(0.02, 0.12)
                rev_rec = RevenueRecognition(
                    client_id=client.id,
                    period=period,
                    recognized_revenue=round(recognized, 2),
                    deferred_revenue=round(deferred, 2),
                    unbilled_revenue=round(unbilled, 2),
                    asc606_compliant=random.random() > 0.1,  # 90% compliant
                    journal_entry_ref=f"JE-{period}-{client.id:03d}",
                    created_at=datetime(2026, int(period.split("-")[1]), 28)
                )
                rev_recs.append(rev_rec)
        db.add_all(rev_recs)
        db.flush()

        # ==================== MARGIN HISTORY (7 months per client) ====================
        margin_histories = []
        for client in clients:
            base_margin = client.net_margin_pct
            for period in periods:
                rev = client.monthly_revenue * random.uniform(0.9, 1.1)
                direct_cost = rev * random.uniform(0.55, 0.75)
                allocated_cost = rev * random.uniform(0.08, 0.18)
                gross_margin = (rev - direct_cost) / rev * 100
                net_margin = (rev - direct_cost - allocated_cost) / rev * 100

                mh = MarginHistory(
                    client_id=client.id,
                    period=period,
                    revenue=round(rev, 2),
                    direct_cost=round(direct_cost, 2),
                    allocated_cost=round(allocated_cost, 2),
                    gross_margin_pct=round(gross_margin, 2),
                    net_margin_pct=round(net_margin, 2),
                    created_at=datetime(2026, int(period.split("-")[1]), 28)
                )
                margin_histories.append(mh)
        db.add_all(margin_histories)
        db.flush()

        # ==================== SETTINGS ====================
        settings = [
            Setting(key="margin_threshold", value="12", description="Minimum acceptable net margin percentage", category="thresholds", updated_by="admin"),
            Setting(key="tax_rate", value="18", description="Default GST rate percentage", category="billing", updated_by="admin"),
            Setting(key="payment_terms_default", value="30", description="Default payment terms in days", category="billing", updated_by="admin"),
            Setting(key="escalation_reminder_days", value="30", description="Days before escalation clause reminder", category="alerts", updated_by="admin"),
            Setting(key="unbilled_threshold_hours", value="40", description="Hours threshold for unbilled alert", category="alerts", updated_by="admin"),
            Setting(key="currency", value="INR", description="Default currency for all transactions", category="general", updated_by="admin"),
            Setting(key="fiscal_year_start", value="04", description="Fiscal year start month", category="general", updated_by="admin"),
            Setting(key="auto_escalation_check", value="true", description="Enable automatic escalation compliance checks", category="automation", updated_by="admin"),
            Setting(key="leakage_scan_frequency", value="weekly", description="How often to scan for revenue leakage", category="automation", updated_by="admin"),
            Setting(key="asc606_enforcement", value="true", description="Enforce ASC 606 compliance tracking", category="compliance", updated_by="admin"),
            Setting(key="invoice_prefix", value="INV", description="Prefix for auto-generated invoice numbers", category="billing", updated_by="admin"),
            Setting(key="margin_alert_enabled", value="true", description="Enable alerts when margin drops below threshold", category="alerts", updated_by="admin"),
            Setting(key="data_retention_months", value="36", description="Months to retain historical data", category="general", updated_by="admin"),
            Setting(key="max_payment_terms", value="90", description="Maximum allowed payment terms in days", category="billing", updated_by="admin"),
            Setting(key="dashboard_refresh_minutes", value="5", description="Dashboard auto-refresh interval", category="general", updated_by="admin"),
        ]
        db.add_all(settings)
        db.flush()

        # ==================== AUDIT LOGS ====================
        audit_logs = [
            AuditLog(action="CREATE", entity_type="Client", entity_id=1, description="Created client HDFC Bank", user_name="admin", created_at=datetime(2026, 7, 1, 9, 0)),
            AuditLog(action="UPDATE", entity_type="Contract", entity_id=5, description="Updated contract value for Jio Platforms", user_name="finance_mgr", created_at=datetime(2026, 7, 3, 14, 30)),
            AuditLog(action="CREATE", entity_type="Invoice", entity_id=10, description="Generated invoice INV-2026-1010", user_name="finance_mgr", created_at=datetime(2026, 7, 5, 10, 15)),
            AuditLog(action="RESOLVE", entity_type="LeakageAlert", entity_id=3, description="Resolved unbilled hours alert for Maruti Suzuki", user_name="admin", created_at=datetime(2026, 7, 7, 11, 45)),
            AuditLog(action="UPDATE", entity_type="Setting", entity_id=1, description="Updated margin_threshold from 10 to 12", user_name="admin", created_at=datetime(2026, 7, 8, 16, 0)),
            AuditLog(action="CREATE", entity_type="User", entity_id=3, description="Created viewer account for Rahul Kapoor", user_name="admin", created_at=datetime(2026, 7, 9, 9, 30)),
            AuditLog(action="UPDATE", entity_type="Client", entity_id=9, description="Marked Infosys BPO as at_risk", user_name="finance_mgr", created_at=datetime(2026, 7, 10, 13, 20)),
            AuditLog(action="PAYMENT", entity_type="Invoice", entity_id=15, description="Payment received for Airtel - INV-2026-1015", user_name="finance_mgr", created_at=datetime(2026, 7, 12, 10, 0)),
            AuditLog(action="EXPORT", entity_type="Report", entity_id=None, description="Exported client profitability report Q2 2026", user_name="admin", created_at=datetime(2026, 7, 14, 15, 30)),
            AuditLog(action="SEED_RESET", entity_type="System", entity_id=None, description="Database reset with fresh seed data", user_name="admin", created_at=datetime(2026, 7, 15, 8, 0)),
        ]
        db.add_all(audit_logs)

        db.commit()
        print(f"Seed data generated successfully!")
        print(f"  - {len(users)} users")
        print(f"  - {len(clients)} clients")
        print(f"  - {len(contracts)} contracts")
        print(f"  - {len(invoices)} invoices")
        print(f"  - {len(payments)} payments")
        print(f"  - {len(activities)} billable activities")
        print(f"  - {len(leakage_alerts)} leakage alerts")
        print(f"  - {len(rev_recs)} revenue recognition records")
        print(f"  - {len(margin_histories)} margin history records")
        print(f"  - {len(settings)} settings")
        print(f"  - {len(audit_logs)} audit logs")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    generate_seed_data()
