DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  -- If user doesn't exist, create them
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@theroyalcut.com',
      crypt('RoyalAdmin2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Admin Royal"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;
  ELSE
    -- User exists, just update password to be sure
    UPDATE auth.users 
    SET encrypted_password = crypt('RoyalAdmin2026!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;
  END IF;

  -- Ensure the role is assigned in public.user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Profile will be created by the trigger if it's a new insert, 
  -- but let's ensure it exists for the existing user too.
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Admin Royal')
  ON CONFLICT (id) DO NOTHING;

END $$;