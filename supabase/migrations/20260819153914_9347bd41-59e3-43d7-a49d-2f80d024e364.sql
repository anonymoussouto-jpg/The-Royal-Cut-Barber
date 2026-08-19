CREATE OR REPLACE FUNCTION increment_barber_points(p_user_id UUID, p_points INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET barber_points = COALESCE(barber_points, 0) + p_points,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_barber_points TO authenticated;
GRANT EXECUTE ON FUNCTION increment_barber_points TO service_role;