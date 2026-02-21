-- Migration: Create RPC for Business Creation (Fix RLS Paradox)
-- Description: Creates a SECURITY DEFINER function to insert a business and link it to the creator profile in one transaction.

CREATE OR REPLACE FUNCTION public.create_and_link_business(
  p_name text,
  p_license_key text,
  p_hardware_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to allow creation and linking despite policies
SET search_path = public
AS $$
DECLARE
  new_business_id uuid;
  new_business_record json;
  rows_updated integer;
BEGIN
  -- 1. Insert the new business
  INSERT INTO public.business (name, license_key, hardware_id, status)
  VALUES (p_name, p_license_key, p_hardware_id, 'active')
  RETURNING id INTO new_business_id;

  -- 2. Link the new business to the current user's profile
  -- This resolves the "Chicken/Egg" RLS issue because we are inside a SECURITY DEFINER function
  WITH updated AS (
    UPDATE public.profiles
    SET business_id = new_business_id,
        saas_role = 'admin' -- Optional: Creator becomes the Business Admin
    WHERE id = auth.uid()
    RETURNING id
  )
  SELECT COUNT(*) INTO rows_updated FROM updated;

  -- 2.1 Verify the update worked (profile exists and was linked)
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Profile not found for user %. Cannot link business.', auth.uid();
  END IF;

  -- 3. Return the created record structure (so Frontend receives the Object)
  SELECT row_to_json(b) INTO new_business_record
  FROM public.business b
  WHERE id = new_business_id;

  RETURN new_business_record;
END;
$$;
