-- Revoke anon access to system_settings to protect API keys
REVOKE SELECT ON public.system_settings FROM anon;

-- Ensure RLS is enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy for Admins
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Grant access to service_role (used by server functions via supabaseAdmin)
GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT ON public.system_settings TO authenticated;

-- Audit logs for security tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));