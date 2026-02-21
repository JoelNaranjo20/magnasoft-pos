-- PERFORMANCE ANALYSIS SCRIPT
-- Objective: Measure JSONB query performance and validate GIN index effectiveness.

-- 1. Baseline: Query without Index
-- We want to find all 'red' products in a specific list of businesses (simulating a super admin or cross-tenant analytic, or just heavy load)
-- Or more realistically, filtering within a large business.
EXPLAIN ANALYZE 
SELECT * FROM public.products 
WHERE metadata->>'color' = 'red';

-- 2. Create GIN Index on Metadata
-- GIN (Generalized Inverted Index) is best for JSONB key-value searching.
CREATE INDEX IF NOT EXISTS idx_products_metadata ON public.products USING GIN (metadata);

-- 3. Optimization: Analysis after Index
-- Rerun the same query to observe "Bitmap Heap Scan" vs "Seq Scan".
EXPLAIN ANALYZE 
SELECT * FROM public.products 
WHERE metadata @> '{"color": "red"}';

-- Note: The operator ->> returns text and might not use the GIN index efficiently.
-- The operator @> (contains) is optimized for GIN.
