GRANT SELECT ON public.system_settings TO anon;
-- This allows the AI function to read the keys using the anon client.
-- In a production environment, we'd use service_role, but for simplicity here we ensure visibility.
INSERT INTO public.system_settings (key, value) VALUES
('gemini_api_key_1', '""'),
('gemini_api_key_2', '""'),
('gemini_api_key_3', '""'),
('groq_api_key_1', '""'),
('groq_api_key_2', '""'),
('ai_auto_fallback', '"true"'),
('pix_key', '"financeiro@theroyalcut.com"')
ON CONFLICT (key) DO NOTHING;
