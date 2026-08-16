-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. USER ROLES
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. SECURITY DEFINER FUNCTION
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    barber_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. SERVICES
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    category TEXT, -- 'Cuts', 'Experience', etc.
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view services" ON public.services
    FOR SELECT TO anon, authenticated USING (true);

-- 6. BARBERS
CREATE TABLE public.barbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    specialties TEXT[],
    schedule JSONB, -- { "monday": ["09:00", "18:00"], ... }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.barbers TO anon, authenticated;
GRANT ALL ON public.barbers TO service_role;

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view barbers" ON public.barbers
    FOR SELECT TO anon, authenticated USING (true);

-- 7. APPOINTMENTS
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) NOT NULL,
    barber_id UUID REFERENCES public.barbers(id) NOT NULL,
    service_id UUID REFERENCES public.services(id) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'cancelled', 'completed'
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments" ON public.appointments
    FOR SELECT TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "Users can book appointments" ON public.appointments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can view all appointments" ON public.appointments
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. PRODUCTS
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    image_url TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view products" ON public.products
    FOR SELECT TO anon, authenticated USING (true);

-- 9. SYSTEM SETTINGS
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- SEED DATA (MOCKS)
INSERT INTO public.services (name, description, price, duration_minutes, category) VALUES
('Classic Fade', 'Traditional taper fade with razor finish', 80.00, 45, 'Cuts'),
('Barboterapia', 'Hot towel shave with essential oils and massage', 120.00, 60, 'Experience'),
('Royal Grooming', 'Full hair cut and beard therapy experience', 180.00, 90, 'Experience');

INSERT INTO public.barbers (full_name, bio, specialties) VALUES
('Master Barber John', '15 years of experience in classic cuts', ARRAY['Fade', 'Scissors', 'Razor']),
('Victor "Gold Hands"', 'Specialist in beard therapy and grooming', ARRAY['Barboterapia', 'Hot Towel']);

INSERT INTO public.products (name, description, price, stock_quantity, category) VALUES
('Premium Pomade', 'Strong hold, matte finish pomade', 65.00, 50, 'Grooming'),
('Beard Oil', 'Sandalwood scented organic beard oil', 85.00, 30, 'Grooming');

INSERT INTO public.system_settings (key, value) VALUES
('pix_config', '{"key": "financeiro@royalcut.com", "bank": "Royal Bank"}'),
('ai_fallback', '{"enabled": true, "providers": ["gemini", "groq"]}');