-- Migration script to add location, payment_channel, and website columns to transactions table
-- Run this in your Supabase SQL editor

-- Step 1: Add the new columns
ALTER TABLE transactions ADD COLUMN location JSONB;
ALTER TABLE transactions ADD COLUMN payment_channel TEXT;
ALTER TABLE transactions ADD COLUMN website TEXT;
ALTER TABLE transactions ADD COLUMN pending_plaid_transaction_id TEXT;

-- Step 2: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_payment_channel ON transactions(payment_channel);
CREATE INDEX IF NOT EXISTS idx_transactions_website ON transactions(website);
CREATE INDEX IF NOT EXISTS idx_transactions_location ON transactions USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_transactions_pending_plaid_id ON transactions(pending_plaid_transaction_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('location', 'payment_channel', 'website')
ORDER BY column_name; 