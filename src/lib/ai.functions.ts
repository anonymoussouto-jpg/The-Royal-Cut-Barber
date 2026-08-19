import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAiSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("key, value")
      .in("key", ["whatsapp_number", "address", "barber_shop_name"]);
    if (error) throw error;
    return data;
  }
);

export const testApiKey = createServerFn({ method: "POST" })
  .validator((data) => z.object({ keyName: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { keyName } = data;
    const { data: row } = await (supabaseAdmin as any)
      .from("system_settings").select("value").eq("key", keyName).maybeSingle();
    if (!row?.value) return { status: "error" as const, message: `Chave '${keyName}' não encontrada. Salve-a primeiro.`, responseTime: 0 };
    let apiKey = row.value;
    try { apiKey = typeof apiKey === "string" && (apiKey.startsWith('"') || apiKey.startsWith("{")) ? JSON.parse(apiKey) : apiKey; apiKey = String(apiKey).trim(); } catch { apiKey = String(apiKey).trim(); }
    if (!apiKey) return { status: "error" as const, message: "Chave vazia.", responseTime: 0 };
    const t0 = performance.now();
    if (keyName.startsWith("gemini")) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Responda apenas: OK" }] }], generationConfig: { maxOutputTokens: 5 } }) });
        const elapsed = Math.round(performance.now() - t0);
        if (res.ok) { const j = await res.json(); return { status: "ok" as const, message: `Gemini OK (${elapsed}ms): "${j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "OK"}"`, responseTime: elapsed }; }
        const e = await res.json().catch(() => ({ error: { message: "Erro" } }));
        return { status: "error" as const, message: `Gemini erro ${res.status}: ${e.error?.message}`, responseTime: elapsed };
      } catch (e: any) { return { status: "error" as const, message: `Falha Gemini: ${e?.message}`, responseTime: Math.round(performance.now() - t0) }; }
    }
    if (keyName.startsWith("groq")) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "qwen/qwen3.6-27b", messages: [{ role: "user", content: "Responda apenas: OK" }], max_tokens: 5 }) });
        const elapsed = Math.round(performance.now() - t0);
        if (res.ok) { const j = await res.json(); return { status: "ok" as const, message: `Groq OK (${elapsed}ms): "${j.choices?.[0]?.message?.content?.trim() || "OK"}"`, responseTime: elapsed }; }
        const e = await res.json().catch(() => ({ error: { message: "Erro" } }));
        return { status: "error" as const, message: `Groq erro ${res.status}: ${e.error?.message}`, responseTime: elapsed };
      } catch (e: any) { return { status: "error" as const, message: `Falha Groq: ${e?.message}`, responseTime: Math.round(performance.now() - t0) }; }
    }
    return { status: "error" as const, message: `Tipo não suportado: ${keyName}`, responseTime: 0 };
  });

