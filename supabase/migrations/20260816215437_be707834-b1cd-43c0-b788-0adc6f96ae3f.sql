-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    plan_name TEXT NOT NULL, -- 'Membro Fiel', 'Aliança Royal', 'Irmandade Plena'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    barber_points_monthly INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grants
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Hardening the calculate_barber_points function (Fixing linter warn)
ALTER FUNCTION public.calculate_barber_points() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.calculate_barber_points() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_barber_points() TO service_role;
