import { useState, useEffect } from "react";
import { useShopStore } from "@/hooks/use-shop-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Plus, Minus, Trash2, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function ShoppingCart() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotal, clearCart } = useShopStore();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment" | "success">("cart");
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCheckoutStep("cart"), 300);
    }
  }, [isOpen]);

  const handleCheckout = () => {
    setCheckoutStep("payment");
  };

  const handleConfirmPayment = () => {
    setCheckoutStep("success");
    setTimeout(() => {
      clearCart();
      closeCart();
    }, 3000);
  };

  const copyPix = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136royal-cut-pix-key-12345678905204000053039865405" + getTotal().toFixed(2) + "5802BR5913THE ROYAL CUT6009SAO PAULO62070503***6304");
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
            ) : checkoutStep === "payment" ? (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Pagamento via PIX</h3>
                  <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie a chave para pagar.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl w-fit mx-auto shadow-2xl shadow-primary/10">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                </div>

                <div className="space-y-4 max-w-xs mx-auto">
                  <Button
                    variant="outline"
                    onClick={copyPix}
                    className="w-full h-12 gap-2 border-primary/20 hover:border-primary/50"
                  >
                    {pixCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {pixCopied ? "Copiado!" : "Copiar Código PIX"}
                  </Button>
                  <Button
                    onClick={handleConfirmPayment}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  >
                    Já realizei o pagamento
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 space-y-6"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold mb-2">Pedido Confirmado!</h3>
                  <p className="text-muted-foreground">Obrigado pela sua compra. Seus produtos estarão prontos para retirada ou entrega em breve.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {checkoutStep === "cart" && items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border/40 bg-card/50 backdrop-blur-xl shrink-0 flex-col gap-4 sm:flex-col">
            <div className="flex justify-between items-center w-full mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold">R$ {getTotal().toFixed(2)}</span>
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
