-- Migration: Prevent duplicate business creation per user
-- Adds a guard in create_business_without_serial to block users who already own a business

CREATE OR REPLACE FUNCTION public.create_business_without_serial(
    p_name text,
    p_business_type text,
    p_config jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_business_id uuid;
    new_business_id uuid;
    new_business_record json;
BEGIN
    -- 0. Block duplicate: check if the caller's profile already has a business
    SELECT business_id INTO v_existing_business_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_existing_business_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este usuario ya pertenece al negocio %. Solo se permite un negocio por cuenta.', v_existing_business_id;
    END IF;

    -- 1. Insert the new business
    INSERT INTO public.business (name, owner_id, status)
    VALUES (p_name, auth.uid(), 'active')
    RETURNING id INTO new_business_id;

    -- 2. Set business type and module config (ATOMIC — within same transaction)
    UPDATE public.business
    SET business_type = p_business_type,
        config = p_config
    WHERE id = new_business_id;

    -- 3. Link the new business to the creator's profile
    UPDATE public.profiles
    SET business_id = new_business_id,
        saas_role = 'admin'
    WHERE id = auth.uid();

    -- 4. Return the created record structure
    SELECT row_to_json(b) INTO new_business_record
    FROM public.business b
    WHERE id = new_business_id;

    RETURN new_business_record;
END;
$$;

NOTIFY pgrst, 'reload schema';
