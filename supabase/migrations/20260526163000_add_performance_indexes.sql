-- Create performance indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_sales_business_created ON sales (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_business_created ON cash_movements (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_business_opened ON cash_sessions (business_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers (business_id, name);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
