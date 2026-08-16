import { useState, useEffect } from "react";
import { useShopStore } from "@/hooks/use-shop-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Plus, Minus, Trash2, QrCode, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function ShoppingCart() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotal, clearCart } = useShopStore();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "payment" | "success">("cart");
  const [pixCopied, setPixCopied] = useState(false);
  const [pixKey, setPixKey] = useState<string>("");
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    if (checkoutStep === "payment") {
      fetchPixKey();
    }
  }, [checkoutStep]);

  const fetchPixKey = async () => {
    setIsLoadingPix(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'pix_key')
        .single();
      
      if (error) throw error;
      
      let key = data?.value;
      if (typeof key === 'string' && (key.startsWith('"') || key.startsWith('{'))) {
        try {
          key = JSON.parse(key);
        } catch (e) {}
      }
      setPixKey(String(key || ""));
    } catch (error) {
      console.error("Error fetching PIX key:", error);
    } finally {
      setIsLoadingPix(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCheckoutStep("cart"), 300);
    }
  }, [isOpen]);

  const handleCheckout = () => {
    setCheckoutStep("info");
  };

  const handleGoToPayment = () => {
    if (!clientName || !clientPhone) {
      toast.error("Por favor, preencha seu nome e WhatsApp");
      return;
    }
    setCheckoutStep("payment");
  };

  const handleConfirmPayment = async () => {
    setIsSavingOrder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientId = user?.id;

      // If not logged in, we search or create a guest profile (reusing logic from booking)
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
          pix_key: pixKey,
          status: 'pending'
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      setLastOrderId(order.id);
      setCheckoutStep("success");
      clearCart();
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Erro ao processar pedido: " + error.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const copyPix = () => {
    const pixCode = pixKey.includes('000201') ? pixKey : `00020126580014br.gov.bcb.pix0136${pixKey}5204000053039865405${getTotal().toFixed(2)}5802BR5913THE ROYAL CUT6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setPixCopied(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md bg-card border-border/40 flex flex-col p-0 overflow-hidden">
        <SheetHeader className="p-6 border-b border-border/40 bg-card/50 backdrop-blur-xl shrink-0">
          <SheetTitle className="flex items-center gap-2 font-serif text-2xl">
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
                    <Button variant="link" onClick={closeCart} className="text-primary mt-2">
                      Continuar comprando
                    </Button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        <p className="text-primary font-bold text-sm mt-1">R$ {item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center border border-border/40 rounded-md">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:text-primary transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:text-primary transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                  <p className="text-sm text-muted-foreground">Preencha para prosseguir com o pedido.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nome Completo</label>
                      <input 
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">WhatsApp</label>
                      <input 
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                        placeholder="(99) 99999-9999"
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all text-white"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGoToPayment}
                    className="w-full h-12 bg-primary text-primary-foreground font-bold mt-4"
                  >
                    Prosseguir para Pagamento
                  </Button>
                </div>
              </motion.div>
            ) : checkoutStep === "payment" ? (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary font-serif">Pagamento via PIX</h3>
                  <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie a chave para pagar.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl w-fit mx-auto shadow-2xl shadow-primary/10 relative">
                  {isLoadingPix ? (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center animate-pulse">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                      <QrCode className="w-32 h-32 text-slate-900" />
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-w-xs mx-auto">
                  <Button
                    variant="outline"
                    onClick={copyPix}
                    disabled={isLoadingPix || !pixKey}
                    className="w-full h-12 gap-2 border-primary/20 hover:border-primary/50 text-white"
                  >
                    {isLoadingPix ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : pixCopied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {isLoadingPix ? "Carregando..." : pixCopied ? "Copiado!" : "Copiar Código PIX"}
                  </Button>
                  <Button
                    onClick={handleConfirmPayment}
                    disabled={isLoadingPix || isSavingOrder}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  >
                    {isSavingOrder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Confirmar Pagamento
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold mb-2 text-primary">Pedido Confirmado!</h3>
                  <p className="text-muted-foreground text-sm px-4">Obrigado pela sua compra, {clientName.split(' ')[0]}. Seu pedido foi registrado com sucesso.</p>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Pedido #</span>
                    <span className="text-sm font-mono text-primary font-bold">{lastOrderId.substring(0, 8).toUpperCase()}</span>
                  </div>
                  
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-white/60">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-white/80">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-white/5 pt-2">
                    <span className="font-bold text-white">Total</span>
                    <span className="text-lg font-bold text-primary">R$ {getTotal().toFixed(2)}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={closeCart}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold"
                >
                  Fechar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {checkoutStep === "cart" && items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-xl shrink-0 flex-col gap-4 sm:flex-col">
            <div className="flex justify-between items-center w-full mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold text-white">R$ {getTotal().toFixed(2)}</span>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
            >
              Finalizar Pedido
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
