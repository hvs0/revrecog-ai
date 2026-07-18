from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db, engine, Base
from models import User, Setting, AuditLog, Client

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str
    role: str = "viewer"
    department: Optional[str] = None
    password_hash: str = "$2b$12$defaulthashplaceholder"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class SettingUpdate(BaseModel):
    value: str
    updated_by: Optional[str] = "admin"


# ==================== USER MANAGEMENT ====================

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    """List all users."""
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "department": u.department,
                "is_active": u.is_active,
                "last_login": str(u.last_login) if u.last_login else None,
                "created_at": str(u.created_at) if u.created_at else None,
            } for u in users
        ],
        "total": len(users)
    }


@router.post("/users")
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    # Check unique username
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check unique email
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        role=user_data.role,
        department=user_data.department,
        is_active=True,
        password_hash=user_data.password_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "message": "User created successfully"}


@router.put("/users/{user_id}")
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "message": "User updated successfully"}


@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    """Deactivate a user (soft delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": f"User '{user.username}' deactivated"}


# ==================== SETTINGS ====================

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    """All application settings."""
    settings = db.query(Setting).order_by(Setting.category, Setting.key).all()
    return {
        "settings": [
            {
                "id": s.id,
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "category": s.category,
                "updated_at": str(s.updated_at) if s.updated_at else None,
                "updated_by": s.updated_by,
            } for s in settings
        ],
        "total": len(settings)
    }


@router.put("/settings/{key}")
def update_setting(key: str, setting_data: SettingUpdate, db: Session = Depends(get_db)):
    """Update a setting by key."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    old_value = setting.value
    setting.value = setting_data.value
    setting.updated_at = datetime.utcnow()
    setting.updated_by = setting_data.updated_by

    db.commit()
    return {"key": key, "old_value": old_value, "new_value": setting_data.value, "message": "Setting updated"}


# ==================== AUDIT LOG ====================

@router.get("/audit-log")
def get_audit_log(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Audit trail (filterable)."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_name:
        query = query.filter(AuditLog.user_name == user_name)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "description": log.description,
                "user_name": log.user_name,
                "created_at": str(log.created_at) if log.created_at else None,
            } for log in logs
        ],
        "total": len(logs)
    }


# ==================== DATABASE OPERATIONS ====================

@router.post("/seed-reset")
def seed_reset(db: Session = Depends(get_db)):
    """Reset database with fresh seed data."""
    import os
    from database import BASE_DIR

    db.close()

    # Remove existing DB
    db_path = os.path.join(BASE_DIR, "revrecog.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    # Recreate tables
    Base.metadata.create_all(bind=engine)

    # Reseed
    from seed_data import generate_seed_data
    generate_seed_data()

    return {"message": "Database reset with fresh seed data", "timestamp": str(datetime.utcnow())}


@router.get("/export/clients")
def export_clients(db: Session = Depends(get_db)):
    """Export all clients as JSON."""
    clients = db.query(Client).all()
    export_data = []
    for c in clients:
        export_data.append({
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "geography": c.geography,
            "billing_model": c.billing_model,
            "contract_value": c.contract_value,
            "monthly_revenue": c.monthly_revenue,
            "monthly_cost": c.monthly_cost,
            "net_margin_pct": round(c.net_margin_pct, 2),
            "status": c.status,
            "account_manager": c.account_manager,
            "start_date": str(c.start_date) if c.start_date else None,
        })

    return {
        "export_date": str(datetime.utcnow()),
        "total_clients": len(export_data),
        "clients": export_data
    }
