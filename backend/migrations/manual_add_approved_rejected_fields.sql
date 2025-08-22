-- Manual SQL Migration: Add approved_by and rejected_by fields
-- Run this directly in your database management tool (pgAdmin, MySQL Workbench, etc.)

-- Check if columns already exist before adding them
DO $$ 
BEGIN
    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'packages' AND column_name = 'approved_by') THEN
        ALTER TABLE packages ADD COLUMN approved_by INTEGER NULL;
        RAISE NOTICE 'Added approved_by column';
    ELSE
        RAISE NOTICE 'approved_by column already exists';
    END IF;
    
    -- Add rejected_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'packages' AND column_name = 'rejected_by') THEN
        ALTER TABLE packages ADD COLUMN rejected_by INTEGER NULL;
        RAISE NOTICE 'Added rejected_by column';
    ELSE
        RAISE NOTICE 'rejected_by column already exists';
    END IF;
END $$;

-- Add foreign key constraints (will fail gracefully if they already exist)
DO $$
BEGIN
    -- Add foreign key for approved_by
    BEGIN
        ALTER TABLE packages ADD CONSTRAINT fk_packages_approved_by 
            FOREIGN KEY (approved_by) REFERENCES users(id);
        RAISE NOTICE 'Added foreign key constraint for approved_by';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint for approved_by already exists';
    END;
    
    -- Add foreign key for rejected_by
    BEGIN
        ALTER TABLE packages ADD CONSTRAINT fk_packages_rejected_by 
            FOREIGN KEY (rejected_by) REFERENCES users(id);
        RAISE NOTICE 'Added foreign key constraint for rejected_by';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint for rejected_by already exists';
    END;
END $$;

-- Add indexes for better performance (will fail gracefully if they already exist)
DO $$
BEGIN
    -- Add index for approved_by
    BEGIN
        CREATE INDEX idx_packages_approved_by ON packages(approved_by);
        RAISE NOTICE 'Added index for approved_by';
    EXCEPTION 
        WHEN duplicate_table THEN
            RAISE NOTICE 'Index for approved_by already exists';
    END;
    
    -- Add index for rejected_by
    BEGIN
        CREATE INDEX idx_packages_rejected_by ON packages(rejected_by);
        RAISE NOTICE 'Added index for rejected_by';
    EXCEPTION 
        WHEN duplicate_table THEN
            RAISE NOTICE 'Index for rejected_by already exists';
    END;
END $$;

-- Update existing data (best effort migration)
-- Set approved_by to assigned_to_manager for existing approved packages
UPDATE packages 
SET approved_by = assigned_to_manager 
WHERE status = 'approved' 
  AND assigned_to_manager IS NOT NULL 
  AND approved_by IS NULL;

-- Set rejected_by to assigned_to_manager for existing rejected packages  
UPDATE packages 
SET rejected_by = assigned_to_manager 
WHERE status = 'rejected' 
  AND assigned_to_manager IS NOT NULL 
  AND rejected_by IS NULL;

-- Show summary of changes
SELECT 
    'Migration Summary:' as info,
    (SELECT COUNT(*) FROM packages WHERE approved_by IS NOT NULL) as approved_packages_with_approver,
    (SELECT COUNT(*) FROM packages WHERE rejected_by IS NOT NULL) as rejected_packages_with_rejecter,
    (SELECT COUNT(*) FROM packages WHERE status = 'approved') as total_approved_packages,
    (SELECT COUNT(*) FROM packages WHERE status = 'rejected') as total_rejected_packages;
