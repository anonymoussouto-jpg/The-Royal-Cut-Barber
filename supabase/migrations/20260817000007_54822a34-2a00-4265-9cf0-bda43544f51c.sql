DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@theroyalcut.com';
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"admin@theroyalcut.com","email_verified":true}', v_user_id)::jsonb,
      'email',
      v_user_id, -- provider_id is the user uuid for email provider usually
      now(),
      now(),
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email'
    );
    
    UPDATE auth.users 
    SET encrypted_password = crypt('RoyalAdmin2026!', gen_salt('bf'))
    WHERE id = v_user_id;
  END IF;
END $$;