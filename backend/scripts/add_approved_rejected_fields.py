import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

def add_approved_rejected_fields():
    """Add approved_by and rejected_by fields to packages table"""
    with engine.connect() as connection:
        # Start a transaction
        with connection.begin():
            try:
                # Add the columns
                print("Adding approved_by column...")
                connection.execute("ALTER TABLE packages ADD COLUMN approved_by INTEGER NULL;")
                
                print("Adding rejected_by column...")
                connection.execute("ALTER TABLE packages ADD COLUMN rejected_by INTEGER NULL;")
                
                # Add foreign key constraints
                print("Adding foreign key constraints...")
                connection.execute("""
                    ALTER TABLE packages ADD CONSTRAINT fk_packages_approved_by 
                    FOREIGN KEY (approved_by) REFERENCES users(id);
                """)
                
                connection.execute("""
                    ALTER TABLE packages ADD CONSTRAINT fk_packages_rejected_by 
                    FOREIGN KEY (rejected_by) REFERENCES users(id);
                """)
                
                # Add indexes for better performance
                print("Adding indexes...")
                connection.execute("CREATE INDEX idx_packages_approved_by ON packages(approved_by);")
                connection.execute("CREATE INDEX idx_packages_rejected_by ON packages(rejected_by);")
                
                # Update existing approved packages to set approved_by to assigned_to_manager
                print("Updating existing approved packages...")
                result = connection.execute("""
                    UPDATE packages 
                    SET approved_by = assigned_to_manager 
                    WHERE status = 'approved' AND assigned_to_manager IS NOT NULL AND approved_by IS NULL;
                """)
                print(f"Updated {result.rowcount} approved packages")
                
                # Update existing rejected packages to set rejected_by to assigned_to_manager
                print("Updating existing rejected packages...")
                result = connection.execute("""
                    UPDATE packages 
                    SET rejected_by = assigned_to_manager 
                    WHERE status = 'rejected' AND assigned_to_manager IS NOT NULL AND rejected_by IS NULL;
                """)
                print(f"Updated {result.rowcount} rejected packages")
                
                print("Successfully added approved_by and rejected_by fields to packages table")
                
            except Exception as e:
                print(f"Error during migration: {e}")
                # Check if columns already exist
                if "already exists" in str(e) or "duplicate column name" in str(e).lower():
                    print("Columns may already exist. Continuing...")
                else:
                    raise

if __name__ == "__main__":
    add_approved_rejected_fields()
