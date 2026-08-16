import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// This will be handled on the server
export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string()
    }))
  }).parse(data))
  .handler(async ({ data }) => {
    // In a real environment, we would fetch keys from system_settings
    // For now, we'll try to get them from environment variables or settings
    
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value');
    
    const getSetting = (key: string) => {
      const setting = settings?.find(s => s.key === key)?.value;
      if (!setting) return null;
      try {
        if (typeof setting === 'string') {
          return JSON.parse(setting);
        }
      } catch (e) {
        return setting;
      }
      return setting;
    };

    const geminiKeys = [
      process.env['GEMINI_API_KEY'],
      getSetting('gemini_api_key_1'),
      getSetting('gemini_api_key_2'),
      getSetting('gemini_api_key_3')
    ].filter(Boolean) as string[];

    const groqKeys = [
      process.env['GROQ_API_KEY'],
      getSetting('groq_api_key_1'),
      getSetting('groq_api_key_2')
    ].filter(Boolean) as string[];

    // Fetch dynamic info from DB for the prompt
    const { data: services } = await supabase.from('services').select('name, price, duration_minutes');
    const { data: barbers } = await supabase.from('barbers').select('full_name, specialties');

    const servicesContext = services?.map(s => `- ${s.name}: R$ ${s.price} (${s.duration_minutes} min)`).join('\n') || 'Informação de serviços indisponível no momento.';
    const barbersContext = barbers?.map(b => `- ${b.full_name}: ${b.specialties?.join(', ') || 'Barbeiro Master'}`).join('\n') || 'Informação de barbeiros indisponível no momento.';

    // System prompt with business context
    const systemPrompt = `Você é Royal, o assistente virtual da The Royal Cut Barbearia do Thiago. 
Seja acolhedor, respeitoso e gentil, como um irmão que cuida de outro. Use linguagem natural, calorosa e brasileira. 
Demonstre os valores de excelência e cuidado que caracterizam a barbearia. Nunca use linguagem rude. 
Você pode agendar horários, informar preços, explicar os planos do clube e enviar a chave PIX.

SERVIÇOS DISPONÍVEIS:
${servicesContext}

BARBEIROS DA CASA:
${barbersContext}

DIRETRIZES:
1. Responda de forma fraternal e prestativa.
2. Reflita os valores de honra, excelência e irmandade.
3. Se o cliente quiser agendar, peça para ele informar o serviço, barbeiro de preferência, data e horário.
4. Mantenha as respostas concisas e educadas.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...data.messages
    ];

    async function tryGemini(keys: string[]) {
      for (const key of keys) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: fullMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))
            })
          });

          if (!response.ok) continue;
          const result = await response.json();
          if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
          }
        } catch (e) {
          console.error(`Gemini key failed:`, e);
        }
      }
      throw new Error('All Gemini keys failed');
    }

    async function tryGroq(keys: string[]) {
      for (const key of keys) {
        try {
          const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: "llama3-70b-8192",
              messages: fullMessages,
              temperature: 0.7
            })
          });

          if (!response.ok) continue;
          const result = await response.json();
          if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
          }
        } catch (e) {
          console.error(`Groq key failed:`, e);
        }
      }
      throw new Error('All Groq keys failed');
    }

    try {
      if (geminiKeys.length > 0) {
        const content = await tryGemini(geminiKeys);
        return { content };
      }
    } catch (e) {
      console.log('Gemini failed, falling back to Groq...');
    }

    try {
      if (groqKeys.length > 0) {
        const content = await tryGroq(groqKeys);
        return { content };
      }
    } catch (e2) {
      console.error('Groq fallback also failed');
    }

    // Default response if no keys work or errors occur
    return { 
      content: "Olá! No momento estou operando em modo de manutenção simplificado. Como posso ajudar com suas dúvidas sobre a The Royal Cut?" 
    };
  });