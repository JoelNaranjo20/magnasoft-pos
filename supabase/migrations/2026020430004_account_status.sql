-- Add account_status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN account_status TEXT NOT NULL DEFAULT 'pending' 
CHECK (account_status IN ('pending', 'active', 'suspended'));

-- Update existing profiles to 'active' to prevent lockout
UPDATE public.profiles SET account_status = 'active';

-- Ensure Super Admins are always active
UPDATE public.profiles 
SET account_status = 'active' 
WHERE role = 'super_admin' OR saas_role = 'super_admin';
