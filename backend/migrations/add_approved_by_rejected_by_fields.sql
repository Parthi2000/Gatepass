-- Add approved_by and rejected_by fields to packages table
-- These fields track which manager approved or rejected each package

-- Add the columns
ALTER TABLE packages ADD COLUMN approved_by INTEGER NULL;
ALTER TABLE packages ADD COLUMN rejected_by INTEGER NULL;

-- Add foreign key constraints
ALTER TABLE packages ADD CONSTRAINT fk_packages_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE packages ADD CONSTRAINT fk_packages_rejected_by 
    FOREIGN KEY (rejected_by) REFERENCES users(id);

-- Add indexes for better performance
CREATE INDEX idx_packages_approved_by ON packages(approved_by);
CREATE INDEX idx_packages_rejected_by ON packages(rejected_by);

-- Update existing approved packages to set approved_by to assigned_to_manager
-- This is a best-effort migration for existing data
UPDATE packages 
SET approved_by = assigned_to_manager 
WHERE status = 'approved' AND assigned_to_manager IS NOT NULL AND approved_by IS NULL;

-- Update existing rejected packages to set rejected_by to assigned_to_manager
-- This is a best-effort migration for existing data
UPDATE packages 
SET rejected_by = assigned_to_manager 
WHERE status = 'rejected' AND assigned_to_manager IS NOT NULL AND rejected_by IS NULL;
