import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, Tag, ShoppingCart as ShoppingCartIcon, Loader2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShopStore } from "@/hooks/use-shop-store";

export const Route = createFileRoute("/shop")({
  head: () => ({
    title: "Grooming Store | The Royal Cut",
    meta: [
      {
        name: "description",
        content: "Produtos exclusivos para o cuidado do cavalheiro. Mantenha sua imagem com a qualidade e o rigor da The Royal Cut.",
      },
      { property: "og:title", content: "Grooming Store | The Royal Cut" },
      {
        property: "og:description",
        content: "Produtos exclusivos para o cuidado do cavalheiro. Mantenha sua imagem com a qualidade e o rigor da The Royal Cut.",
      },
    ],
  }),
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image:
        product.image_url ||
        "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800",
    });

    toast.success(`${product.name} adicionado ao carrinho!`, {
      icon: <Check className="w-4 h-4 text-primary" />,
      className: "bg-card border-primary/20 text-foreground",
      duration: 3000,
    });
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").eq("is_available", true);
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "Todos",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];
  const filteredProducts =
    activeCategory === "Todos" ? products : products.filter((p) => p.category === activeCategory);

  if (loading)
    return (
      <PublicLayout>
        <div className="container mx-auto px-6 py-20 min-h-screen">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-4">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-6 w-96" />
            </div>
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-10 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PublicLayout>
    );

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
              <Tag className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Seleção de Excelência
              </span>
            </div>
            <h1 className="text-5xl font-serif font-bold mb-4">Grooming Store</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Produtos de alta qualidade selecionados para manter sua imagem com dignidade e
              cuidado.
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
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "border-border/40 hover:border-primary/50"
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
                  <div 
                    className="aspect-square overflow-hidden relative bg-zinc-900 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                        <Package className="w-12 h-12" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Sem Imagem</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                      <Star className="w-3 h-3 fill-current" />
                      4.9
                    </div>
                  </div>
                  <CardHeader className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                        {product.category}
                      </span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-[10px] text-green-500 font-bold uppercase">
                          Em Estoque
                        </span>
                      ) : (
                        <span className="text-[10px] text-destructive font-bold uppercase">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <CardTitle 
                      className="text-lg group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs mt-2 line-clamp-2 h-8">
                      {product.description || "Produto premium para o cuidado masculino."}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-primary">
                        R$ {Number(product.price).toFixed(2)}
                      </span>
                      <Button
                        disabled={product.stock_quantity === 0}
                        onClick={() => handleAddToCart(product)}
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
      
      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4 border border-border shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={
                    selectedProduct.image_url ||
                    "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800"
                  }
                  alt={selectedProduct.name}
                  className="w-full h-52 object-cover rounded-xl"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors border border-white/10"
                >
                  ✕
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif">{selectedProduct.name}</h2>
                {selectedProduct.category && (
                  <span className="text-[10px] text-primary uppercase tracking-widest font-bold">
                    {selectedProduct.category}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {selectedProduct.description || "Produto premium da The Royal Cut."}
              </p>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-2xl font-bold text-primary block">
                    R$ {Number(selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.stock_quantity > 0 ? (
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                      ✓ Em estoque
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                      Esgotado
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock_quantity === 0}
                  className="bg-primary text-primary-foreground font-bold rounded-full px-6"
                >
                  Adicionar ao Carrinho
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
