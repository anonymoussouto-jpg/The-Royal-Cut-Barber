import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// AI Logic with Function Calling
export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string()
    }))
  }).parse(data))
  .handler(async ({ data }) => {
    // 1. Fetch API Keys and Settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value');
    
    const getSetting = (key: string) => {
      const setting = settings?.find(s => s.key === key)?.value;
      if (!setting) return null;
      try {
        return typeof setting === 'string' ? JSON.parse(setting) : setting;
      } catch (e) {
        return setting;
      }
    };

    const geminiKey = process.env['GEMINI_API_KEY'] || getSetting('gemini_api_key_1');
    const groqKey = process.env['GROQ_API_KEY'] || getSetting('groq_api_key_1');

    // 2. Define Tools for the AI
    const tools = [
      {
        name: "get_services_list",
        description: "Retorna a lista de serviços da barbearia com preços e duração.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "get_barbers_list",
        description: "Retorna a lista de barbeiros disponíveis na casa.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "get_available_slots",
        description: "Busca horários disponíveis para uma data específica.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data no formato YYYY-MM-DD" },
            barber_id: { type: "string", description: "ID opcional do barbeiro" }
          },
          required: ["date"]
        }
      },
      {
        name: "create_appointment",
        description: "Realiza o agendamento de um serviço.",
        parameters: {
          type: "object",
          properties: {
            client_name: { type: "string" },
            client_phone: { type: "string" },
            service_id: { type: "string" },
            barber_id: { type: "string" },
            appointment_time: { type: "string", description: "ISO string ou formato YYYY-MM-DD HH:mm" }
          },
          required: ["client_name", "client_phone", "service_id", "barber_id", "appointment_time"]
        }
      },
      {
        name: "get_pix_key",
        description: "Retorna a chave PIX para pagamento.",
        parameters: { type: "object", properties: {} }
      }
    ];

    // 3. Tool Implementations
    const toolHandlers: Record<string, (args: any) => Promise<any>> = {
      get_services_list: async () => {
        const { data } = await supabase.from('services').select('id, name, price, duration_minutes');
        return data;
      },
      get_barbers_list: async () => {
        const { data } = await supabase.from('barbers').select('id, full_name, specialties');
        return data;
      },
      get_available_slots: async ({ date, barber_id }) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        let query = supabase
          .from('appointments')
          .select('start_time')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString());
        
        if (barber_id) query = query.eq('barber_id', barber_id);
        
        const { data: booked } = await query;
        const bookedTimes = booked?.map(b => new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) || [];
        
        const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
        return allSlots.filter(s => !bookedTimes.includes(s));
      },
      create_appointment: async (args) => {
        // Find or create profile
        let clientId: string;
        const { data: profile } = await supabase.from('profiles').select('id').eq('phone', args.client_phone).maybeSingle();
        if (profile) {
          clientId = profile.id;
        } else {
          const { data: newProfile } = await supabase.from('profiles').insert({
            id: crypto.randomUUID(),
            full_name: args.client_name,
            phone: args.client_phone,
            is_guest: true
          }).select('id').single();
          clientId = newProfile?.id || crypto.randomUUID();
        }

        const { data: service } = await supabase.from('services').select('price').eq('id', args.service_id).single();

        const { data: appointment, error } = await supabase.from('appointments').insert({
          client_id: clientId,
          client_name: args.client_name,
          client_phone: args.client_phone,
          service_id: args.service_id,
          barber_id: args.barber_id,
          start_time: new Date(args.appointment_time).toISOString(),
          total_price: service?.price || 0,
          status: 'pending'
        }).select('id').single();

        if (error) return { error: error.message };
        return { 
          id: appointment.id, 
          status: 'success', 
          message: 'Agendamento criado! Recomende ao cliente pagar via PIX.',
          appointment_details: {
            id: appointment.id,
            price: service?.price
          }
        };
      },
      get_pix_key: async () => {
        return { pix_key: getSetting('pix_key') || "Chave não configurada" };
      }
    };

    // 4. Chat with AI (Supporting Function Calling)
    const history = data.messages.slice(-10); // Keep last 10 messages
    const systemPrompt = `Você é Royal, o assistente virtual da The Royal Cut. 
    Seja fraternal, respeitoso e eficiente. Você tem ferramentas para buscar serviços, barbeiros, horários e REALIZAR agendamentos.
    SEMPRE use as ferramentas para dar informações precisas.
    Ao confirmar um agendamento, informe o ID do agendamento e o valor.
    Responda em Português do Brasil.`;

    const fullMessages = [{ role: "system", content: systemPrompt }, ...history];

    // Attempt Groq (supports Tool Use better in this stub logic)
    if (groqKey) {
      try {
        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: fullMessages,
            tools: tools.map(t => ({ type: "function", function: t })),
            tool_choice: "auto"
          })
        });

        const result = await response.json();
        let message = result.choices[0].message;

        if (message.tool_calls) {
        const toolResults = await Promise.all(message.tool_calls.map(async (call: any) => {
          const handler = toolHandlers[call.function.name];
          if (!handler) {
            return {
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ error: "Tool not found" })
            };
          }
          const args = JSON.parse(call.function.arguments);
          const output = await handler(args);
          return {
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(output)
          };
        }));

          const secondResponse = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: "llama3-70b-8192",
              messages: [...fullMessages, message, ...toolResults]
            })
          });
          const secondResult = await secondResponse.json();
          return { 
            content: secondResult.choices[0].message.content,
            metadata: toolResults.find(r => r.content.includes('appointment_details')) ? JSON.parse(toolResults.find(r => r.content.includes('appointment_details'))!.content) : null
          };
        }

        return { content: message.content };
      } catch (e) {
        console.error("Groq Tool Use failed", e);
      }
    }

    // Default fallback
    return { 
      content: "Olá! Posso ajudar com informações ou agendamentos. O que você deseja?" 
    };
  });