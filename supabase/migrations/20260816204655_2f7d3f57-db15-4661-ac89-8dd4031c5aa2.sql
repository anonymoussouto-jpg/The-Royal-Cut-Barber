-- Update password for admin@theroyalcut.com using a direct SQL update on the encrypted_password column
-- We will use the crypt function which is standard in Supabase's auth schema environment
UPDATE auth.users 
SET encrypted_password = crypt('RoyalAdmin2026!', gen_salt('bf'))
WHERE email = 'admin@theroyalcut.com';

-- Ensure the role exists for the email user
DO $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'admin@theroyalcut.com'
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Ensure the role exists for the Google user
INSERT INTO public.user_roles (user_id, role)
VALUES ('449a553c-be4b-47fa-95db-fa770a011435', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;