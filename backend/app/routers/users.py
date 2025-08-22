from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database import get_db
from app.models import User
from app.schemas import User as UserSchema, UserCreate
from app.auth import require_role, get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/", response_model=List[UserSchema])
def get_users(
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()

@router.get("/managers", response_model=List[UserSchema])
def get_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).filter(User.role == "manager").all()

@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserSchema)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_password = pwd_context.hash(user.password)
    
    # Generate employee_id if not provided
    employee_id = user.employee_id
    if not employee_id:
        # Generate employee ID based on timestamp and random number
        import time
        import random
        employee_id = f"EMP{int(time.time()) % 100000}{random.randint(10, 99)}"
    
    # Create new user
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        employee_id=employee_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if "full_name" in user_update:
        user.full_name = user_update["full_name"]
    if "email" in user_update:
        # Check if new email already exists
        existing_user = db.query(User).filter(User.email == user_update["email"]).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_update["email"]
    if "role" in user_update:
        user.role = user_update["role"]
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.put("/{user_id}/password")
def reset_user_password(
    user_id: int,
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if "password" not in password_data:
        raise HTTPException(status_code=400, detail="Password is required")
    
    # Hash the new password
    hashed_password = pwd_context.hash(password_data["password"])
    user.password_hash = hashed_password
    
    db.commit()
    return {"message": "Password reset successfully"}
