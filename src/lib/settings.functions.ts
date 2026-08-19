import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const saveSystemSetting = createServerFn({ method: "POST" })
  .validator((data: any) => 
    z.object({
      key: z.string().min(1, "A chave de configuração é obrigatória"),
      value: z.string().nullable(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    console.log(`[AdminSettings] Iniciando salvamento: key=${data.key}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    let finalValue = data.value;
    
    // Basic validation for common keys
    if (data.key.includes("api_key") || data.key.includes("secret") || data.key.includes("token")) {
      console.log(`[AdminSettings] Processando chave sensível: ${data.key}`);
      finalValue = finalValue?.trim() || "";
      
      if (data.key.includes("gemini") && finalValue && !finalValue.startsWith("AI")) {
        console.warn(`[AdminSettings] Aviso: Chave Gemini '${data.key}' não começa com o prefixo esperado 'AI'`);
      }
    }

    const { error, data: result } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        { 
          key: data.key, 
          value: finalValue,
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
    console.log(`[validateAiKey] Validando ${data.provider}`);
    const key = data.key.trim();
    
    if (data.provider === "gemini") {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
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
          console.error(`[validateAiKey] Gemini Error:`, json);
          return { 
            valid: false, 
            message: json.error?.message || "Chave Gemini inválida ou sem permissão" 
          };
        }
        return { valid: true };
      } catch (e) {
        console.error(`[validateAiKey] Gemini Connection Error:`, e);
        return { valid: false, message: "Erro ao conectar com a API do Gemini" };
      }
    } else if (data.provider === "groq") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          console.error(`[validateAiKey] Groq Error:`, json);
          return { 
            valid: false, 
            message: json.error?.message || "Chave Groq inválida ou expirada" 
          };
        }
        return { valid: true };
      } catch (e) {
        console.error(`[validateAiKey] Groq Connection Error:`, e);
        return { valid: false, message: "Erro ao conectar com a API do Groq" };
      }
    }
    return { valid: false, message: "Provedor desconhecido" };
  });
