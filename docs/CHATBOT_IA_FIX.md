# Royal IA — Configuração que funciona (registro de correção)

Data: 19/08/2026

## Sintoma
Chatbot respondia sempre "Desculpe, não consegui processar agora. Tente novamente. 🔱"

## Causa raiz
Nada estava errado no código de fallback nem no Supabase.
Os **modelos das APIs externas foram descontinuados**:

- Gemini: `gemini-1.5-flash` → 404 em `v1` e `v1beta`
  ("is not found for API version...")
- Gemini: `gemini-2.5-flash` / `gemini-2.0-flash` → "no longer available"
- Groq: `llama-3.3-70b-versatile` / `llama-3.1-70b-versatile` → "decommissioned"

## Como diagnosticar de novo (rápido)
1. Admin > Configurações > aba **Chatbot IA** > painel de diagnóstico
   (mostra o log real de cada chave em `system_settings.chatbot_last_log`).
2. Listar modelos válidos para as chaves atuais:

```bash
# Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models?key=SUA_CHAVE"

# Groq
curl -H "Authorization: Bearer SUA_CHAVE" https://api.groq.com/openai/v1/models
```

3. Trocar o nome do modelo em `src/lib/ai.functions.ts` por um da lista.

## Configuração funcionando hoje
Arquivo: `src/lib/ai.functions.ts`

- Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=...`
  (usado no teste de chave e na resposta; hoje as 3 chaves Gemini estão
  com service account desativada, então o fallback cai no Groq)
- Groq: `POST https://api.groq.com/openai/v1/chat/completions`
  com `model: "qwen/qwen3.6-27b"` → **este é o que está respondendo**
- Ordem de fallback: gemini_api_key_1..3 → groq_api_key_1..2
- Cada tentativa é registrada em `chatbot_last_log` (chave, provider,
  status, tempo, erro).
- As respostas passam por limpeza de raciocínio interno:
  `text.replace(/<[tT]hink>[\s\S]*?<\/[tT]hink>/g, '').trim()`
  (o Qwen devolve bloco `<think>` que não deve aparecer ao cliente).

## Regras que não devem ser quebradas
- `supabaseAdmin` só via **import dinâmico dentro do handler**
  (`const { supabaseAdmin } = await import("@/integrations/supabase/client.server")`),
  senão quebra o bundle do cliente.
- Nunca voltar para `gemini-1.5-flash` nem `llama-3.x-70b-versatile`.
- Sempre manter o fallback percorrendo TODAS as chaves antes de falhar.
