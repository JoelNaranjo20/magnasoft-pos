-- =========================================================
-- PRODUCTION-READY AUTH TRIGGER V3 FINAL
-- Minimal trigger following production-safe architecture
-- =========================================================

-- Minimal auth trigger (ONLY creates profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    -- ONLY create profile - nothing else
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        saas_role,
        created_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
        'user',
        'user',
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- NEVER block signup
    RAISE WARNING 'Profile creation failed but signup continues: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Install trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();
