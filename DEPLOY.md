# 🚀 How to Deploy RevRecog AI (Make it Live - FREE)

## Option 1: Render.com (Recommended - Completely Free)

### Step 1: Push to GitHub
```bash
cd C:\Users\LENOVO\Desktop\finmarktools.ai
git init
git add .
git commit -m "RevRecog AI + ClientMargin360 - Full Stack App"
git remote add origin https://github.com/YOUR_USERNAME/revrecog-ai.git
git push -u origin main
```

### Step 2: Create Free PostgreSQL Database
1. Go to https://render.com → Sign up (free)
2. Click "New +" → "PostgreSQL"
3. Name: `revrecog-db`
4. Plan: **Free**
5. Click "Create Database"
6. Copy the **Internal Database URL** (starts with `postgres://...`)

### Step 3: Deploy the App
1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Settings:
   - Name: `revrecog-ai`
   - Runtime: Python
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
4. Environment Variables:
   - `DATABASE_URL` = (paste the PostgreSQL URL from Step 2)
5. Click "Create Web Service"

### Step 4: Done!
Your app is live at: `https://revrecog-ai.onrender.com`
- Database is online (PostgreSQL on Render)
- Auto-seeds data on first load
- HTTPS included free
- Auto-deploys on git push

---

## Option 2: Railway.app (Free $5/month credit)

### Steps:
1. Go to https://railway.app → Sign up with GitHub
2. Click "New Project" → "Deploy from GitHub Repo"
3. Select your repo
4. Railway auto-detects Python
5. Add PostgreSQL: Click "New" → "Database" → "PostgreSQL"
6. Add env var: `DATABASE_URL` → link to PostgreSQL
7. Deploy! Live URL provided instantly.

---

## Option 3: Vercel (Frontend) + Supabase (Database) + Fly.io (Backend)

### Frontend on Vercel:
```bash
cd frontend
npx vercel --prod
```

### Database on Supabase (Free PostgreSQL):
1. Go to https://supabase.com → Create project
2. Copy connection string
3. Set as `DATABASE_URL` in backend

### Backend on Fly.io:
```bash
cd backend
fly launch
fly secrets set DATABASE_URL="postgresql://..."
fly deploy
```

---

## What Happens When Live:

1. **Database** = PostgreSQL (cloud, not on your PC)
2. **Backend** = FastAPI running on Render/Railway server
3. **Frontend** = React app served by the same backend
4. **URL** = https://your-app-name.onrender.com (shareable with Denave)
5. **Auto-seed** = Database fills with demo data on first run
6. **OCR** = Upload PDF invoices → auto-extract data → save to cloud DB
7. **All CRUD** = Create/Read/Update/Delete works on cloud database
8. **Change Tracking** = Every edit logged in audit table

---

## Local Development (what you have now):
```bash
cd C:\Users\LENOVO\Desktop\finmarktools.ai\backend
py -m uvicorn main:app --port 8001
# Open http://localhost:8001
```

## Architecture:
```
User → Browser (React Frontend)
         ↓
    FastAPI Backend (Port 8001)
         ↓
    PostgreSQL Database (Cloud)
         ↓
    Auto-seed if empty
```

Everything is FREE. No credit card needed.
