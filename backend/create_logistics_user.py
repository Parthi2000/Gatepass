#!/usr/bin/env python3
"""
Script to create a logistics user in the database
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import User, Base
from app.auth import get_password_hash

def create_logistics_user():
    """Create a logistics user"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Check if logistics user already exists
        existing_user = db.query(User).filter(User.email == "logistics@rangsons.com").first()
        if existing_user:
            print("Logistics user already exists!")
            print(f"Email: {existing_user.email}")
            print(f"Role: {existing_user.role}")
            return
        
        # Create logistics user
        logistics_user = User(
            email="logistics@rangsons.com",
            password_hash=get_password_hash("logistics123"),  # Default password
            full_name="Logistics Team",
            role="logistics",
            employee_id="LOG001"
        )
        
        db.add(logistics_user)
        db.commit()
        db.refresh(logistics_user)
        
        print("✅ Logistics user created successfully!")
        print(f"Email: {logistics_user.email}")
        print(f"Password: logistics123")
        print(f"Role: {logistics_user.role}")
        print(f"Employee ID: {logistics_user.employee_id}")
        print("\n⚠️  Please change the default password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating logistics user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_logistics_user()