DO $$ 
DECLARE 
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  -- identity
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id, format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', v_user_id)::jsonb, 'email', v_user_id, now(), now(), now());

  -- role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');

  -- profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Admin Master');
END $$;
