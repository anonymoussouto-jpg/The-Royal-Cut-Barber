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
import { useServerFn } from "@tanstack/react-start";
import { getChatbotResponse } from "@/lib/ai.functions";

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
  const getChatbotFn = useServerFn(getChatbotResponse);

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

    try {
      // 1. Fetch context data (services, barbers)
      const [{ data: services }, { data: barbers }] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('barbers').select('*')
      ]);

      const servicesContext = services?.map(s => `${s.name}: R$ ${s.price}`).join(', ') || '';
      const barbersContext = barbers?.map(b => b.full_name).join(', ') || '';

      // 2. Call server function
      const result = await getChatbotFn({ 
        data: { 
          messages: history, 
          servicesContext, 
          barbersContext 
        } 
      });

      setMessages(prev => [...prev, { role: "assistant", content: result.content }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "Houve um erro técnico ao processar sua mensagem. Por favor, tente novamente mais tarde.",
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
