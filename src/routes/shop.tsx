import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, Tag, ShoppingCart as ShoppingCartIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShopStore } from "@/hooks/use-shop-store";

export const Route = createFileRoute("/shop")({
  component: GroomingStore,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  stock_quantity: number;
}

function GroomingStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const { addItem, items, openCart } = useShopStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filteredProducts = activeCategory === "Todos" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  if (loading) return <div className="flex justify-center py-40 bg-background"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
              <Tag className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Seleção de Excelência</span>
            </div>
            <h1 className="text-5xl font-serif font-bold mb-4">Grooming Store</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Produtos de alta qualidade selecionados para manter sua imagem com dignidade e cuidado.
            </p>
          </motion.div>

          <Button 
            onClick={openCart}
            variant="outline" 
            className="relative border-primary/20 hover:border-primary/50 h-12 px-6 rounded-full group"
          >
            <ShoppingCartIcon className="w-5 h-5 mr-2 group-hover:text-primary transition-colors" />
            Carrinho
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg animate-in zoom-in">
                {items.length}
              </span>
            )}
          </Button>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat as string)}
              className={`rounded-full px-6 transition-all duration-300 ${
                activeCategory === cat ? "bg-primary text-primary-foreground" : "border-border/40 hover:border-primary/50"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="border-border/40 overflow-hidden bg-card/50 hover:border-primary/50 transition-all duration-500 group flex flex-col h-full">
                  <div className="aspect-square overflow-hidden relative">
                    <img 
                      src={product.image_url || "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800"} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                      <Star className="w-3 h-3 fill-current" />
                      4.9
                    </div>
                  </div>
                  <CardHeader className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{product.category}</span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-[10px] text-green-500 font-bold uppercase">Em Estoque</span>
                      ) : (
                        <span className="text-[10px] text-destructive font-bold uppercase">Esgotado</span>
                      )}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">{product.name}</CardTitle>
                    <p className="text-muted-foreground text-xs mt-2 line-clamp-2 h-8">
                      {product.description || "Produto premium para o cuidado masculino."}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-primary">R$ {Number(product.price).toFixed(2)}</span>
                      <Button 
                        disabled={product.stock_quantity === 0}
                        onClick={() => addItem({
                          id: product.id,
                          name: product.name,
                          price: Number(product.price),
                          image: product.image_url || "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800"
                        })}
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 px-6 font-bold"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Comprar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </PublicLayout>
  );
}

