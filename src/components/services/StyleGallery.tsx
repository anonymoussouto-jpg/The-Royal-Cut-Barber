import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Scissors, ImageIcon } from "lucide-react";
import { useBooking } from "@/hooks/use-booking";
import { supabase } from "@/integrations/supabase/client";

const defaultInspirations = [
  {
    id: "d1",
    title: "Low Fade Texturizado",
    style: "Fade",
    img: "https://images.unsplash.com/photo-1599351431247-f10b21698303?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "d2",
    title: "Pompadour Clássico",
    style: "Clássico",
    img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "d3",
    title: "Barba Lenhador",
    style: "Barba",
    img: "https://images.unsplash.com/photo-1621605815841-aa378137397b?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "d4",
    title: "Buzz Cut Crespo",
    style: "Crespo",
    img: "https://images.unsplash.com/photo-1590540179852-2110a54f813a?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "d5",
    title: "Platinado Moderno",
    style: "Platinado",
    img: "https://images.unsplash.com/photo-1512690196222-7c74e041bd2e?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "d6",
    title: "Mid Fade",
    style: "Fade",
    img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400",
  },
];

const staticFilters = ["Todos", "Fade", "Clássico", "Barba", "Crespo", "Platinado"];

export function StyleGallery() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [inspirations, setInspirations] = useState<any[]>(defaultInspirations);
  const { open } = useBooking();

  useEffect(() => {
    async function fetchTransformations() {
      const { data } = await supabase
        .from("transformations")
        .select("*")
        .eq("is_highlighted", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const transformed = data.map((t) => ({
          id: t.id,
          title: `Trabalho de Especialista`,
          style: t.style_tag || "Geral",
          img: t.after_image_url,
        }));
        setInspirations([...transformed, ...defaultInspirations]);
      }
    }
    fetchTransformations();
  }, []);

  const filtered =
    activeFilter === "Todos"
      ? inspirations
      : inspirations.filter((item) => item.style === activeFilter);

  return (
    <section className="mb-20">
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-3xl font-serif font-bold mb-6 text-center">Inspirações de Corte</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {staticFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 cursor-pointer"
            >
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-2">
                  {item.style}
                </span>
                <h4 className="text-sm font-bold text-white mb-4 leading-tight">{item.title}</h4>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold h-8 px-4 rounded-full"
                >
                  <Scissors className="w-3 h-3 mr-2" />
                  Agendar este estilo
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
