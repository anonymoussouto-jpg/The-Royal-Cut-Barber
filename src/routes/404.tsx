import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scissors, Home } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/404")({
  head: () => ({
    title: "Página Não Encontrada | The Royal Cut",
    meta: [
      {
        name: "description",
        content: "Desculpe, a página que você procura não foi encontrada. Volte para o início da The Royal Cut.",
      },
    ],
  }),
  component: NotFoundPage,
});

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 max-w-lg"
      >
        <div className="relative">
          <h1 className="text-[12rem] font-serif font-black text-primary/10 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-6 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm">
              <Scissors className="w-16 h-16 text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-serif font-bold text-foreground">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-lg">
            Parece que este corte não está no cardápio. O caminho que você buscou não existe em nosso reino.
          </p>
        </div>

        <div className="pt-8">
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-12 rounded-full shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105"
          >
            <Link to="/">
              <Home className="w-5 h-5 mr-2" />
              Voltar para o início
            </Link>
          </Button>
        </div>

        <div className="pt-12 flex justify-center gap-4 opacity-20">
            {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
            ))}
        </div>
      </motion.div>
    </div>
  );
}
