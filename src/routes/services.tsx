import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Tag, Scissors, Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooking } from "@/hooks/use-booking";
import { StyleGallery } from "@/components/services/StyleGallery";

export const Route = createFileRoute("/services")({
  head: () => ({
    title: "Serviços | The Royal Cut",
    meta: [
      {
        name: "description",
        content: "Confira nossa galeria de serviços premium: do corte clássico à barboterapia tradicional com excelência.",
      },
      { property: "og:title", content: "Serviços Premium | The Royal Cut" },
      {
        property: "og:description",
        content: "Onde a tradição encontra o cuidado. Escolha o serviço que melhor reflete sua honra.",
      },
    ],
  }),
  component: ServicesPage,
});

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
}

function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const { open } = useBooking();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true);
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "Todos",
    ...Array.from(new Set(services.map((s) => s.category).filter(Boolean))),
  ];
  const filteredServices =
    activeCategory === "Todos" ? services : services.filter((s) => s.category === activeCategory);

  if (loading)
    return (
      <PublicLayout>
        <div className="container mx-auto px-6 py-20 min-h-screen">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="flex justify-center gap-4 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/9] w-full rounded-xl" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </PublicLayout>
    );

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-serif font-bold mb-4">Serviços & Excelência</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Onde a tradição encontra o cuidado. Escolha o serviço que melhor reflete sua honra.
          </p>
        </motion.div>

        <StyleGallery />

        {/* Categories Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat as string)}
              className={`rounded-full px-8 transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "border-border/40 hover:border-primary/50"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full border-border/40 bg-card/50 overflow-hidden hover:border-primary/50 transition-all duration-500 group flex flex-col">
                  <div className="aspect-[16/9] overflow-hidden relative bg-zinc-900">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                        <Scissors className="w-10 h-10" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Premium Service</span>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <span className="text-2xl font-bold">
                        R$ {Number(service.price).toFixed(2)}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {service.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex flex-col flex-grow">
                    <p className="text-muted-foreground text-sm line-clamp-3 min-h-[4.5em]">
                      {service.description ||
                        "Uma experiência personalizada de grooming para o cavalheiro moderno."}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {service.duration_minutes} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-primary" />
                        {service.category}
                      </div>
                    </div>
                    <Button
                      onClick={() => open()}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-4"
                    >
                      Reservar Agora
                    </Button>
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
