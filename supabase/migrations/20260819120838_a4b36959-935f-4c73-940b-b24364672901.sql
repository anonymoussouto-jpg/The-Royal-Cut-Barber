CREATE TABLE IF NOT EXISTS public.github_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL, -- 'success', 'error'
    message TEXT,
    details JSONB, -- list of files, errors, etc
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.github_sync_logs TO authenticated;
GRANT ALL ON public.github_sync_logs TO service_role;

ALTER TABLE public.github_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all logs" ON public.github_sync_logs;
CREATE POLICY "Admins can view all logs"
    ON public.github_sync_logs
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.github_sync_logs;
CREATE POLICY "Users can insert their own logs"
    ON public.github_sync_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Garantir acesso ao perfil para o join
GRANT SELECT ON public.profiles TO authenticated;