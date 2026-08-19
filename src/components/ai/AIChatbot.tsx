import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useChatbot } from "@/hooks/use-chatbot";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getChatbotResponse } from "@/lib/ai.functions";

interface AIChatInterfaceProps {
  inline?: boolean;
}

export function AIChatInterface({ inline = false }: AIChatInterfaceProps) {
  const { isOpen: isGlobalOpen, open, close } = useChatbot();
  const isOpen = inline ? true : isGlobalOpen;
  const [showBubble, setShowBubble] = useState(true);
  const [message, setMessage] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [messages, setMessages] = useState<
    {
      role: "assistant" | "user" | "system";
      content: string;
      metadata?: Record<string, any> | null;
    }[]
  >([]);
  const [dynamicQuickReplies, setDynamicQuickReplies] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const getChatbotFn = useServerFn(getChatbotResponse);

  // Initialize messages from localStorage or default
  useEffect(() => {
    const savedMessages = localStorage.getItem("royal_ia_history");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Error loading chat history:", e);
        setDefaultMessage();
      }
    } else {
      setDefaultMessage();
    }
  }, []);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'whatsapp_number').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try { setWhatsappNumber(typeof data.value === 'string' && data.value.startsWith('"') ?
            JSON.parse(data.value) : String(data.value)); }
          catch { setWhatsappNumber(String(data.value)); }
        }
      });
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("royal_ia_history", JSON.stringify(messages));
    }
  }, [messages]);

  const setDefaultMessage = () => {
    setMessages([
      {
        role: "assistant",
        content: "Olá, seja bem-vindo à The Royal Cut, a barbearia do Thiago. Como posso servir você hoje?",
      },
    ]);
  };

  const clearHistory = () => {
    localStorage.removeItem("royal_ia_history");
    setDefaultMessage();
  };

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
    const history = [...messages, userMessage];

    setMessages(history);
    setMessage("");
    setIsTyping(true);
    setError(null);

    try {
      const [
        { data: services },
        { data: barbers },
        { data: products },
        { data: shopInfo }
      ] = await Promise.all([
        supabase.from('services').select('name, price, duration_minutes').eq('is_active', true),
        (supabase.from('barbers') as any).select('full_name, specialties'),
        supabase.from('products').select('name, price').eq('is_available', true).limit(8),
        supabase.from('system_settings').select('key, value')
          .in('key', ['barber_shop_name', 'address', 'whatsapp_number', 'business_hours']),
      ]);

      const getInfo = (key: string) => {
        const row = shopInfo?.find((s: any) => s.key === key);
        if (!row?.value) return '';
        try { return typeof row.value === 'string' && row.value.startsWith('"') ? JSON.parse(row.value) : String(row.value); }
        catch { return String(row.value || ''); }
      };

      const servicesContext = services?.map(s =>
        `${s.name}: R$ ${s.price}${s.duration_minutes ? ` (${s.duration_minutes}min)` : ''}`
      ).join(', ') || '';
      
      const barbersContext = (barbers as any[])?.map(b =>
        `${b.full_name}${b.specialties?.length ? ` (${b.specialties.slice(0, 2).join(', ')})` : ''}`
      ).join(', ') || '';

      const productsContext = products?.map((p: any) => `${p.name}: R$ ${p.price}`).join(', ') || '';
      const shopContext = `Nome: ${getInfo('barber_shop_name')} | Endereço: ${getInfo('address')} | WhatsApp: ${getInfo('whatsapp_number')} | Horário: ${getInfo('business_hours') || 'Seg-Sab 9h-20h'}`;

      const result = await getChatbotFn({ 
        data: { 
          messages: history.map(m => ({ role: m.role, content: m.content })), 
          servicesContext, 
          barbersContext,
          productsContext,
          shopContext,
        } 
      });

      if (!result || !result.content) {
        throw new Error("Resposta vazia da IA");
      }

      const rawParts = result.content.split('||').map((p: string) => p.trim()).filter(Boolean);
      const optionsMatch = result.content.match(/\[OPCOES:(.*?)\]/);
      let quickReplies: string[] = [];

      if (optionsMatch) {
        quickReplies = optionsMatch[1].split('|').map((o: string) => o.trim()).filter(Boolean);
      }

      const cleanParts = rawParts.map((part: string) =>
        part.replace(/\[OPCOES:.*?\]/g, '').replace(/\[AGENDAR:.*?\]/g, '').trim()
      ).filter(Boolean);

      for (let i = 0; i < cleanParts.length; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 700));
        setMessages(prev => [...prev, { role: "assistant" as const, content: cleanParts[i] }]);
      }

      setDynamicQuickReplies(quickReplies);

      // Detectar e processar agendamento quando a IA confirmar todos os dados
      const bookingMatch = result.content.match(/\[AGENDAR:(.*?)\]/);
      if (bookingMatch) {
        const parts = bookingMatch[1].split('|');
        const [barberName, serviceName, date, time, clientName, clientPhone] = parts;
        try {
          const [{ data: barberData }, { data: serviceData }] = await Promise.all([
            supabase.from('barbers').select('id').ilike('full_name', `%${(barberName || '').trim()}%`).limit(1).single(),
            supabase.from('services').select('id, price, duration_minutes').ilike('name', `%${(serviceName || '').trim()}%`).limit(1).single(),
          ]);

          if (barberData && serviceData) {
            const phone = (clientPhone || '').replace(/\D/g, '');
            let clientId: string;
            const { data: existingProfile } = await supabase
              .from('profiles').select('id').eq('phone', phone).maybeSingle();
            
            if (existingProfile) {
              clientId = existingProfile.id;
            } else {
              const newId = crypto.randomUUID();
              await supabase.from('profiles').insert({
                id: newId,
                full_name: (clientName || '').trim(),
                phone: phone,
                is_guest: true,
              });
              clientId = newId;
            }

            const startTime = new Date(`${date}T${time}:00`);
            const { error: bookingError } = await supabase.from('appointments').insert({
              client_id: clientId,
              barber_id: barberData.id,
              service_id: serviceData.id,
              client_name: (clientName || '').trim(),
              client_phone: phone,
              start_time: startTime.toISOString(),
              total_price: serviceData.price,
              status: 'pending',
              payment_status: 'pending',
            });

            if (!bookingError) {
              const dateFormatted = startTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              await new Promise(r => setTimeout(r, 700));
              setMessages(prev => [
                ...prev,
                { role: "assistant" as const, content: `✅ Agendado com sucesso! 🎉` },
                { role: "assistant" as const, content: `${serviceName} com ${barberName}` },
                { role: "assistant" as const, content: `📅 ${dateFormatted} às ${time}. Te esperamos! 🔱` },
              ]);
              setDynamicQuickReplies(['Ver meu agendamento', 'Voltar ao início']);
            } else {
              setMessages(prev => [...prev, {
                role: "assistant" as const,
                content: `⚠️ Não consegui confirmar. Fale conosco no WhatsApp.`
              }]);
            }
          } else {
            setMessages(prev => [...prev, {
              role: "assistant" as const,
              content: `⚠️ Dados não encontrados. Vamos tentar novamente?`
            }]);
          }
        } catch (err) {
          console.error('Erro ao agendar pelo chat:', err);
          setMessages(prev => [...prev, {
            role: "assistant" as const,
            content: `⚠️ Erro ao agendar. Fale conosco no WhatsApp.`
          }]);
        }
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      const errorMessage = err.message?.includes("API key") 
        ? "Configuração de IA ausente ou inválida no painel Admin." 
        : "Houve um erro técnico ao processar sua mensagem.";
      
      setError(errorMessage);
      
      // Also add as a system/assistant message for history
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `⚠️ ${errorMessage} Por favor, tente novamente.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const containerClasses = inline 
    ? "w-full h-[600px] bg-card border border-border/40 shadow-2xl rounded-3xl flex flex-col overflow-hidden relative"
    : "fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[60] w-full sm:w-[380px] h-[75vh] sm:h-[550px] bg-card border border-border/40 shadow-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden";

  return (
    <>
      {!inline && (
        <>
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

          <Button
            onClick={() => {
              open();
              setShowBubble(false);
            }}
            className={`fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 p-0 shadow-2xl transition-all duration-300 ${isOpen ? "scale-0" : "scale-100"} bg-primary hover:bg-primary/90 text-primary-foreground`}
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={inline ? { opacity: 1, scale: 1 } : { opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={inline ? { opacity: 1, scale: 1 } : { opacity: 0, y: 100, scale: 0.9 }}
            className={containerClasses}
          >
            {/* Header */}
            <div className="p-6 bg-primary text-primary-foreground flex items-center justify-between shrink-0">
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  title="Limpar Histórico"
                  className="text-white hover:bg-white/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                {!inline && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => close()}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow p-6 overflow-y-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
                      👑
                    </div>
                  )}
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
                <div className="flex items-end gap-2 justify-start px-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0">👑</div>
                  <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center my-2">
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] px-3 py-2 rounded-lg flex items-center gap-2 max-w-[90%]">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                    <button 
                      onClick={() => {
                        const lastMsg = messages[messages.length - 1];
                        handleSend(lastMsg?.role === 'user' ? lastMsg.content : undefined);
                      }}
                      className="ml-auto flex items-center gap-1 hover:underline font-bold"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Tentar de novo
                    </button>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input and Quick Replies */}
            <div className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-sm shrink-0">
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

              {dynamicQuickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  {dynamicQuickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setDynamicQuickReplies([]); handleSend(reply); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/50 text-primary hover:bg-primary/10 transition-colors font-medium"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-grow">
                  <Input
                    placeholder="Como posso ajudar?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="rounded-full bg-background border-border/40"
                  />
                  <div className="flex justify-end px-1 mt-0.5">
                    <span className={`text-[10px] ${message.length > 450 ? 'text-red-400' : 'text-muted-foreground/50'}`}>
                      {message.length}/500
                    </span>
                  </div>
                </div>
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center shrink-0 w-10 h-10"
                    title="Falar no WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                )}
                <Button
                  onClick={() => handleSend()}
                  size="icon"
                  className="rounded-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 w-10 h-10"
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

export function AIChatbot() {
  return <AIChatInterface inline={false} />;
}
