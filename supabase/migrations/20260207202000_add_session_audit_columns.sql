-- Add manual_end_amount and difference to cash_sessions
ALTER TABLE public.cash_sessions
ADD COLUMN IF NOT EXISTS manual_end_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS difference DECIMAL(10,2) DEFAULT 0;

-- Optionally rename user_id to worker_id if we want to be clean, but I'll just leave it for now and use proper column in code.
-- Actually, I previously added user_id, but the schema has worker_id.
-- I'll trust worker_id is the one to use for workers.
