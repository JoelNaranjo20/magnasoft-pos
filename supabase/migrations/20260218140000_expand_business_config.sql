-- Migration: Expand business config JSONB with module visibility flags
-- Purpose: Centralize feature visibility per business type

-- 1. Automotive businesses: Enable vehicles, service queue, commissions
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": true,
  "module_tables": false,
  "module_service_queue": true,
  "module_commissions": true,
  "module_commission_payment": true,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": true
}'::jsonb
WHERE business_type = 'automotive';

-- 2. Barbershop businesses: No vehicles, no queue, yes commissions
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": false,
  "module_tables": false,
  "module_service_queue": false,
  "module_commissions": true,
  "module_commission_payment": true,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": true
}'::jsonb
WHERE business_type = 'barbershop';

-- 3. Beauty Salon businesses: Similar to barbershop
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": false,
  "module_tables": false,
  "module_service_queue": false,
  "module_commissions": true,
  "module_commission_payment": true,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": true
}'::jsonb
WHERE business_type = 'beauty_salon';

-- 4. Restaurant businesses: Enable tables, no commissions
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": false,
  "module_tables": true,
  "module_service_queue": false,
  "module_commissions": false,
  "module_commission_payment": false,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": true
}'::jsonb
WHERE business_type = 'restaurant';

-- 5. Hotel businesses: No vehicles, no queue, no commissions
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": false,
  "module_tables": false,
  "module_service_queue": false,
  "module_commissions": false,
  "module_commission_payment": false,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": true
}'::jsonb
WHERE business_type = 'hotel';

-- 6. Retail / General / Any other: Minimal modules
UPDATE business
SET config = COALESCE(config, '{}'::jsonb) || '{
  "module_vehicles": false,
  "module_tables": false,
  "module_service_queue": false,
  "module_commissions": false,
  "module_commission_payment": false,
  "module_customers": true,
  "module_inventory": true,
  "module_payroll": false
}'::jsonb
WHERE business_type NOT IN ('automotive', 'barbershop', 'beauty_salon', 'restaurant', 'hotel')
   OR business_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.business.config IS 'JSONB configuration controlling module visibility and business-specific settings per business type';
