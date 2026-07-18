# P&L AutoTrack Suite - Prototype
## Denave India Pvt. Ltd. | Built by Finmark.ai

A real-time P&L management platform that automates project/account-level profitability tracking.

### Three Integrated Modules:
1. **P&L AutoTrack Core** - Real-time project/account P&L dashboard with margin calculations
2. **WorkforceP&L Engine** - Employee cost linked to project profitability
3. **CostAllocator Pro** - AI-driven shared cost distribution

### Key Metrics Automated:
- Monthly close: 3-5 days → Same Day
- Margin visibility: Quarterly → Real-time
- Cost accuracy: Fixed % → Activity-based
- Staff freed: 60+ people → 10 people strategic

### Tech Stack:
- **Backend**: Python 3.12 + FastAPI + SQLite + SQLAlchemy
- **Frontend**: React 18 + TypeScript + TailwindCSS + Recharts
- **Architecture**: REST API + SPA with real-time dashboards

### Quick Start:

#### Backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
The backend will auto-seed the database with sample data on first run.

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

### API Documentation:
Once the backend is running, visit http://localhost:8000/docs for interactive Swagger API docs.

### Features Demonstrated:
- Executive P&L dashboard with company-wide metrics
- Account-level drill-down with margin analysis
- Real-time workforce utilization and bench monitoring
- Activity-based cost allocation vs fixed percentage comparison
- Configurable alert engine with threshold monitoring
- 12-month trend analysis and comparisons
- Multi-geography P&L breakdown
- Budget vs Actual tracking

### Saving Potential: Rs. 5-9 Cr/year
- Finance team efficiency: 5-7 FTE equivalent saved
- Revenue leakage detection: 1-2% recovery on Rs. 300 Cr
- Faster decisions: Real-time vs 30+ day old data

---
*Prototype built for demonstration purposes. Production version includes CRM/HRMS/SAP integrations, ML forecasting, and mobile app.*
