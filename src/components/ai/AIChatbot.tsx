import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useChatbot } from "@/hooks/use-chatbot";
import { useNavigate } from "@tanstack/react-router";

export function AIChatbot() {
  const { isOpen, open, close } = useChatbot();
  const [showBubble, setShowBubble] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    {
      role: "assistant" | "user" | "system";
      content: string;
      metadata?: Record<string, any> | null;
    }[]
  >([
    {
      role: "assistant",
      content:
        "Olá, seja bem-vindo à The Royal Cut, a barbearia do Thiago. Como posso servir você hoje?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleQuickReply = (text: string) => {
    handleSend(text);
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || message;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: "user" as const, content: textToSend };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setMessage("");
    setIsTyping(true);

    try {
      // 1. Fetch context data (services, barbers)
      const [{ data: services }, { data: barbers }] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('barbers').select('*')
      ]);

      const systemPrompt = `Você é a Royal IA, assistente virtual da The Royal Cut - Barbearia e Irmandade.
Sua missão é atender com excelência, honra e cavalheirismo.
A barbearia é de propriedade do Thiago. O Thiago, além de ser o dono, também é barbeiro, atende clientes e possui agenda disponível para serviços.

SERVIÇOS DISPONÍVEIS:
${services?.map(s => `- ${s.name}: R$ ${s.price} (${s.duration_minutes} min)`).join('\n')}

NOSSA EQUIPE:
${barbers?.map(b => `- ${b.full_name}: ${b.bio || 'Barbeiro'}`).join('\n')}

REGRAS:
- Seja educado e prestativo.
- Use termos como "honra", "irmandade", "excelência".
- Confirme que o Thiago atende e possui agenda disponível se perguntado.
- Para agendamentos, direcione o cliente para o botão de agendamento ou peça para ele dizer o serviço e profissional desejado.
- Se o cliente perguntar sobre o endereço ou contato, informe que os dados estão no rodapé do site.
- Mantenha respostas concisas e amigáveis.`;

      // 2. Fetch API keys
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['gemini_api_key_1', 'gemini_key_1', 'groq_api_key_1', 'groq_key_1']);

      const extractKey = (val: any) => {
        if (!val) return undefined;
        try {
          // If it's a JSON string, try to parse it
          const parsed = typeof val === 'string' && (val.startsWith('{') || val.startsWith('[')) ? JSON.parse(val) : val;
          // If the result is still a string (common in Supabase JSONB), clean it up
          const cleanStr = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          return cleanStr.replace(/^"|"$/g, '').trim();
        } catch { 
          return String(val).replace(/^"|"$/g, '').trim(); 
        }
      };

      const geminiKey = extractKey(settings?.find(s => s.key === 'gemini_api_key_1' || s.key === 'gemini_key_1')?.value);
      const groqKey = extractKey(settings?.find(s => s.key === 'groq_api_key_1' || s.key === 'groq_key_1')?.value);
      
      console.log("Chatbot: API Keys check", { 
        hasGemini: !!geminiKey, 
        hasGroq: !!groqKey,
        geminiPrefix: geminiKey ? geminiKey.substring(0, 5) + '...' : 'none',
        groqPrefix: groqKey ? groqKey.substring(0, 5) + '...' : 'none'
      });

      // 3. Prepare and sanitize history for Gemini
      // Gemini requires first message to be from 'user'
      let history = [...newMessages];
      while (history.length > 0 && history[0]?.role !== 'user') {
        history.shift();
      }

      if (history.length === 0) {
        history = [userMessage];
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 15000)
      );

      const fetchAIResponse = async () => {
        // 4. Try Gemini
        if (geminiKey) {
          try {
            const geminiHistory = history.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            }));

            console.log("Chatbot: Enviando para Gemini...", { 
              model: "gemini-1.5-flash", 
              keyUsed: geminiKey.substring(0, 8) + "...",
              endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.substring(0, 5)}...`
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiHistory,
                systemInstruction: { parts: [{ text: systemPrompt }] }
              })
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log("Chatbot: Gemini success");
                return text;
              }
            } else {
              const errorBody = await response.json().catch(() => null);
              console.error("Chatbot: Erro Gemini", { 
                status: response.status, 
                statusText: response.statusText,
                error: errorBody 
              });
            }
          } catch (e) {
            console.error("Gemini failed, trying Groq...", e);
          }
        }

        // 5. Try Groq fallback
        if (groqKey) {
          try {
            console.log("Chatbot: Enviando para Groq...", { 
              model: "llama-3.3-70b-versatile", 
              keyUsed: groqKey.substring(0, 8) + "...",
              endpoint: "https://api.groq.com/openai/v1/chat/completions"
            });

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...history.map(m => ({ role: m.role, content: m.content }))
                ]
              })
            });

            if (groqResponse.ok) {
              const data = await groqResponse.json();
              const text = data.choices?.[0]?.message?.content;
              if (text) {
                console.log("Chatbot: Groq success");
                return text;
              }
            } else {
              const errorBody = await groqResponse.json().catch(() => null);
              console.error("Chatbot: Erro Groq", { 
                status: groqResponse.status, 
                statusText: groqResponse.statusText,
                error: errorBody 
              });
            }
          } catch (e) {
            console.error("Chatbot: Groq call failed:", e);
          }
        }

        throw new Error("Ambos Gemini e Groq falharam ou estão sem chaves.");
      };

      const aiContent = await Promise.race([
        fetchAIResponse(),
        timeoutPromise
      ]) as string;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: aiContent || "Desculpe, não consegui processar sua solicitação no momento.",
        },
      ]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage =
        error.message === "TIMEOUT"
          ? "Levei um tempo a mais para pensar... Pode reformular sua pergunta ou tentar em instantes?"
          : "Houve um erro técnico ao processar sua mensagem. Por favor, tente novamente mais tarde.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: errorMessage,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Greeting Bubble */}
      <AnimatePresence>
        {!isOpen && showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="fixed bottom-24 right-6 z-50 bg-card border border-border/40 p-3 rounded-2xl shadow-xl max-w-[200px]"
          >
            <div className="relative">
              <p className="text-xs font-medium text-foreground">
                Olá! Precisa de ajuda para agendar? 👋
              </p>
              <button
                onClick={() => setShowBubble(false)}
                className="absolute -top-4 -right-4 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute -bottom-4 right-6 w-3 h-3 bg-card border-r border-b border-border/40 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <Button
        onClick={() => {
          open();
          setShowBubble(false);
        }}
        className={`fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 p-0 shadow-2xl transition-all duration-300 ${isOpen ? "scale-0" : "scale-100"} bg-primary hover:bg-primary/90 text-primary-foreground`}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[60] w-full sm:w-[380px] h-[75vh] sm:h-[550px] bg-card border border-border/40 shadow-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">Royal IA</h4>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => close()}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-6 overflow-y-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-border/40"
                    }`}
                  >
                    {msg.content}

                    {msg.metadata?.["appointment_details"] && (
                      <div className="mt-4 p-4 bg-black/40 rounded-xl border border-primary/20 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" />
                          Resumo do Agendamento
                        </div>
                        <div className="text-[10px] space-y-1 text-white/70">
                          <p>
                            Código:{" "}
                            <span className="text-white font-mono">
                              #{msg.metadata["appointment_details"].id.split("-")[0].toUpperCase()}
                            </span>
                          </p>
                          <p>
                            Valor:{" "}
                            <span className="text-primary font-bold">
                              R$ {msg.metadata["appointment_details"].price}
                            </span>
                          </p>
                        </div>
                        <Button className="w-full bg-primary text-black font-bold h-8 text-[10px] rounded-lg">
                          Pagar via PIX
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl rounded-tl-none border border-border/40 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground italic">Digitando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input and Quick Replies */}
            <div className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-sm">
              {/* Quick Replies */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                {[
                  "📅 Horários disponíveis hoje",
                  "✂️ Preços e serviços",
                  "👑 Planos do Clube",
                  "💳 Chave PIX",
                ].map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-muted border border-border/40 text-[10px] font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Como posso ajudar?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="rounded-full bg-background border-border/40"
                />
                <Button
                  onClick={() => handleSend()}
                  size="icon"
                  className="rounded-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
