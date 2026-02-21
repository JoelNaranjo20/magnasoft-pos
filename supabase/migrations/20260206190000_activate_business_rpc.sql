-- Migration: Create RPC for Business Activation (Pre-generated License Model)
-- Description: Activates an existing business by verifying the license key and linking the hardware ID and user.

CREATE OR REPLACE FUNCTION public.activate_business_device(
  p_license_key text,
  p_hardware_id text,
  p_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to allow finding and updating the business
SET search_path = public
AS $$
DECLARE
  target_business_id uuid;
  target_business_record json;
  current_hardware_id text;
  rows_updated integer;
BEGIN
  -- 1. Find the business with this license key
  SELECT id, hardware_id INTO target_business_id, current_hardware_id
  FROM public.business
  WHERE license_key = p_license_key;

  -- 2. Validation Checks
  IF target_business_id IS NULL THEN
    RAISE EXCEPTION 'Serial de licencia inválido.';
  END IF;

  IF current_hardware_id IS NOT NULL AND current_hardware_id != p_hardware_id THEN
    RAISE EXCEPTION 'Este serial ya ha sido activado en otro dispositivo.';
  END IF;

  -- 3. Update the business (Activate)
  -- We allow updating the name during activation if it was a placeholder
  UPDATE public.business
  SET 
    hardware_id = p_hardware_id,
    name = p_name,
    status = 'active',
    updated_at = now()
  WHERE id = target_business_id
  RETURNING row_to_json(business.*) INTO target_business_record;

  -- 4. Link the new business to the current user's profile
  -- The user activating the license becomes the admin for this business
  WITH updated_profile AS (
    UPDATE public.profiles
    SET business_id = target_business_id,
        saas_role = 'admin'
    WHERE id = auth.uid()
    RETURNING id
  )
  SELECT COUNT(*) INTO rows_updated FROM updated_profile;

  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'No se pudo vincular el usuario al negocio activado.';
  END IF;

  RETURN target_business_record;
END;
$$;
