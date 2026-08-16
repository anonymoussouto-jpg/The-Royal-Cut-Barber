import { useState, useEffect } from "react";
import { useShopStore } from "@/hooks/use-shop-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Plus, Minus, Trash2, QrCode, Copy, CheckCircle2, Loader2, CreditCard, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createAsaasPayment } from "@/lib/payments.functions";

export function ShoppingCart() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotal, clearCart } = useShopStore();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "payment_method" | "payment_pix" | "payment_card" | "success">("cart");
  const [pixCopied, setPixCopied] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [asaasData, setAsaasData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900);
  const [isExpired, setIsExpired] = useState(false);

  const startPaymentFn = useServerFn(createAsaasPayment);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCheckoutStep("cart"), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if ((checkoutStep === "payment_pix" || checkoutStep === "payment_card") && timeLeft > 0 && !isExpired) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [checkoutStep, timeLeft, isExpired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegeneratePix = () => {
    setTimeLeft(900);
    setIsExpired(false);
    handleCreateOrder('PIX');
  };

  // Realtime subscription for order payment status
  useEffect(() => {
    if (!lastOrderId) return;

    const channel = supabase
      .channel(`order-status-${lastOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        filter: `id=eq.${lastOrderId}`
        },
        (payload) => {
          if (payload.new['status'] === 'PAID') {
            setCheckoutStep("success");
            clearCart();
            toast.success("Pagamento confirmado via Asaas!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastOrderId, clearCart]);

  const handleCreateOrder = async (method: 'PIX' | 'CREDIT_CARD' | 'IN_PERSON') => {
    if (!clientName || !clientPhone) {
      toast.error("Preencha seus dados primeiro");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientId = user?.id;

      if (!clientId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', clientPhone)
          .maybeSingle();

        if (existingProfile) {
          clientId = existingProfile.id;
        } else {
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: crypto.randomUUID(),
              full_name: clientName,
              phone: clientPhone,
              is_guest: true
            })
            .select('id')
            .single();
          if (!profileError) clientId = newProfile.id;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId || null,
          client_name: clientName,
          client_phone: clientPhone,
          items: items as any,
          total_amount: getTotal(),
          status: 'pending',
          payment_method: method
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      setLastOrderId(order.id);

      if (method === 'IN_PERSON') {
        setCheckoutStep("success");
        clearCart();
        return;
      }

      // Asaas Integration
      const asaasRes = await startPaymentFn({
        data: {
          orderId: order.id,
          amount: getTotal(),
          customerName: clientName,
          mobilePhone: clientPhone,
          billingType: method as any
        }
      });

      setAsaasData(asaasRes);
      if (method === 'PIX') setCheckoutStep("payment_pix");
      else if (method === 'CREDIT_CARD') setCheckoutStep("payment_card");

    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error("Erro no checkout: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPix = () => {
    if (asaasData?.payload) {
      navigator.clipboard.writeText(asaasData.payload);
      setPixCopied(true);
      toast.success("Código Copia e Cola copiado!");
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border/40 flex flex-col p-0 overflow-hidden">
        <SheetHeader className="p-6 border-b border-border/40 bg-card/50 backdrop-blur-xl shrink-0">
          <SheetTitle className="flex items-center gap-2 font-serif text-2xl text-white">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        <div className="flex-grow overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {checkoutStep === "cart" ? (
              <motion.div
                key="cart"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {items.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">Seu carrinho está vazio.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-sm truncate text-white">{item.name}</h4>
                        <p className="text-primary font-bold text-sm mt-1">R$ {item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center border border-border/40 rounded-md">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:text-primary text-white/50"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-xs font-bold text-white">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:text-primary text-white/50"><Plus className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : checkoutStep === "info" ? (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold font-serif text-primary">Seus Dados</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nome Completo</label>
                      <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: João Silva" className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">WhatsApp</label>
                      <input value={clientPhone} onChange={(e) => setClientPhone(formatPhone(e.target.value))} placeholder="(99) 99999-9999" className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none text-white" />
                    </div>
                  </div>
                  <Button onClick={() => setCheckoutStep("payment_method")} className="w-full h-12 bg-primary text-black font-bold mt-4">Escolher Pagamento</Button>
                </div>
              </motion.div>
            ) : checkoutStep === "payment_method" ? (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold font-serif text-primary mb-6">Forma de Pagamento</h3>
                <div className="grid gap-3">
                  <Button onClick={() => handleCreateOrder('PIX')} disabled={isProcessing} className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10">
                    <QrCode className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">PIX</p>
                      <p className="text-[10px] text-white/40 uppercase">Liberação Imediata</p>
                    </div>
                  </Button>
                  <Button onClick={() => handleCreateOrder('CREDIT_CARD')} disabled={isProcessing} className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">Cartão de Crédito</p>
                      <p className="text-[10px] text-white/40 uppercase">Pelo Link Asaas</p>
                    </div>
                  </Button>
                  <Button onClick={() => handleCreateOrder('IN_PERSON')} disabled={isProcessing} className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10">
                    <Wallet className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">Pagar na Barbearia</p>
                      <p className="text-[10px] text-white/40 uppercase">No Local</p>
                    </div>
                  </Button>
                </div>
                {isProcessing && (
                  <div className="flex items-center justify-center pt-4 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-white/40">Gerando cobrança Asaas...</span>
                  </div>
                )}
              </motion.div>
            ) : checkoutStep === "payment_pix" ? (
              <motion.div
                key="pix"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary font-serif">Aguardando Pagamento</h3>
                  <p className="text-xs text-white/40">Pague pelo QR Code abaixo para confirmação automática.</p>
                </div>
                <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-2xl shadow-primary/20">
                  {asaasData?.encodedImage ? (
                    <img src={`data:image/png;base64,${asaasData.encodedImage}`} alt="QR Code PIX" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-black">QR Code indisponível</div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {isExpired ? (
                      <div className="space-y-3">
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Código expirado — gere um novo PIX</p>
                        <Button 
                          onClick={handleRegeneratePix}
                          className="w-full bg-primary text-black font-bold h-10 rounded-xl"
                        >
                          Gerar Novo PIX
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Expira em</p>
                        <p className="text-2xl font-mono font-bold text-primary">⏱️ {formatTime(timeLeft)}</p>
                      </div>
                    )}
                  </div>

                  {!isExpired && (
                    <>
                      <Button onClick={copyPix} variant="outline" className="w-full gap-2 border-primary/20 hover:border-primary/50 text-white">
                        {pixCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {pixCopied ? "Copiado!" : "Copiar Código Copia e Cola"}
                      </Button>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Monitorando pagamento via realtime...</span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : checkoutStep === "payment_card" ? (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <h3 className="text-xl font-bold text-primary font-serif">Finalize no Cartão</h3>
                <p className="text-xs text-white/40">Clique no botão abaixo para abrir o checkout seguro do Asaas.</p>
                <Button asChild className="w-full h-12 bg-primary text-black font-bold">
                  <a href={asaasData?.invoiceUrl} target="_blank" rel="noopener noreferrer">Abrir Link de Pagamento</a>
                </Button>
                <p className="text-[10px] text-white/30 italic">Assim que o pagamento for confirmado, esta tela mudará automaticamente.</p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary">Excelente escolha!</h3>
                <p className="text-sm text-white/50 px-4">Seu pedido foi registrado. Estamos preparando tudo para você com excelência.</p>
                <Button onClick={closeCart} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold">Fechar</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {checkoutStep === "cart" && items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-xl shrink-0 flex-col gap-4">
            <div className="flex justify-between items-center w-full mb-2">
              <span className="text-muted-foreground font-bold">Total</span>
              <span className="text-2xl font-bold text-primary font-serif">R$ {getTotal().toFixed(2)}</span>
            </div>
            <Button onClick={() => setCheckoutStep("info")} className="w-full py-6 bg-primary hover:bg-primary/90 text-black font-bold text-lg">Finalizar Pedido</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
