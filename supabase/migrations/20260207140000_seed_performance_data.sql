-- PERFORMANCE SEED SCRIPT
-- Objective: Populate database with 50 businesses and 10,000 products with JSONB metadata.

-- 1. Create 50 Dummy Businesses
DO $$
DECLARE
    i INT;
    new_business_id UUID;
BEGIN
    FOR i IN 1..50 LOOP
        INSERT INTO public.business (name, slug, status, plan, business_type)
        VALUES (
            'Perf Business ' || i, 
            'perf-biz-' || i, 
            'active', 
            'standard', 
            CASE WHEN i % 3 = 0 THEN 'restaurant' WHEN i % 3 = 1 THEN 'retail' ELSE 'automotive' END
        )
        RETURNING id INTO new_business_id;

        -- 2. Create 200 Products per Business (Total 10,000)
        INSERT INTO public.products (business_id, name, price, stock, category, metadata)
        SELECT 
            new_business_id,
            'Perf Product ' || generate_series,
            (random() * 100)::decimal(10,2),
            (random() * 500)::int,
            'Performance Category',
            jsonb_build_object(
                'color', CASE WHEN random() < 0.3 THEN 'red' WHEN random() < 0.6 THEN 'blue' ELSE 'green' END,
                'size', CASE WHEN random() < 0.5 THEN 'M' ELSE 'L' END,
                'weight', (random() * 10)::int,
                'supplier_info', jsonb_build_object(
                    'id', (random() * 1000)::int,
                    'rating', 5
                ),
                'tags', jsonb_build_array('sale', 'new', 'summer')
            )
        FROM generate_series(1, 200);
    END LOOP;
END $$;
