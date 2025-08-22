#!/usr/bin/env python3
"""
Script to create an admin user with properly hashed password for testing.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import User
from app.auth import get_password_hash

def create_admin_user():
    """Create an admin user with a properly hashed password."""
    
    # Create a database session
    db: Session = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == "admin@example.com").first()
        if existing_admin:
            print("Admin user already exists. Updating password...")
            existing_admin.password_hash = get_password_hash("admin123")
            existing_admin.full_name = "Admin User"
            existing_admin.role = "admin"
            existing_admin.employee_id = "ADMIN001"
        else:
            print("Creating new admin user...")
            # Create a new admin user with hashed password
            admin_user = User(
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                full_name="Admin User",
                role="admin",
                employee_id="ADMIN001"
            )
            db.add(admin_user)
        
        # Create a regular test user
        existing_user = db.query(User).filter(User.email == "jane.doe@example.com").first()
        if existing_user:
            print("Test user already exists. Updating password...")
            existing_user.password_hash = get_password_hash("123456789")
            existing_user.full_name = "Jane Doe"
            existing_user.role = "employee"
            existing_user.employee_id = "EMP001"
        else:
            print("Creating new test user...")
            test_user = User(
                email="jane.doe@example.com",
                password_hash=get_password_hash("123456789"),
                full_name="Jane Doe",
                role="employee",
                employee_id="EMP001"
            )
            db.add(test_user)
        
        # Create a manager user
        existing_manager = db.query(User).filter(User.email == "manager@example.com").first()
        if existing_manager:
            print("Manager user already exists. Updating password...")
            existing_manager.password_hash = get_password_hash("manager123")
            existing_manager.full_name = "Manager User"
            existing_manager.role = "manager"
            existing_manager.employee_id = "MGR001"
        else:
            print("Creating new manager user...")
            manager_user = User(
                email="manager@example.com",
                password_hash=get_password_hash("manager123"),
                full_name="Manager User",
                role="manager",
                employee_id="MGR001"
            )
            db.add(manager_user)
        
        db.commit()
        print("Users created/updated successfully!")
        print(f"Admin user: admin@example.com / admin123")
        print(f"Test user: jane.doe@example.com / 123456789")
        print(f"Manager user: manager@example.com / manager123")
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
