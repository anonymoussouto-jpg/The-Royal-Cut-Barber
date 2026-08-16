import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAI } from "@/lib/ai.functions";
import { toast } from "sonner";

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "assistant" | "user" | "system"; content: string }[]>([
    { role: "assistant", content: "Olá, seja bem-vindo à The Royal Cut, a barbearia do Thiago. Como posso servir você hoje?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = useServerFn(chatWithAI);

  const handleSend = async () => {
    if (!message.trim() || isTyping) return;
    
    const userMessage = { role: "user" as const, content: message };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setMessage("");
    setIsTyping(true);

    try {
      const response = await sendMessage({
        data: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      setMessages(prev => [...prev, { 
        role: "assistant" as const, 
        content: response.content || "Desculpe, não consegui processar sua solicitação."
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      toast.error("Erro ao conectar com a IA");
      setMessages(prev => [...prev, { 
        role: "assistant" as const, 
        content: "Houve um erro técnico. Por favor, tente novamente."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 p-0 shadow-2xl transition-all duration-300 ${isOpen ? 'scale-0' : 'scale-100'} bg-primary hover:bg-primary/90 text-primary-foreground`}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[60] w-[380px] h-[550px] bg-card border border-border/40 shadow-2xl rounded-3xl flex flex-col overflow-hidden"
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
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Online</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
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
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted text-foreground rounded-tl-none border border-border/40'
                    }`}
                  >
                    {msg.content}
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

            {/* Input */}
            <div className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input 
                  placeholder="Como posso ajudar?" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="rounded-full bg-background border-border/40"
                />
                <Button 
                  onClick={handleSend}
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
