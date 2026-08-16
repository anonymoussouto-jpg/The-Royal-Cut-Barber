import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Scissors, Calendar, Sparkles, Star, ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { AIChatbot } from "@/components/ai/AIChatbot";

export const Route = createFileRoute("/")({
  component: LandingPage,
});


function LandingPage() {
  return (
    <PublicLayout>
      <div className="flex flex-col w-full overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center">
          {/* Background Visual */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/60 z-10" />
            <img 
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2000" 
              alt="Luxury Barbershop"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-20 container px-6 mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-widest uppercase mb-6">
                <Sparkles className="w-3 h-3" />
                Experiência Signature
              </span>
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
                A Arte da Cutelaria <br />
                <span className="text-primary italic">Redefinida</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-10">
                Mais que um corte, um ritual. Combinamos tradição clássica com tecnologia de ponta para o homem moderno.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold">
                  Agendar Horário
                  <Calendar className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-white/20 text-white hover:bg-white/10 rounded-full backdrop-blur-sm">
                  Falar com nossa IA
                  <Sparkles className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Explore</span>
            <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent" />
          </div>
        </section>

        {/* Signature Experiences */}
        <section className="py-24 bg-background">
          <div className="container px-6 mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">Experience Menu</h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold">Nossas Experiências</h3>
              </div>
              <p className="max-w-md text-muted-foreground">
                De rituais com toalhas quentes a cortes de precisão, cada serviço é desenhado para sua máxima satisfação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Barboterapia Signature",
                  desc: "Ritual completo com óleos essenciais, toalha quente e massagem facial.",
                  price: "R$ 85",
                  img: "https://images.unsplash.com/photo-1621605815841-aa378137397b?auto=format&fit=crop&q=80&w=800"
                },
                {
                  title: "The Executive Cut",
                  desc: "Corte de precisão, lavagem premium e finalização com pomada artesanal.",
                  price: "R$ 95",
                  img: "https://images.unsplash.com/photo-1599351431247-f10b21698303?auto=format&fit=crop&q=80&w=800"
                },
                {
                  title: "VIP Dia do Noivo",
                  desc: "Experiência exclusiva em lounge privado com open bar de chopp e charutos.",
                  price: "Consultar",
                  img: "https://images.unsplash.com/photo-1512690196222-7c74e041bd2e?auto=format&fit=crop&q=80&w=800"
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border/40"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img 
                      src={item.img} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-bold font-serif">{item.title}</h4>
                      <span className="text-primary font-bold">{item.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                      {item.desc}
                    </p>
                    <Button variant="link" className="p-0 text-primary font-bold group-hover:gap-2 transition-all">
                      Ver detalhes <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Loyalty */}
        <section className="py-24 bg-card border-y border-border/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2" />
          <div className="container px-6 mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">Loyalty Program</h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold mb-8">Clube de Assinatura & Barber Points</h3>
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                  Torne-se um membro do Royal Club e desfrute de vantagens exclusivas, como cortes ilimitados, bebidas no Lounge e acesso a eventos de networking.
                </p>
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Barber Points</h5>
                      <p className="text-sm text-muted-foreground">Cada real gasto gera pontos que podem ser trocados por serviços ou produtos na Grooming Store.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Assinatura Executive</h5>
                      <p className="text-sm text-muted-foreground">Cortes ilimitados e Barboterapia mensal por um valor fixo. Prioridade total na agenda.</p>
                    </div>
                  </div>
                </div>
                <Button size="lg" className="bg-primary text-primary-foreground rounded-full px-8">
                  Conhecer Planos
                </Button>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden border-8 border-background shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1590540179852-2110a54f813a?auto=format&fit=crop&q=80&w=1000" 
                    alt="Lounge Experience"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-background p-6 rounded-2xl shadow-xl border border-border/40 max-w-[240px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">Membros Ativos agora</span>
                  </div>
                  <div className="text-3xl font-bold font-serif mb-1">128</div>
                  <p className="text-[10px] text-muted-foreground">No Lounge desfrutando da Royal Experience.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <AIChatbot />
      </div>
    </PublicLayout>
  );
}
