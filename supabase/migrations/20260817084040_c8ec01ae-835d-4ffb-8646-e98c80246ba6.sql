-- 1. Restrict system_settings anonymous access
DROP POLICY IF EXISTS "Anyone can read api keys and public settings" ON public.system_settings;
CREATE POLICY "Public settings access" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (
  key IN (
    'pix_key',
    'whatsapp_number',
    'address',
    'barber_shop_name'
  )
);

-- 2. Secure transformations RLS
DROP POLICY IF EXISTS "Anyone can view transformations" ON public.transformations;
CREATE POLICY "Anyone can view transformations"
    ON public.transformations FOR SELECT
    TO authenticated, anon
    USING (true);

-- 3. Ensure has_role is secure and only used where needed
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4. Secure audit_logs access
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Harden orders RLS to prevent unauthorized view
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order" ON public.orders
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = client_id OR public.has_role(auth.uid(), 'admin'));
