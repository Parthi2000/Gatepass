-- Migration to change returned_by column from integer to text
-- This migration updates the return_info table to store person names instead of user IDs

-- Step 1: Add a temporary column to store the names
ALTER TABLE return_info ADD COLUMN returned_by_name TEXT;

-- Step 2: Update the temporary column with user names from existing data
UPDATE return_info 
SET returned_by_name = users.full_name 
FROM users 
WHERE return_info.returned_by = users.id;

-- Step 3: Handle any records where user might not exist (set to 'Unknown')
UPDATE return_info 
SET returned_by_name = 'Unknown' 
WHERE returned_by_name IS NULL;

-- Step 4: Drop the foreign key constraint (if exists)
-- Note: This might vary depending on your database system
-- For PostgreSQL:
ALTER TABLE return_info DROP CONSTRAINT IF EXISTS return_info_returned_by_fkey;

-- Step 5: Drop the old returned_by column
ALTER TABLE return_info DROP COLUMN returned_by;

-- Step 6: Rename the temporary column to returned_by
ALTER TABLE return_info RENAME COLUMN returned_by_name TO returned_by;

-- Step 7: Make the column NOT NULL
ALTER TABLE return_info ALTER COLUMN returned_by SET NOT NULL;

-- Verify the changes
SELECT * FROM return_info LIMIT 5;
