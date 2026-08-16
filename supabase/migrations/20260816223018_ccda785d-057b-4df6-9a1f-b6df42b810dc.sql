-- Create transformations table
CREATE TABLE public.transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    style_tag TEXT,
    is_highlighted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant access
GRANT ALL ON public.transformations TO authenticated;
GRANT ALL ON public.transformations TO service_role;
GRANT SELECT ON public.transformations TO anon;

-- Enable RLS
ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;

-- Policies for transformations
CREATE POLICY "Barbers can insert their own transformations"
    ON public.transformations FOR INSERT
    TO authenticated
    WITH CHECK (
        barber_id IN (
            SELECT id FROM public.barbers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can update their own transformations"
    ON public.transformations FOR UPDATE
    TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM public.barbers WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        barber_id IN (
            SELECT id FROM public.barbers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can delete their own transformations"
    ON public.transformations FOR DELETE
    TO authenticated
    USING (
        barber_id IN (
            SELECT id FROM public.barbers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view transformations"
    ON public.transformations FOR SELECT
    TO authenticated, anon
    USING (true);

-- Storage policies (assuming bucket 'transformations' is created manually or via tool)
CREATE POLICY "Public Access Transformations"
ON storage.objects FOR SELECT
USING ( bucket_id = 'transformations' );

CREATE POLICY "Authenticated users can upload transformations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'transformations' );

CREATE POLICY "Users can delete their own transformation images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'transformations' );
