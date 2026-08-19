import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const saveSystemSetting = createServerFn({ method: "POST" })
  .validator((data: any) => 
    z.object({
      key: z.string().min(1, "A chave de configuração é obrigatória"),
      value: z.string().min(1, "O valor da configuração não pode estar vazio"),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    console.log(`[AdminSettings] Iniciando salvamento: key=${data.key}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Basic validation for common keys
    if (data.key.includes("api_key") || data.key.includes("secret") || data.key.includes("token")) {
      console.log(`[AdminSettings] Processando chave sensível: ${data.key}`);
      data.value = data.value.trim();
      
      if (data.key.includes("gemini") && !data.value.startsWith("AI")) {
        console.warn(`[AdminSettings] Aviso: Chave Gemini '${data.key}' não começa com o prefixo esperado 'AI'`);
      }
    }

    const { error, data: result } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        { 
          key: data.key, 
          value: data.value,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )
      .select();

    if (error) {
      console.error(`[AdminSettings] ERRO CRÍTICO ao salvar ${data.key}:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Erro no banco de dados (${error.code}): ${error.message}`);
    }

    console.log(`[AdminSettings] Sucesso ao salvar ${data.key}. Dados retornados:`, result?.[0]);
    return { success: true };
  });

export const validateAiKey = createServerFn({ method: "POST" })
  .validator((data: any) => 
    z.object({
      provider: z.enum(["gemini", "groq"]),
      key: z.string().min(1, "Chave é obrigatória"),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    if (data.provider === "gemini") {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${data.key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "ping" }] }],
            }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          return { 
            valid: false, 
            message: json.error?.message || "Chave Gemini inválida ou sem permissão" 
          };
        }
        return { valid: true };
      } catch (e) {
        return { valid: false, message: "Erro ao conectar com a API do Gemini" };
      }
    } else if (data.provider === "groq") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.key}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          return { 
            valid: false, 
            message: json.error?.message || "Chave Groq inválida ou expirada" 
          };
        }
        return { valid: true };
      } catch (e) {
        return { valid: false, message: "Erro ao conectar com a API do Groq" };
      }
    }
    return { valid: false, message: "Provedor desconhecido" };
  });
