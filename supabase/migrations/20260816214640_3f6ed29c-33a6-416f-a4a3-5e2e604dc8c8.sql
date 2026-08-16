-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    items JSONB NOT NULL, -- Array of products: { id, name, price, quantity, image }
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'pix' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'cancelled', 'shipped', 'delivered'
    pix_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "Anyone can create an order" ON public.orders
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
