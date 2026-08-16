import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Star, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
});

const plans = [
  {
    name: "Royal Club Basic",
    price: "R$ 149,90",
    period: "/mês",
    description: "Ideal para manter o corte em dia com praticidade.",
    icon: Star,
    features: [
      "2 Cortes de Cabelo inclusos",
      "1 Ajuste de Pezinho",
      "Agendamento Prioritário via App",
      "10% de desconto em produtos",
      "Café Nespresso liberado"
    ],
    highlight: false,
    buttonText: "Assinar Basic"
  },
  {
    name: "Royal Club Executive",
    price: "R$ 289,90",
    period: "/mês",
    description: "A experiência completa para o homem executivo.",
    icon: Crown,
    features: [
      "Cortes Ilimitados",
      "Barbas Ilimitadas",
      "Sobrancelha inclusa",
      "15% de desconto em produtos",
      "1 Cerveja Artesanal por visita",
      "Acesso à Área VIP Lounge"
    ],
    highlight: true,
    buttonText: "Assinar Executive"
  },
  {
    name: "Royal Club VIP",
    price: "R$ 499,90",
    period: "/mês",
    description: "O auge do luxo e exclusividade na The Royal Cut.",
    icon: ShieldCheck,
    features: [
      "Todos os serviços ilimitados",
      "Lounge VIP privativo",
      "Bar aberto (Cerveja e Whisky)",
      "20% de desconto em produtos",
      "Estacionamento com manobrista",
      "Convite para eventos exclusivos"
    ],
    highlight: false,
    buttonText: "Assinar VIP"
  }
];

function MembershipPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 min-h-screen">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Exclusividade</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">Royal Club</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Junte-se à elite da The Royal Cut e transforme seu cuidado pessoal em um ritual de puro luxo e conveniência.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex"
            >
              <Card className={`flex flex-col w-full relative overflow-hidden transition-all duration-500 hover:translate-y-[-10px] ${
                plan.highlight 
                  ? "border-primary shadow-[0_0_30px_rgba(212,175,55,0.15)] bg-card/60 scale-105 z-10" 
                  : "border-border/40 bg-card/40"
              }`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-8 py-1 rotate-45 translate-x-[25px] translate-y-[10px] shadow-lg">
                      Popular
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto p-4 rounded-full mb-6 w-fit ${plan.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    <plan.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl font-serif">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm font-normal">{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-4">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex-grow py-8">
                  <div className="space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    variant={plan.highlight ? "default" : "outline"}
                    className={`w-full font-bold py-6 text-lg transition-all duration-300 ${
                      plan.highlight ? "bg-primary hover:bg-primary/90" : "hover:border-primary hover:text-primary"
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center max-w-3xl mx-auto p-8 rounded-2xl border border-border/40 bg-card/30"
        >
          <h3 className="text-xl font-bold mb-4">Como funciona a assinatura?</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            As assinaturas do Royal Club são recorrentes e cobradas mensalmente via cartão de crédito ou PIX automático. 
            Você pode cancelar ou alterar seu plano a qualquer momento sem taxas ocultas. 
            Os benefícios são ativados imediatamente após a confirmação do primeiro pagamento.
          </p>
        </motion.div>
      </div>
    </PublicLayout>
  );
}
