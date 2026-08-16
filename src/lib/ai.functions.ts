import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatWithAI(messages: ChatMessage[]) {
  // 1. Fetch Dynamic Data for Context
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes");
  const { data: barbers } = await supabase.from("barbers").select("id, full_name, specialties");

  const servicesContext =
    services?.map((s) => `- ${s.name}: R$ ${s.price} (${s.duration_minutes} min)`).join("\n") ||
    "Indisponível";
  const barbersContext =
    barbers
      ?.map((b) => `- ${b.full_name}: ${b.specialties?.join(", ") || "Barbeiro"}`)
      .join("\n") || "Indisponível";

  const systemPrompt = `Você é Royal, o assistente virtual da The Royal Cut Barbearia do Thiago.
Seja fraternal, respeitoso e eficiente. Reflita os valores de honra e cavalheirismo.

SERVIÇOS DISPONÍVEIS:
${servicesContext}

BARBEIROS DA CASA:
${barbersContext}

Responda sempre em Português do Brasil.`;

  // 2. Fetch API Keys from system_settings
  // This now works on client-side because of the new RLS policy
  const { data: settings } = await supabase.from("system_settings").select("key, value");

  const getSetting = (key: string) => {
    const setting = settings?.find((s) => s.key === key)?.value;
    if (!setting) return null;
    try {
      const parsed = typeof setting === "string" ? JSON.parse(setting) : setting;
      return typeof parsed === "string" ? parsed : JSON.stringify(parsed).replace(/^"|"$/g, "");
    } catch (e) {
      return String(setting).replace(/^"|"$/g, "");
    }
  };

  const geminiKeys = [
    getSetting("gemini_api_key_1") || getSetting("gemini_key_1"),
    getSetting("gemini_api_key_2") || getSetting("gemini_key_2"),
    getSetting("gemini_api_key_3") || getSetting("gemini_key_3"),
  ].filter(Boolean) as string[];

  const groqKeys = [
    getSetting("groq_api_key_1") || getSetting("groq_key_1"),
    getSetting("groq_api_key_2") || getSetting("groq_key_2"),
    getSetting("groq_api_key_3") || getSetting("groq_key_3"),
  ].filter(Boolean) as string[];

  console.log(`Found ${geminiKeys.length} Gemini keys and ${groqKeys.length} Groq keys`);

  // Gemini API requires the first message to be 'user'
  let validHistory = [...messages];
  while (validHistory.length > 0 && validHistory[0]?.role !== "user") {
    validHistory.shift();
  }
  const history = validHistory.slice(-10);

  // 3. Fallback Cascade Logic

  // 3a. Try Gemini Keys
  for (const key of geminiKeys) {
    try {
      console.log(`Attempting Gemini with key...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: history.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log("Gemini success");
          return { content: text, metadata: null };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Gemini API error (${response.status}):`, errorData);
      }
    } catch (error) {
      console.error("Gemini fetch failed:", error);
    }
  }

  // 3b. Try Groq Keys
  for (const key of groqKeys) {
    try {
      console.log(`Attempting Groq with key...`);
      const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...history],
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.choices?.[0]?.message?.content;
        if (text) {
          console.log("Groq success");
          return { content: text, metadata: null };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Groq API error (${response.status}):`, errorData);
      }
    } catch (error) {
      console.error("Groq fetch failed:", error);
    }
  }

  // 4. Ultimate Fallback
  return {
    content:
      "Olá! No momento estou passando por uma manutenção técnica em meus circuitos, mas o Thiago e a equipe Royal estão prontos para te atender. Como posso ajudar com informações básicas?",
    metadata: null,
  };
}
