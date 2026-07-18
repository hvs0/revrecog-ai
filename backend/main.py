import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from database import engine, Base, db_exists
from routers import dashboard, clients, contracts, invoices, leakage, revenue, admin
from routers import data_portal

# Path to the built frontend
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed data if DB doesn't exist
    if not db_exists():
        print("Database not found. Creating tables and seeding data...")
        Base.metadata.create_all(bind=engine)
        from seed_data import generate_seed_data
        generate_seed_data()
        print("Database initialized with seed data.")
    else:
        Base.metadata.create_all(bind=engine)
        print("Database loaded successfully.")
    yield
    print("Application shutting down.")


# Middleware to add ngrok-skip-browser-warning header to all responses
class NgrokHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["ngrok-skip-browser-warning"] = "true"
        return response


app = FastAPI(
    title="RevRecog AI + ClientMargin360 API",
    description="Revenue Recognition & Client Profitability Analytics for Denave India",
    version="2.0.0",
    lifespan=lifespan,
)

# Add ngrok header middleware
app.add_middleware(NgrokHeaderMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(contracts.router)
app.include_router(invoices.router)
app.include_router(leakage.router)
app.include_router(revenue.router)
app.include_router(admin.router)
app.include_router(data_portal.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "revrecog-clientmargin360"}


# Serve frontend static files if the dist directory exists
if FRONTEND_DIR.exists():
    # Mount static assets (CSS, JS) with proper MIME types
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")

    # Catch-all route for SPA - must be last
    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # If it's a static file that exists, serve it
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html (SPA routing)
        return FileResponse(str(FRONTEND_DIR / "index.html"), media_type="text/html")
else:
    @app.get("/")
    def root():
        return {
            "name": "RevRecog AI + ClientMargin360 API",
            "version": "2.0.0",
            "docs": "/docs",
            "note": "Frontend not built. Run 'npm run build' in frontend/ directory.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
