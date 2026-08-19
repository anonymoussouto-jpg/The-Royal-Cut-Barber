import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Calendar,
  Sparkles,
  Star,
  ArrowRight,
  Quote,
  Anchor,
  Users as UsersIcon,
  CheckCircle2,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { AIChatbot, AIChatInterface } from "@/components/ai/AIChatbot";
import { useBooking } from "@/hooks/use-booking";
import { useChatbot } from "@/hooks/use-chatbot";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "The Royal Cut | Excelência, Honra e Irmandade",
    meta: [
      {
        name: "description",
        content: "Mais que um corte, uma missão. The Royal Cut: Barbearia premium onde a tradição do cavalheirismo encontra a excelência guiada pela fé.",
      },
      { property: "og:title", content: "The Royal Cut | Excelência, Honra e Irmandade" },
      {
        property: "og:description",
        content: "Mais que um corte, uma missão. The Royal Cut: Barbearia premium onde a tradição do cavalheirismo encontra a excelência guiada pela fé.",
      },
      {
        property: "og:image",
        content: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2000",
      },
      { name: "twitter:image", content: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2000" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const booking = useBooking();
  const chatbot = useChatbot();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [bestBarber, setBestBarber] = useState<any>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [activeMembersCount, setActiveMembersCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [shopName, setShopName] = useState("The Royal Cut");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  // Social Proof Notification State
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(1);

  const fetchTodayAppointments = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString());

    setTodayAppointments(count || 0);
  }, []);

  const fetchRandomSocialNotification = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: appointments } = await supabase
      .from("appointments")
      .select("client_name, services(name)")
      .gte("created_at", sevenDaysAgo.toISOString())
      .limit(20);

    if (appointments && appointments.length > 0) {
      const randomIndex = Math.floor(Math.random() * appointments.length);
      const randomApp = appointments[randomIndex];

      if (!randomApp || !randomApp.client_name) return;

      const firstName = randomApp.client_name.split(" ")[0];
      const serviceName = (randomApp as any).services?.name || "um serviço Royal";

      toast(
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">
              {firstName} acabou de agendar um {serviceName}
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">
              Há poucos minutos
            </span>
          </div>
        </div>,
        {
          position: "bottom-left",
          duration: 5000,
          className: "bg-zinc-950 border-white/10",
        },
      );
    }
  }, []);

  useEffect(() => {
    const appointmentInterval = setInterval(fetchTodayAppointments, 60000);
    fetchTodayAppointments();

    const socialInterval = setInterval(
      () => {
        fetchRandomSocialNotification();
      },
      Math.floor(Math.random() * (90000 - 45000 + 1)) + 45000,
    );

    const onlineInterval = setInterval(() => {
      setOnlineCount(Math.floor(Math.random() * (18 - 8 + 1)) + 8);
    }, 5000);

    return () => {
      clearInterval(appointmentInterval);
      clearInterval(socialInterval);
      clearInterval(onlineInterval);
    };
  }, [fetchTodayAppointments, fetchRandomSocialNotification]);

  useEffect(() => {
    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['barber_shop_name', 'whatsapp_number', 'address'])
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map(d => [d.key, String(d.value).replace(/^"|"$/g, '')]));
          if (map["barber_shop_name"]) setShopName(map["barber_shop_name"]);
          if (map["whatsapp_number"]) setWhatsapp(map["whatsapp_number"]);
          if (map["address"]) setAddress(map["address"]);
        }
      });
  }, []);

  useEffect(() => {
    async function fetchData() {

      // Fetch Barbers
      const { data: barbersData } = await supabase.from("barbers").select("*");
      if (barbersData && barbersData.length > 0) {
        setBarbers(barbersData);
      } else {
        setBarbers([
          {
            id: "1",
            full_name: "Thiago Oliveira",
            avatar_url:
              "https://images.unsplash.com/photo-1599351431247-f10b21698303?auto=format&fit=crop&q=80&w=400",
            specialty: "Mestre em Barboterapia & Estética",
          },
          {
            id: "2",
            full_name: "Gabriel Santos",
            avatar_url:
              "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400",
            specialty: "Expert em Fade & Degradê Moderno",
          },
          {
            id: "3",
            full_name: "Marcos Lima",
            avatar_url:
              "https://images.unsplash.com/photo-1621605815841-aa378137397b?auto=format&fit=crop&q=80&w=400",
            specialty: "Especialista em Cortes Clássicos",
          },
        ]);
      }

      // Fetch Highlight Barber (Best of the Month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: apps } = await supabase
        .from("appointments")
        .select("barber_id")
        .gte("start_time", monthStart)
        .lte("start_time", monthEnd);

      if (apps && apps.length > 0) {
        const counts: Record<string, number> = {};
        apps.forEach((a) => (counts[a.barber_id] = (counts[a.barber_id] || 0) + 1));
        const topBarberId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topBarberId) {
          const { data: topBarberData } = await supabase
            .from("barbers")
            .select("*")
            .eq("id", topBarberId)
            .single();

          if (topBarberData) {
            setBestBarber({
              ...topBarberData,
              count: counts[topBarberId],
            });
          }
        }
      }

      // Fetch Highlighted Transformations
      const { data: transformations } = await supabase
        .from("transformations")
        .select("*")
        .eq("is_highlighted", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (transformations && transformations.length > 0) {
        setHighlights(transformations);
      }

      // Fetch Featured Services
      supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .limit(3)
        .order("created_at", { ascending: false })
        .then(({ data }) => setFeaturedServices(data || []));

      // Fetch Active Members Count
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .then(({ count }) => setActiveMembersCount(count || 0));
    }
    fetchData();
  }, []);
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
              <div className="flex flex-col items-center gap-4 mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {onlineCount} Cavalheiros Online
                </span>

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold tracking-widest uppercase">
                  <Sparkles className="w-3 h-3" />
                  Excelência e Honra
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight text-center lg:text-left">
                {shopName} <br />
                <span className="text-primary italic">Barbearia e Irmandade</span>
              </h1>
              <p className="max-w-2xl mx-auto lg:mx-0 text-lg md:text-xl text-gray-300 mb-10 text-center lg:text-left">
                Muito mais que um corte. Um espaço de honra, excelência e irmandade, guiado pelo
                Thiago para servir você com o melhor da arte da barbearia.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button
                  onClick={() => booking.open()}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 rounded-full font-bold text-lg shadow-lg shadow-primary/20"
                >
                  Agendar Horário
                  <Calendar className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  onClick={() => chatbot.open()}
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 hover:bg-white/5 px-8 h-14 rounded-full font-bold text-lg"
                >
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

        {/* Urgency Ribbon */}
        <div className="relative z-30 bg-primary/90 backdrop-blur-md py-3 overflow-hidden border-y border-white/10">
          <div className="container px-6 mx-auto flex items-center justify-center gap-3 text-black font-black text-[10px] md:text-xs uppercase tracking-[0.2em]">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {todayAppointments} agendamentos realizados hoje — Reserve o seu antes que os horários
              acabem!
            </span>
          </div>
        </div>

        {/* Our History Section */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container px-6 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Anchor className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold tracking-[0.3em] text-primary uppercase">
                    Nossa Identidade
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 leading-tight text-white">
                  Mais que um Corte. <br />
                  <span className="text-primary italic">Uma Missão.</span>
                </h2>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    A The Royal Cut nasceu do coração de Thiago, um homem de fé que acredita que o
                    cuidado com o próximo é uma forma de louvor. Aqui, cada cliente é tratado com a
                    dignidade que merece — não apenas como consumidor, mas como irmão.
                  </p>
                  <p>
                    Fundada sobre os valores de excelência, honra e propósito, nossa barbearia é um
                    espaço onde o homem pode ser cuidado por inteiro: no visual, na conversa e no
                    espírito.
                  </p>
                </div>

                <div className="mt-12 p-8 border-l-4 border-primary bg-primary/5 rounded-r-2xl">
                  <Quote className="w-8 h-8 text-primary/20 mb-4" />
                  <p className="text-xl font-serif italic text-white mb-4">
                    "Tudo o que fizerem, façam de coração, como para o Senhor."
                  </p>
                  <cite className="text-sm font-bold text-primary uppercase tracking-widest not-italic">
                    — Colossenses 3:23
                  </cite>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="aspect-[4/5] rounded-3xl overflow-hidden border-8 border-card shadow-2xl relative z-10">
                  <img
                    src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800"
                    alt="Propósito e Fé"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Signature Experiences */}
        <section className="py-24 bg-background">
          <div className="container px-6 mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                  Galeria de Serviços
                </h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold">Excelência no Cuidado</h3>
              </div>
              <p className="max-w-md text-muted-foreground">
                De cortes clássicos a cuidados com a barba, cada serviço é executado com dedicação e
                respeito à sua imagem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredServices.length > 0 ? (
                featuredServices.map((service, i) => (
                  <motion.div
                    key={service.id}
                    whileHover={{ y: -10 }}
                    className="group relative overflow-hidden rounded-2xl bg-card border border-border/40"
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={service.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800"}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold font-serif">{service.name}</h4>
                        <span className="text-primary font-bold">R$ {service.price}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-6 leading-relaxed line-clamp-2">
                        {service.description}
                      </p>
                      <Button
                        onClick={() => booking.open(service.id)}
                        variant="link"
                        className="p-0 text-primary font-bold group-hover:gap-2 transition-all"
                      >
                        Ver detalhes <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">Carregando serviços de excelência...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 bg-background">
          <div className="container px-6 mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                Nossa Equipe
              </h2>
              <h3 className="text-4xl md:text-5xl font-serif font-bold">Mestres Barbeiros</h3>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {barbers.map((barber, i) => (
                <motion.div
                  key={barber.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative mb-6">
                    <div className="w-48 h-48 rounded-full border-4 border-primary/20 p-2 overflow-hidden transition-all duration-500 hover:border-primary">
                      <img
                        src={
                          barber.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.full_name}`
                        }
                        alt={barber.full_name}
                        className="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  </div>
                  <h4 className="text-2xl font-bold font-serif mb-2">{barber.full_name}</h4>
                  <p className="text-primary text-sm font-medium mb-6 uppercase tracking-wider">
                    {barber.specialty || "Expert Barber"}
                  </p>
                  <Button
                    onClick={() => booking.open(null, barber.id)}
                    variant="outline"
                    className="border-primary/20 hover:border-primary hover:bg-primary/10 text-white rounded-full px-6"
                  >
                    Agendar com {barber.full_name.split(" ")[0]}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Transformations Section */}
        <section className="py-24 bg-card relative overflow-hidden">
          <div className="container px-6 mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                Resultados Reais
              </h2>
              <h3 className="text-4xl md:text-5xl font-serif font-bold">Transformações</h3>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {highlights.length > 0 ? (
                highlights.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.2 }}
                  >
                    <BeforeAfterSlider
                      beforeImage={photo.before_image_url}
                      afterImage={photo.after_image_url}
                    />
                    <div className="mt-4 flex items-center justify-between px-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        {photo.style_tag || "Estilo Royal"}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    <BeforeAfterSlider
                      beforeImage="https://images.unsplash.com/photo-1599351431247-f10b21698303?auto=format&fit=crop&q=80&w=800"
                      afterImage="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <BeforeAfterSlider
                      beforeImage="https://images.unsplash.com/photo-1621605815841-aa378137397b?auto=format&fit=crop&q=80&w=800"
                      afterImage="https://images.unsplash.com/photo-1590540179852-2110a54f813a?auto=format&fit=crop&q=80&w=800"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <BeforeAfterSlider
                      beforeImage="https://images.unsplash.com/photo-1512690196222-7c74e041bd2e?auto=format&fit=crop&q=80&w=800"
                      afterImage="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800"
                    />
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Barber of the Month Highlight */}
        {bestBarber && (
          <section className="py-24 bg-gradient-to-b from-background to-card relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
            <div className="container px-6 mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-4xl mx-auto rounded-[3rem] p-12 bg-zinc-950/80 border-2 border-primary/30 backdrop-blur-xl relative"
              >
                <div className="absolute top-0 right-12 -translate-y-1/2">
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 rotate-12">
                    <Star className="w-12 h-12 text-black fill-black" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="relative">
                    <div className="aspect-square rounded-full overflow-hidden border-8 border-primary/10 p-2">
                      <img
                        src={
                          bestBarber.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${bestBarber.full_name}`
                        }
                        alt={bestBarber.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-[0.3em]">
                      Destaque do Mês
                    </span>
                    <h2 className="text-4xl md:text-5xl font-serif font-black text-white italic">
                      {bestBarber.full_name}
                    </h2>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                      "Honra, dedicação e excelência em cada detalhe. Nosso destaque de{" "}
                      {format(new Date(), "MMMM", { locale: ptBR })}."
                    </p>
                    <div className="flex items-center gap-4 py-6 border-y border-white/5">
                      <div className="text-center">
                        <div className="text-3xl font-serif font-black text-primary">
                          {bestBarber.count}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40">
                          Atendimentos
                        </div>
                      </div>
                      <div className="w-px h-12 bg-white/5" />
                      <div className="text-center">
                        <div className="text-3xl font-serif font-black text-primary">100%</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40">
                          Satisfação
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => booking.open(null, bestBarber.id)}
                      size="lg"
                      className="bg-primary text-black font-black uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Agendar com o Especialista
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        <section className="py-24 bg-background">
          <div className="container px-6 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                Depoimentos
              </h2>
              <h3 className="text-4xl md:text-5xl font-serif font-bold italic">
                O Que Dizem Nossos Irmãos
              </h3>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  name: "Carlos Eduardo",
                  text: "Além do corte impecável, saí com o espírito renovado. A The Royal Cut é mais que uma barbearia, é um espaço de irmandade!",
                  seed: "Carlos",
                },
                {
                  name: "Rafael Silva",
                  text: "Thiago e sua equipe trabalham com uma excelência rara. O ambiente é de total respeito e camaradagem. Recomendo muito!",
                  seed: "Rafael",
                },
                {
                  name: "André Luiz",
                  text: "Lugar abençoado! O atendimento é personalizado e você se sente em casa. Um verdadeiro refúgio para o homem cristão.",
                  seed: "Andre",
                },
                {
                  name: "Felipe Mendes",
                  text: "A melhor experiência que já tive em uma barbearia. Tudo é feito com muita honra e cuidado. Os Barber Points são um bônus ótimo!",
                  seed: "Felipe",
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-card p-8 rounded-3xl border border-border/40 flex flex-col relative"
                >
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-grow italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.seed}`}
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30"
                    />
                    <div>
                      <h5 className="font-bold text-sm">{testimonial.name}</h5>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">
                        Cliente Real
                      </span>
                    </div>
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
                <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                  Irmandade
                </h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold mb-8">
                  Clube de Irmandade & Barber Points
                </h3>
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                  Faça parte da nossa aliança e desfrute de benefícios exclusivos, fortalecendo
                  laços e garantindo o melhor cuidado.
                </p>
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Barber Points</h5>
                      <p className="text-sm text-muted-foreground">
                        Cada real gasto gera pontos que podem ser trocados por serviços ou produtos
                        na Grooming Store.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Membro Aliança</h5>
                      <p className="text-sm text-muted-foreground">
                        Cortes planejados e cuidado constante. Prioridade total para quem caminha
                        conosco.
                      </p>
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
                    <span className="text-xs font-medium text-muted-foreground">
                      Membros Ativos agora
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-serif mb-1">{activeMembersCount}</div>
                  <p className="text-[10px] text-muted-foreground">
                    Irmãos que confiam em nosso trabalho.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Chat Interface Section */}
        <section className="py-24 bg-zinc-950/50">
          <div className="container px-6 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-sm font-semibold tracking-[0.3em] text-primary uppercase mb-4">
                  Dúvidas ou Agendamento?
                </h2>
                <h3 className="text-4xl md:text-5xl font-serif font-bold mb-8">
                  Fale com a <span className="text-primary italic">Royal IA</span>
                </h3>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Nossa assistente virtual está pronta para ajudar você com horários, serviços, dúvidas sobre o Clube e muito mais. Atendimento instantâneo com a excelência que você merece.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Agendamento rápido via chat
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Informações sobre todos os serviços
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Dúvidas sobre o sistema de pontos
                  </div>
                </div>
              </div>
              <div className="relative">
                <AIChatInterface inline={true} />
              </div>
            </div>
          </div>
        </section>

        <AIChatbot />
      </div>
    </PublicLayout>
  );
}
