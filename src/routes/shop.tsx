import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/shop")({
  component: GroomingStore,
});

function GroomingStore() {
  const products = [
    {
      name: "Pomada Matte Premium",
      price: "R$ 65,00",
      category: "Finalizadores",
      image: "https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&q=80&w=800",
      rating: 5
    },
    {
      name: "Óleo para Barba Wood",
      price: "R$ 45,00",
      category: "Cuidados",
      image: "https://images.unsplash.com/photo-1590159763121-7c9fd312190d?auto=format&fit=crop&q=80&w=800",
      rating: 4.8
    },
    {
      name: "Shampoo Detox",
      price: "R$ 55,00",
      category: "Higiene",
      image: "https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?auto=format&fit=crop&q=80&w=800",
      rating: 4.9
    },
    {
      name: "Balm Hidratante",
      price: "R$ 40,00",
      category: "Cuidados",
      image: "https://images.unsplash.com/photo-1621605815841-aa378137397b?auto=format&fit=crop&q=80&w=800",
      rating: 4.7
    }
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4">Grooming Store</h1>
          <p className="text-muted-foreground text-lg">Produtos de alto padrão para manter seu visual impecável.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="border-border/40 overflow-hidden bg-card/50">
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardHeader className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{product.category}</span>
                    <div className="flex items-center gap-1 text-xs text-yellow-500 font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {product.rating}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">{product.price}</span>
                    <Button size="sm" className="bg-primary text-primary-foreground rounded-full">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
