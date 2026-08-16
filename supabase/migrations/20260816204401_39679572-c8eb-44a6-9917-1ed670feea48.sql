-- First, ensure the identities table is correct for the Google user
UPDATE auth.identities 
SET identity_data = jsonb_set(identity_data, '{email_verified}', 'true')
WHERE user_id = '449a553c-be4b-47fa-95db-fa770a011435';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('449a553c-be4b-47fa-95db-fa770a011435', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure profile exists
INSERT INTO public.profiles (id, full_name, avatar_url)
VALUES ('449a553c-be4b-47fa-95db-fa770a011435', 'anonymous souto', 'https://lh3.googleusercontent.com/a/ACg8ocJ6W_oEX6FJMr5W9omQB98hGoWf-xW8_txzaSq6_UfUgNHoA=s96-c')
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url;