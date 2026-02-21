-- Add dashboard_config JSONB column to business table
ALTER TABLE public.business
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT '{
  "show_summary": true,
  "show_sales_chart": true,
  "show_recent_transactions": true
}'::jsonb;
