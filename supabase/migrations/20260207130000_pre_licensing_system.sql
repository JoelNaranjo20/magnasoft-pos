-- Migration: Pre-licensing System (Activation Codes)

-- 1. [CORRECCIÓN] Borrar la tabla vieja si existe para asegurar que se cree con las columnas nuevas
DROP TABLE IF EXISTS public.activation_codes CASCADE;

-- Ahora sí, crearla limpia con la estructura correcta
CREATE TABLE public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Esta es la columna que faltaba
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used')),
    business_id UUID REFERENCES public.business(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    redeemed_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Users can only see their own codes
DROP POLICY IF EXISTS "Users can view own activation codes" ON public.activation_codes;
CREATE POLICY "Users can view own activation codes"
ON public.activation_codes
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Function: Generate Random Serial Code (Format: XXXX-YYYY-ZZZZ)
CREATE OR REPLACE FUNCTION public.generate_serial_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars like I, 1, O, 0
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        IF i % 4 = 0 AND i < 12 THEN
            result := result || '-';
        END IF;
    END LOOP;
    RETURN result;
END;
$$;

-- 5. Trigger Function: Generate Code on User Approval (Idempotent)
CREATE OR REPLACE FUNCTION public.on_user_approval_generate_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only run if status changed to 'active'
    IF NEW.account_status = 'active' AND (OLD.account_status IS DISTINCT FROM 'active') THEN
        -- check for existence to prevent duplicates (Idempotency)
        IF NOT EXISTS (SELECT 1 FROM public.activation_codes WHERE user_id = NEW.id) THEN
            INSERT INTO public.activation_codes (user_id, code, status)
            VALUES (NEW.id, public.generate_serial_code(), 'pending');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Create Trigger on profiles
DROP TRIGGER IF EXISTS on_user_approval_generate_code_trigger ON public.profiles;
CREATE TRIGGER on_user_approval_generate_code_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_user_approval_generate_code();

-- 7. RPC: Activate Business with Code
CREATE OR REPLACE FUNCTION public.activate_business_with_code(
    p_code TEXT,
    p_hardware_id TEXT,
    p_business_name TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_code_record RECORD;
    new_business_id UUID;
    new_business_record json;
    rows_updated INTEGER;
BEGIN
    -- 7.1 Verify Code
    SELECT * INTO target_code_record
    FROM public.activation_codes
    WHERE code = p_code;

    IF target_code_record IS NULL THEN
        RAISE EXCEPTION 'Código de activación inválido.';
    END IF;

    IF target_code_record.status = 'used' THEN
        RAISE EXCEPTION 'Este código de activación ya ha sido utilizado.';
    END IF;

    -- 7.2 Create Business
    INSERT INTO public.business (name, license_key, hardware_id, status)
    VALUES (p_business_name, p_code, p_hardware_id, 'active')
    RETURNING id INTO new_business_id;

    -- 7.3 Update Activation Code (Mark as used)
    UPDATE public.activation_codes
    SET status = 'used',
        redeemed_at = now(),
        business_id = new_business_id
    WHERE id = target_code_record.id;

    -- 7.4 Link User Profile to Business
    WITH updated_profile AS (
        UPDATE public.profiles
        SET business_id = new_business_id,
            saas_role = 'admin'
        WHERE id = auth.uid() -- The user activating it gets the link. Ideally this should match the code owner, but for flexibility we allow the user possessing the code to activate it (or we could enforce auth.uid() = target_code_record.user_id)
        RETURNING id
    )
    SELECT COUNT(*) INTO rows_updated FROM updated_profile;

    IF rows_updated = 0 THEN
       -- Optional: If the user activating is NOT the user logged in (rare case if code is shared), we might want to link the code owner instead? 
       -- For now, we assume the user activating is the one who will manage it.
       RAISE EXCEPTION 'Error al vincular el perfil de usuario.';
    END IF;

    -- 7.5 Return the new business record
    SELECT row_to_json(b) INTO new_business_record
    FROM public.business b
    WHERE id = new_business_id;

    RETURN new_business_record;
END;
$$;
