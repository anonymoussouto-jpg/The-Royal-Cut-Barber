import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

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
  .validator((data: { message: string; history: any[] }) => data)
  .handler(async ({ data }) => {
    const { message, history } = data;

    // Fetch keys from a secure server context
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value");

    const geminiKeys =
      settings
        ?.filter((s) => s.key.startsWith("gemini_"))
        .map((s) => s.value as string) || [];
    const groqKeys =
      settings
        ?.filter((s) => s.key.startsWith("groq_"))
        .map((s) => s.value as string) || [];

    const systemPrompt = settings?.find((s) => s.key === "ai_behavior")?.value as string || 
      "Você é o assistente virtual da barbearia The Royal Cut. Seja educado, use um tom de 'Excelência' e 'Honra'.";

    // 1. Try Gemini
    for (const key of geminiKeys) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [...history, { role: "user", parts: [{ text: message }] }],
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { content: text };
        }
      } catch (e) {
        // Silent fail to next key
      }
    }

    // 2. Try Groq
    for (const key of groqKeys) {
      try {
        const response = await fetch(
          `https://api.groq.com/openai/v1/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content;
          if (text) return { content: text };
        }
      } catch (e) {
        // Silent fail to next key
      }
    }

    return {
      content: "Olá! No momento estou passando por uma manutenção técnica, mas a equipe Royal está pronta para te atender via WhatsApp.",
    };
  });
