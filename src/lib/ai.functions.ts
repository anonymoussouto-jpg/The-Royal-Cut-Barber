import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const getAiSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
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
    console.log("[Chatbot] Fetching settings...");
    const { data: allSettings, error: settingsError } = await supabaseAdmin
      .from("system_settings")
      .select("key, value");

    if (settingsError) {
      console.error("[Chatbot] Error fetching settings:", settingsError);
      return { content: "Erro ao acessar configurações do sistema." };
    }

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
    const aiMaxChars = getSetting("ai_max_chars");

    let finalSystemPrompt = aiSystemPrompt || `Você é a Royal IA, assistente virtual da The Royal Cut. Atenda com excelência, honra e cavalheirismo.`;
    finalSystemPrompt += `\n\nDADOS DA BARBEARIA:\nSERVIÇOS: ${data.servicesContext}\nEQUIPE: ${data.barbersContext}`;
    if (aiMaxChars) finalSystemPrompt += `\n- REGRA: Não ultrapasse ${aiMaxChars} caracteres.`;

    const geminiKeys = [
      getSetting("gemini_api_key_1"),
      getSetting("gemini_api_key_2"),
      getSetting("gemini_api_key_3"),
    ].filter(Boolean);

    const groqKeys = [
      getSetting("groq_api_key_1"),
      getSetting("groq_api_key_2"),
    ].filter(Boolean);

    console.log(`[Chatbot] Gemini keys: ${geminiKeys.length}, Groq keys: ${groqKeys.length}`);

    let history = [...data.messages];
    while (history.length > 0 && history[0] && history[0].role !== "user") history.shift();
    if (history.length === 0) return { content: "Olá! Como posso ajudar?" };

    // Try Gemini
    for (const key of geminiKeys) {
      try {
        console.log("[Chatbot] Trying Gemini...");
        const geminiHistory = history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        
        const payload = {
          contents: geminiHistory,
          system_instruction: { parts: [{ text: finalSystemPrompt }] },
          generationConfig: {
            maxOutputTokens: aiMaxChars ? parseInt(aiMaxChars) : 150,
            temperature: 0.7,
          }
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log("[Chatbot] Gemini Success");
            return { content: text };
          }
        } else {
          const err = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
          console.error(`[Chatbot] Gemini API Error (${res.status}):`, err);
          
          if (res.status === 404) {
             console.log("[Chatbot] Gemini v1beta 404, trying v1...");
             const v1Res = await fetch(
              `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    { role: "user", parts: [{ text: `INSTRUÇÃO DE SISTEMA: ${finalSystemPrompt}` }] },
                    ...geminiHistory
                  ]
                }),
              }
            );
            if (v1Res.ok) {
              const v1Json = await v1Res.json();
              const v1Text = v1Json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (v1Text) return { content: v1Text };
            }
          }
        }
      } catch (e) {
        console.error("[Chatbot] Gemini connection error:", e);
      }
    }

    // Fallback to Groq
    for (const key of groqKeys) {
      try {
        console.log("[Chatbot] Trying Groq...");
        const groqModel = "llama-3.3-70b-versatile";
        
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: "system", content: finalSystemPrompt },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ],
            max_tokens: aiMaxChars ? parseInt(aiMaxChars) : 150,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) {
            console.log("[Chatbot] Groq Success");
            return { content: text };
          }
        } else {
          const err = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
          console.error(`[Chatbot] Groq API Error (${res.status}):`, err);
          
          if (err.error?.code === "model_not_found") {
             console.log("[Chatbot] Groq model not found, trying llama-3.1-70b-versatile...");
             const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                  { role: "system", content: finalSystemPrompt },
                  ...history.map((m) => ({ role: m.role, content: m.content })),
                ],
              }),
            });
            if (res2.ok) {
              const json2 = await res2.json();
              return { content: json2.choices?.[0]?.message?.content };
            }
          }
        }
      } catch (e) {
        console.error("[Chatbot] Groq connection error:", e);
      }
    }

    return {
      content: "Desculpe, não consegui processar sua mensagem agora. Tente novamente em instantes.",
    };
  });
