-- Drop the unique constraint on tracking_number if it exists
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_tracking_number_key;
