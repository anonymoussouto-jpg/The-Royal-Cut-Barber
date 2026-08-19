import { createFileRoute, useNavigate } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Star, ShieldCheck, Loader2, QrCode, ClipboardCheck, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createSubscriptionPayment } from "@/lib/subscriptions.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/membership")({
  head: () => ({
    title: "Membro Fiel e Alianças | The Royal Cut",
    meta: [
      {
        name: "description",
        content: "Junte-se à nossa irmandade. Escolha seu plano de assinatura e desfrute de benefícios exclusivos e cortes ilimitados.",
      },
      { property: "og:title", content: "Membro Fiel e Alianças | The Royal Cut" },
      {
        property: "og:description",
        content: "Junte-se à nossa irmandade. Escolha seu plano de assinatura e desfrute de benefícios exclusivos e cortes ilimitados.",
      },
    ],
  }),
  component: MembershipPage,
});

const plans = [
  {
    id: "fiel",
    name: "Membro Fiel",
    price: 149.9,
    period: "/mês",
    description: "Para quem valoriza o essencial com excelência e cuidado.",
    icon: Star,
    features: [
      "2 Cortes de Cabelo inclusos",
      "1 Ajuste de Pezinho",
      "Agendamento Prioritário via App",
      "10% de desconto em produtos",
      "Café Nespresso liberado",
    ],
    highlight: false,
    buttonText: "Unir-se como Fiel",
    pointsMonthly: 20,
  },
  {
    id: "royal",
    name: "Aliança Royal",
    price: 289.9,
    period: "/mês",
    description: "Cuidado completo e presença constante na irmandade.",
    icon: Crown,
    features: [
      "Cortes Ilimitados",
      "Barbas Ilimitadas",
      "Sobrancelha inclusa",
      "15% de desconto em produtos",
      "1 Cerveja Artesanal por visita",
      "Acesso ao Espaço de Confraternização",
    ],
    highlight: true,
    buttonText: "Firmar Aliança",
    pointsMonthly: 50,
  },
  {
    id: "plena",
    name: "Irmandade Plena",
    price: 499.9,
    period: "/mês",
    description: "Compromisso total com a excelência e honra mútua.",
    icon: ShieldCheck,
    features: [
      "Todos os serviços ilimitados",
      "Espaço reservado para conversas edificantes",
      "Prioridade absoluta na agenda",
      "20% de desconto em produtos",
      "Manobrista incluso",
      "Convite para encontros da irmandade",
    ],
    highlight: false,
    buttonText: "Fazer parte da Irmandade",
    pointsMonthly: 100,
  },
];

function MembershipPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[0] | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [clientInfo, setClientInfo] = useState({ name: "", phone: "" });
  const [pixKey, setPixKey] = useState("");
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string } | null>(null);
  const createSubFn = useServerFn(createSubscriptionPayment);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session!.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: currentSubscription, isLoading: loadingSub } = useQuery({
    queryKey: ["my-subscription", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("client_id", session!.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const fetchPixKey = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "pix_key")
        .maybeSingle();

      if (data?.value) {
        try {
          setPixKey(JSON.parse(data.value as string));
        } catch {
          setPixKey(data.value as string);
        }
      }
    };
    fetchPixKey();
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async (plan: (typeof plans)[0]) => {
      if (!session?.user?.id) throw new Error("Não autenticado");
      
      const result = await createSubFn({
        data: {
          planName: plan.name,
          planPrice: plan.price,
          userId: session.user.id,
          userEmail: session.user.email || "",
          userName: profile?.full_name || "Membro",
        }
      });

      setPixData({
        encodedImage: result.encodedImage,
        payload: result.payload,
      });
      setPixKey(result.payload);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      toast.info("QR Code PIX gerado. Pague para ativar sua assinatura.");
    },
    onError: (error: any) => {
      toast.error("Erro ao gerar pagamento: " + error.message);
    },
  });

  const handlePlanClick = (plan: (typeof plans)[0]) => {
    if (!session) {
      navigate({ to: "/login", search: { redirect: "/membership" } });
      return;
    }

    if (currentSubscription) {
      setShowUpgradeModal(true);
      return;
    }

    setSelectedPlan(plan);
    setClientInfo({
      name: profile?.full_name || "",
      phone: profile?.phone || "",
    });
    setShowConfirmModal(true);
  };

  if (loadingSub)
    return (
      <PublicLayout>
        <div className="container mx-auto px-6 py-20 min-h-screen">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-80 mx-auto mb-6" />
            <Skeleton className="h-6 w-[500px] mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[600px] w-full rounded-3xl" />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Honra e Irmandade</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">Clube de Irmandade</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Junte-se à nossa aliança na The Royal Cut e transforme seu cuidado pessoal em um momento
            de honra e fraternidade.
          </p>

          {currentSubscription && (
            <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-bold">
              <Crown className="w-5 h-5" />
              Você é um Membro: {currentSubscription.plan_name}
            </div>
          )}
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
              <Card
                className={`flex flex-col w-full relative overflow-hidden transition-all duration-500 hover:translate-y-[-10px] ${
                  plan.highlight
                    ? "border-primary shadow-[0_0_30px_rgba(212,175,55,0.15)] bg-card/60 scale-105 z-10"
                    : "border-border/40 bg-card/40"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-8 py-1 rotate-45 translate-x-[25px] translate-y-[10px] shadow-lg">
                      Popular
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div
                    className={`mx-auto p-4 rounded-full mb-6 w-fit ${plan.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                  >
                    <plan.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl font-serif">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2).replace(".", ",")}
                    </span>
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
                    <div className="pt-4 border-t border-white/5 flex items-center gap-3 text-primary">
                      <Star className="w-4 h-4 fill-primary" />
                      <span className="text-sm font-bold">
                        +{plan.pointsMonthly} Barber Points mensais
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handlePlanClick(plan)}
                    variant={plan.highlight ? "default" : "outline"}
                    className={`w-full font-bold py-6 text-lg transition-all duration-300 ${
                      plan.highlight
                        ? "bg-primary hover:bg-primary/90"
                        : "hover:border-primary hover:text-primary"
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Upgrade Modal */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                Aliança Ativa
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Você já possui uma assinatura ativa do plano{" "}
                <span className="text-primary font-bold">{currentSubscription?.plan_name}</span>.
                Deseja fazer o upgrade ou gerenciar sua conta? Entre em contato com nossa equipe.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button
                onClick={() => setShowUpgradeModal(false)}
                className="bg-primary text-black font-bold w-full"
              >
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Subscription Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Confirmar Aliança</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Resumo do plano escolhido e dados para ativação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-primary">{selectedPlan?.name}</h4>
                  <p className="text-xs text-muted-foreground">{selectedPlan?.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    R$ {selectedPlan?.price.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Mensal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome</Label>
                  <Input
                    id="name"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="(99) 99999-9999"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              {pixData ? (
                <div className="p-6 rounded-2xl bg-black border border-primary/20 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                  <p className="text-sm font-bold text-primary uppercase tracking-widest">
                    Pagamento Instantâneo via PIX
                  </p>
                  <div className="w-48 h-48 bg-white mx-auto rounded-xl p-2 flex items-center justify-center">
                    <img
                      src={`data:image/png;base64,${pixData.encodedImage}`}
                      alt="PIX QR Code"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Escaneie o código acima ou use a chave abaixo:
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary hover:bg-primary/10 gap-2 font-mono text-[10px] w-full break-all whitespace-normal h-auto py-3"
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.payload);
                        toast.success("Copiado para a área de transferência!");
                      }}
                    >
                      <Copy className="w-3 h-3 shrink-0" />
                      {pixData.payload}
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">
                    Sua assinatura será ativada automaticamente após a confirmação.
                  </p>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 border border-white/5 rounded-2xl">
                  Aguardando confirmação dos dados...
                </div>
              )}
            </div>
 
            {!pixData && (
              <DialogFooter>
                <Button
                  onClick={() => subscribeMutation.mutate(selectedPlan!)}
                  disabled={subscribeMutation.isPending || !clientInfo.name || !clientInfo.phone}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-bold h-12 rounded-xl"
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Gerar Pagamento PIX"
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center max-w-3xl mx-auto p-8 rounded-2xl border border-border/40 bg-card/30"
        >
          <h3 className="text-xl font-bold mb-4">Como funciona a nossa aliança?</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            As participações no Clube são recorrentes e processadas mensalmente. Você pode ajustar
            sua participação a qualquer momento com total transparência. Os benefícios de honra são
            ativados imediatamente após a confirmação da sua aliança.
          </p>
        </motion.div>
      </div>
    </PublicLayout>
  );
}
