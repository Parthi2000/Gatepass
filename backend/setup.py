#!/usr/bin/env python3

import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Install required packages"""
    print("Installing Python dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def setup_database():
    """Set up database"""
    print("Setting up database...")
    try:
        subprocess.check_call([sys.executable, "-m", "alembic", "upgrade", "head"])
        print("✅ Database migrations completed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Database setup failed: {e}")
        return False
    return True

def check_env_file():
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found. Creating from .env.example...")
        example_file = Path(".env.example")
        if example_file.exists():
            env_file.write_text(example_file.read_text())
            print("✅ .env file created. Please edit it with your database credentials.")
            return False
        else:
            print("❌ .env.example file not found")
            return False
    return True

def main():
    print("🚀 Setting up FastAPI Package Management Backend...")
    
    if not check_env_file():
        print("Please edit the .env file and run this script again.")
        return
    
    try:
        install_requirements()
        if setup_database():
            print("\n✅ Backend setup completed successfully!")
            print("\nTo start the server:")
            print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
            print("\nAPI Documentation:")
            print("  Swagger UI: http://localhost:8000/docs")
            print("  ReDoc: http://localhost:8000/redoc")
    except Exception as e:
        print(f"❌ Setup failed: {e}")

if __name__ == "__main__":
    main()
