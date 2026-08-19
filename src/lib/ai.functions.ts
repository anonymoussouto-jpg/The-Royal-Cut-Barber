import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getAiSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    // Only fetch public settings by default. 
    // Private keys are fetched inside the specific AI handler to avoid exposure.
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["whatsapp_number", "address", "barber_shop_name"]);

    if (error) throw error;
    return data;
  }
);

export const getChatbotResponse = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({
      messages: z.array(z.object({ role: z.string(), content: z.string() })),
      servicesContext: z.string(),
      barbersContext: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allSettings } = await supabaseAdmin
      .from("system_settings")
      .select("key, value");

    const getSetting = (key: string) => {
      const row = allSettings?.find((s) => s.key === key);
      if (!row) return "";
      const val = row.value;
      try {
        const parsed = typeof val === "string" && (val.startsWith('"') || val.startsWith("{") || val.startsWith("[")) ? JSON.parse(val) : val;
        return typeof parsed === "string" ? parsed.trim() : String(parsed).trim();
      } catch {
        return String(val).trim();
      }
    };

    const aiSystemPrompt = getSetting("ai_system_prompt");
    const aiDelay = parseInt(getSetting("ai_response_delay_ms") || "20", 10);
    const aiMaxChars = getSetting("ai_max_chars");
    const aiMaxMessages = getSetting("ai_max_messages");

    let finalSystemPrompt = aiSystemPrompt || `Você é a Royal IA, assistente virtual da The Royal Cut. Atenda com excelência, honra e cavalheirismo.`;
    finalSystemPrompt += `\n\nDADOS DA BARBEARIA:\nSERVIÇOS: ${data.servicesContext}\nEQUIPE: ${data.barbersContext}`;
    
    if (aiMaxChars) finalSystemPrompt += `\n- REGRA: Não ultrapasse ${aiMaxChars} caracteres.`;
    if (aiMaxMessages) finalSystemPrompt += `\n- REGRA: Limite a no máximo ${aiMaxMessages} blocos de resposta.`;

    if (aiDelay > 0) await new Promise((r) => setTimeout(r, aiDelay));

    const geminiKeys = [
      getSetting("gemini_api_key_1"),
      getSetting("gemini_api_key_2"),
      getSetting("gemini_api_key_3"),
    ].filter(Boolean);

    const groqKeys = [
      getSetting("groq_api_key_1"),
      getSetting("groq_api_key_2"),
    ].filter(Boolean);

    let history = [...data.messages];
    while (history.length > 0 && history[0] && history[0].role !== "user") history.shift();
    if (history.length === 0) return { content: "Olá! Como posso ajudar?" };

    for (const key of geminiKeys) {
      try {
        const geminiHistory = history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiHistory,
              systemInstruction: { parts: [{ text: finalSystemPrompt }] },
            }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { content: text };
        }
      } catch (e) {
        console.error("Gemini key failed:", e);
      }
    }

    for (const key of groqKeys) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: finalSystemPrompt },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) return { content: text };
        }
      } catch (e) {
        console.error("Groq key failed:", e);
      }
    }

    return {
      content: "Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes.",
    };
  });