export const getChatbotResponse = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({
      messages: z.array(z.object({ role: z.string(), content: z.string() })),
      servicesContext: z.string(),
      barbersContext: z.string(),
      productsContext: z.string().optional().default(''),
      shopContext: z.string().optional().default(''),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const keysTried: any[] = [];
    const saveLog = async (log: any) => { try { await (supabaseAdmin as any).from("system_settings").upsert({ key: "chatbot_last_log", value: JSON.stringify({ timestamp: new Date().toISOString(), keys_tried: keysTried, ...log }) }, { onConflict: "key" }); } catch {} };
    const { data: allSettings, error: settingsError } = await (supabaseAdmin as any).from("system_settings").select("key, value");
    if (settingsError || !allSettings?.length) { await saveLog({ success: false, error: settingsError?.message || "Sem dados" }); return { content: "⚠️ A Royal IA está em manutenção. Verifique as configurações no Admin." }; }
    const getSetting = (key: string) => { const row = allSettings.find((s: any) => s.key === key); if (!row) return ""; const val = row.value; try { const p = typeof val === "string" && (val.startsWith('"') || val.startsWith("{") || val.startsWith("[")) ? JSON.parse(val) : val; return typeof p === "string" ? p.trim() : String(p).trim(); } catch { return String(val).trim(); } };
    const aiSystemPrompt = getSetting("ai_system_prompt");
    const aiMaxChars = getSetting("ai_max_chars");
    const aiDelay = parseInt(getSetting("ai_response_delay_ms") || "0");
    let prompt = aiSystemPrompt ||
      `IDENTIDADE: Você é a Royal IA, secretária virtual da The Royal Cut Barber, barbearia cristã do Thiago. Missão: excelência, cuidado e fé.
    ESTILO OBRIGATÓRIO:
    - Máx 150 caracteres por mensagem
    - Separe múltiplas mensagens com ||
    - Máx 3 mensagens por vez
    - Aguarde resposta antes de continuar
    - Direto, acolhedor, humanizado. Nunca invente dados.
    SAUDAÇÃO INICIAL:
    "Olá! 👑 Bem-vindo à Royal Cut!" || "Como posso servir você hoje?" || [OPCOES: Agendar|Serviços|Preços|Localização]
    FLUXO DE AGENDAMENTO:
    1) Pergunte qual serviço (liste os disponíveis)
    2) Pergunte qual barbeiro (liste os disponíveis)
    3) Pergunte que dia prefere
    4) Mostre horários livres naquele dia
    5) Peça nome completo e WhatsApp
    6) Confirme com resumo e inclua: [AGENDAR:Barbeiro|Servico|YYYY-MM-DD|HH:MM|Nome|Telefone]
    FLUXO DE DÚVIDAS:
    Use apenas os dados fornecidos. Para casos complexos: direcione ao WhatsApp.
    FÉ CRISTÃ:
    Use "Com a graça de Deus", "Deus abençoe" naturalmente, sem exagero.
    QUICK REPLIES:
    Ao final quando fizer sentido: [OPCOES: op1|op2|op3|op4]
    Máx 4 opções, cada uma máx 25 caracteres.`;
    prompt += `\n\nSERVIÇOS (nome, preço, duração): ${data.servicesContext}`;
    prompt += `\nBARBEIROS DISPONÍVEIS: ${data.barbersContext}`;
    if (data.productsContext) prompt += `\nPRODUTOS DA LOJA: ${data.productsContext}`;
    if (data.shopContext) prompt += `\nINFO DA BARBEARIA: ${data.shopContext}`;
    if (aiMaxChars) prompt += `\n- Não ultrapasse ${aiMaxChars} caracteres.`;
    const gemini = ["gemini_api_key_1","gemini_api_key_2","gemini_api_key_3"].map(n => ({ name: n, key: getSetting(n) })).filter(e => e.key);
    const groq = ["groq_api_key_1","groq_api_key_2"].map(n => ({ name: n, key: getSetting(n) })).filter(e => e.key);
    if (!gemini.length && !groq.length) { await saveLog({ success: false, error: "Nenhuma chave cadastrada." }); return { content: "Olá! Sou a Royal IA. Administrador precisa cadastrar chaves Gemini ou Groq em Configurações. 🔱" }; }
    let history = [...data.messages];
    while (history.length > 0 && history[0]?.role !== "user") history.shift();
    if (!history.length) return { content: "Olá! Como posso ajudar?" };
    if (aiDelay > 0) await new Promise(r => setTimeout(r, aiDelay));
    for (const item of gemini) {
      const t0 = performance.now();
      try {
        const historyForGemini = history.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
        const geminiPayload = {
          contents: [
            { role: "user", parts: [{ text: `INSTRUÇÃO DE SISTEMA (ATUE COM ESTA PERSONALIDADE): ${prompt}` }] },
            ...historyForGemini
          ],
          generationConfig: { 
            maxOutputTokens: aiMaxChars ? parseInt(aiMaxChars) : 1000, 
            temperature: 0.7 
          }
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${item.key}`, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify(geminiPayload) 
        });
        const elapsed = Math.round(performance.now() - t0);
        if (res.ok) { 
          const j = await res.json(); 
          let text = j.candidates?.[0]?.content?.parts?.[0]?.text; 
          if (text) { 
            text = text.replace(/<[tT]hink>[\s\S]*?<\/[tT]hink>/g, '').trim(); 
            keysTried.push({ keyName: item.name, provider: "gemini", status: "success", responseTimeMs: elapsed }); 
            await saveLog({ success: true, provider_used: item.name, preview_response: text.slice(0, 150) }); 
            return { content: text }; 
          } 
        }

        else { const e = await res.json().catch(() => ({ error: { message: "Erro" } })); keysTried.push({ keyName: item.name, provider: "gemini", status: "error", responseTimeMs: elapsed, error: e.error?.message }); }
      } catch (e: any) { keysTried.push({ keyName: item.name, provider: "gemini", status: "error", responseTimeMs: Math.round(performance.now() - t0), error: e?.message }); }
    }
    for (const item of groq) {
      const t0 = performance.now();
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { 
          method: "POST", 
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${item.key}` 
          }, 
          body: JSON.stringify({ 
            model: "qwen/qwen3.6-27b", 



            messages: [{ role: "system", content: prompt }, ...history], 
            max_tokens: aiMaxChars ? parseInt(aiMaxChars) : 1000 
          }) 
        });
        const elapsed = Math.round(performance.now() - t0);
        if (res.ok) { 
          const j = await res.json(); 
          let text = j.choices?.[0]?.message?.content; 
          if (text) { 
            text = text.replace(/<[tT]hink>[\s\S]*?<\/[tT]hink>/g, '').trim(); 
            keysTried.push({ keyName: item.name, provider: "groq", status: "success", responseTimeMs: elapsed }); 
            await saveLog({ success: true, provider_used: item.name, preview_response: text.slice(0, 150) }); 
            return { content: text }; 
          } 
        }

        else { const e = await res.json().catch(() => ({ error: { message: "Erro" } })); keysTried.push({ keyName: item.name, provider: "groq", status: "error", responseTimeMs: elapsed, error: e.error?.message }); }
      } catch (e: any) { keysTried.push({ keyName: item.name, provider: "groq", status: "error", responseTimeMs: Math.round(performance.now() - t0), error: e?.message }); }
    }
    await saveLog({ success: false, error: "Todas as chaves falharam." });
    return { content: "Desculpe, não consegui processar agora. Tente novamente. 🔱" };
  });

export const getAvailableSlots = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({
      barberId: z.string(),
      date: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const allSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
      "19:00", "19:30"
    ];

    const dayStart = new Date(`${data.date}T00:00:00`);
    const dayEnd = new Date(`${data.date}T23:59:59`);

    const { data: bookedAppts } = await (supabaseAdmin as any)
      .from("appointments")
      .select("start_time")
      .eq("barber_id", data.barberId)
      .neq("status", "cancelled")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    const blockedSlots = new Set<string>();
    for (const appt of (bookedAppts || [])) {
      const start = new Date(appt.start_time);
      blockedSlots.add(
        `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      );
    }

    const available = allSlots.filter(slot => !blockedSlots.has(slot));

    return {
      available,
      date: data.date,
      total: available.length,
    };
  });