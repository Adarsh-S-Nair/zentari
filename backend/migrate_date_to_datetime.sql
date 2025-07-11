-- Migration script to change 'date' column to 'datetime' in transactions table
-- Run this in your Supabase SQL editor

-- Step 1: Add the new datetime column
ALTER TABLE transactions ADD COLUMN datetime TIMESTAMPTZ;

-- Step 2: Copy data from date to datetime (convert date to timestamp)
UPDATE transactions 
SET datetime = date::timestamp AT TIME ZONE 'UTC'
WHERE date IS NOT NULL;

-- Step 3: Drop the old date column
ALTER TABLE transactions DROP COLUMN date;

-- Step 4: Make datetime NOT NULL if you want to enforce it
-- ALTER TABLE transactions ALTER COLUMN datetime SET NOT NULL;

-- Step 5: Add an index on datetime for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_datetime ON transactions(datetime DESC);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('datetime', 'date')
ORDER BY column_name; 