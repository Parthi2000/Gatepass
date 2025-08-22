-- Add rejected_at column to packages table
ALTER TABLE packages ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;

-- Update existing rejected packages with current timestamp
UPDATE packages 
SET rejected_at = NOW()
WHERE status = 'rejected' AND rejected_at IS NULL;
