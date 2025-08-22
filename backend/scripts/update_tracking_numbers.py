import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import Base, get_db
from app.models import Package, generate_tracking_number
from app.config import settings

def update_existing_tracking_numbers():
    """Update existing tracking numbers to follow the TRKXXXXXXX format"""
    # Create a new database session
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Get all packages with tracking numbers that don't start with 'TRK'
        packages = db.query(Package).filter(
            Package.tracking_number.isnot(None),
            ~Package.tracking_number.startswith('TRK')
        ).all()
        
        print(f"Found {len(packages)} packages to update")
        
        # Update each package with a new tracking number
        for i, package in enumerate(packages, 1):
            old_tracking = package.tracking_number
            package.tracking_number = generate_tracking_number()
            print(f"Updating package {i}/{len(packages)}: {old_tracking} -> {package.tracking_number}")
        
        # Commit the changes
        db.commit()
        print("Successfully updated tracking numbers")
        
    except Exception as e:
        print(f"Error updating tracking numbers: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting to update tracking numbers...")
    update_existing_tracking_numbers()
    print("Done!")
