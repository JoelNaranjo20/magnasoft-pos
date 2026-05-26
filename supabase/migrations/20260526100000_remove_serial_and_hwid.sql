-- Migration: Remove Serial and HWID from Business Setup
-- Description: Creates a function to create a business and link it to a user account without needing serial codes or hardware verification.

CREATE OR REPLACE FUNCTION public.create_business_without_serial(
    p_name text
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

    -- 2. Link the new business to the creator's profile
    UPDATE public.profiles
    SET business_id = new_business_id,
        saas_role = 'admin'
    WHERE id = auth.uid();

    -- 3. Return the created record structure
    SELECT row_to_json(b) INTO new_business_record
    FROM public.business b
    WHERE id = new_business_id;

    RETURN new_business_record;
END;
$$;

NOTIFY pgrst, 'reload schema';
