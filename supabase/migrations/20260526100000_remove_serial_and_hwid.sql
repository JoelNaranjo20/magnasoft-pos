-- Migration: Remove Serial and HWID from Business Setup
-- Description: Creates a function to create a business and link it to a user account without needing serial codes or hardware verification.
-- v2: Added p_business_type and p_config params for atomic creation (type + modules in one transaction).

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
    new_business_id uuid;
    new_business_record json;
BEGIN
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
