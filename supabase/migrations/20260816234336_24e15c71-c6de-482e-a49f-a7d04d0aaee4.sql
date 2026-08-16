-- Migration to allow anonymous reading of public API keys and settings
CREATE POLICY "Anyone can read api keys and public settings" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (
  key IN (
    'gemini_api_key_1', 'gemini_key_1',
    'gemini_api_key_2', 'gemini_key_2',
    'gemini_api_key_3', 'gemini_key_3',
    'groq_api_key_1', 'groq_key_1',
    'groq_api_key_2', 'groq_key_2',
    'groq_api_key_3', 'groq_key_3',
    'pix_key',
    'whatsapp_number',
    'address'
  )
);

GRANT SELECT ON public.system_settings TO anon, authenticated;
