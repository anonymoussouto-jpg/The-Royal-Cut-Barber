CREATE TABLE public.github_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL, -- 'success', 'error'
    message TEXT,
    details JSONB, -- list of files, errors, etc
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.github_sync_logs TO authenticated;
GRANT ALL ON public.github_sync_logs TO service_role;

ALTER TABLE public.github_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
    ON public.github_sync_logs
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
