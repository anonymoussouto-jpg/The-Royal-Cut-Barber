import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBooking } from "@/hooks/use-booking";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Scissors,
  User,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  QrCode,
  Copy,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  CreditCard,
  Wallet,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createAsaasPayment } from "@/lib/payments.functions";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Step =
  | "service"
  | "barber"
  | "datetime"
  | "info"
  | "payment_method"
  | "payment_pix"
  | "payment_card"
  | "success";

export function BookingModal() {
  const { isOpen, close, serviceId: initialServiceId, barberId: initialBarberId } = useBooking();
  const [step, setStep] = useState<Step>("service");
  const [loading, setLoading] = useState(false);

  // Data from Supabase
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [barbers, setBarbers] = useState<Tables<"barbers">[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [asaasData, setAsaasData] = useState<any>(null);
  const [lastAppointmentId, setLastAppointmentId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  const startPaymentFn = useServerFn(createAsaasPayment);

  // Selection state
  const [selectedService, setSelectedService] = useState<Tables<"services"> | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Tables<"barbers"> | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const fetchBookedSlots = useCallback(async () => {
    if (!selectedBarber || !selectedDate) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("appointments")
      .select("start_time, services(duration_minutes)")
      .eq("barber_id", selectedBarber.id)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .neq("status", "cancelled");

    if (data) {
      const slots: string[] = [];
      data.forEach((app: any) => {
        const startTime = new Date(app.start_time);
        const duration = app.services?.duration_minutes || 30;
        
        // Block slots based on duration (every 30 mins)
        let currentTime = new Date(startTime);
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        while (currentTime < endTime) {
          slots.push(format(currentTime, "HH:mm"));
          currentTime.setMinutes(currentTime.getMinutes() + 30);
        }
      });
      setBookedSlots([...new Set(slots)]);
    }
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchBarbers();
      fetchPixKey();
      setStep("service");
      // Reset if not starting from a specific service
      if (!initialServiceId) {
        setSelectedService(null);
      }
    }
  }, [isOpen, initialServiceId]);

  useEffect(() => {
    if (initialServiceId && services.length > 0) {
      const service = services.find((s) => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setStep("barber");
      }
    }
  }, [initialServiceId, services]);

  useEffect(() => {
    if (initialBarberId && barbers.length > 0) {
      const barber = barbers.find((b) => b.id === initialBarberId);
      if (barber) {
        setSelectedBarber(barber);
        setStep("datetime");
      }
    }
  }, [initialBarberId, barbers]);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedBarber, selectedDate, fetchBookedSlots]);

  // Removed duplicate fetchBookedSlots declaration

  async function fetchServices() {
    const { data } = await supabase.from("services").select("*");
    if (data) setServices(data);
  }

  async function fetchBarbers() {
    const { data } = await supabase.from("barbers").select("*");
    if (data) setBarbers(data);
  }

  async function fetchPixKey() {
    // Pix key is now managed via Asaas creation, no longer pre-fetched
  }

  // Duplicate function removed as it was replaced by a useCallback version above

  const timeSlots = [
    "09:00", "09:30",
    "10:00", "10:30",
    "11:00", "11:30",
    "13:00", "13:30",
    "14:00", "14:30",
    "15:00", "15:30",
    "16:00", "16:30",
    "17:00", "17:30",
    "18:00", "18:30",
    "19:00", "19:30",
  ];

  useEffect(() => {
    let timer: any;
    if ((step === "payment_pix" || step === "payment_card") && timeLeft > 0 && !isExpired) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft, isExpired]);

  useEffect(() => {
    if (!lastAppointmentId) return;

    const channel = supabase
      .channel(`appointment-status-${lastAppointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${lastAppointmentId}`,
        },
        (payload) => {
          if (payload.new["status"] === "confirmed") {
            setStep("success");
            toast.success("Pagamento confirmado!");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastAppointmentId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRegeneratePix = () => {
    setTimeLeft(900);
    setIsExpired(false);
    handleBooking("PIX");
  };

  const handleBooking = async (paymentMethod: "PIX" | "CREDIT_CARD" | "IN_PERSON") => {
    // Basic availability check before submission
    if (bookedSlots.includes(selectedTime!)) {
      toast.error("Este horário acaba de ser ocupado. Por favor, escolha outro.");
      fetchBookedSlots();
      setStep("datetime");
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date(selectedDate!);
      const [hoursStr, minutesStr] = selectedTime!.split(":");
      startTime.setHours(parseInt(hoursStr || "0"), parseInt(minutesStr || "0"), 0, 0);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let clientId = user?.id;

      if (!clientId) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", clientPhone)
          .maybeSingle();

        if (existingProfile) {
          clientId = existingProfile.id;
        } else {
          const { data: newProfile, error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: crypto.randomUUID(),
              full_name: clientName,
              phone: clientPhone,
              is_guest: true,
            })
            .select("id")
            .single();

          if (profileError) throw profileError;
          clientId = newProfile.id;
        }
      }

      if (!selectedService || !selectedBarber)
        throw new Error("Serviço ou barbeiro não selecionado");

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          service_id: selectedService.id,
          barber_id: selectedBarber.id,
          client_id: clientId,
          client_name: clientName,
          client_phone: clientPhone,
          start_time: startTime.toISOString(),
          total_price: selectedService.price,
          status: "pending",
          payment_method: paymentMethod,
        } as any)
        .select("id")
        .single();

      if (appointmentError) throw appointmentError;
      setLastAppointmentId(appointment.id);

      if (paymentMethod === "IN_PERSON") {
        setStep("success");
        toast.success("Agendamento realizado! Pague no local.");
        return;
      }

      // Asaas Integration
      const asaasRes = await startPaymentFn({
        data: {
          orderId: appointment.id,
          amount: selectedService.price,
          customerName: clientName,
          mobilePhone: clientPhone,
          billingType: paymentMethod as any,
          entityType: "appointment",
        },
      });

      setAsaasData(asaasRes);
      if (paymentMethod === "PIX") setStep("payment_pix");
      else if (paymentMethod === "CREDIT_CARD") setStep("payment_card");
    } catch (error: unknown) {
      toast.error("Erro ao agendar: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (asaasData?.payload) {
      navigator.clipboard.writeText(asaasData.payload);
      toast.success("Código PIX copiado!");
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: "service", label: "Serviço", icon: Scissors },
    { key: "barber", label: "Barbeiro", icon: User },
    { key: "datetime", label: "Data/Hora", icon: CalendarIcon },
    { key: "info", label: "Dados", icon: CheckCircle2 },
    { key: "payment_method", label: "Pagamento", icon: CreditCard },
    { key: "success", label: "Confirmado", icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[500px] w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] bg-[#0A0A0A] border-white/10 text-white overflow-hidden p-0 flex flex-col rounded-none sm:rounded-3xl">
        {/* Stepper */}
        <div className="px-6 py-4 bg-white/5 border-b border-white/10 overflow-x-auto no-scrollbar shrink-0">
          {/* Mobile Stepper Simple */}
          <div className="sm:hidden flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              Etapa {currentStepIndex + 1}/6
            </span>
            <span className="text-[10px] text-white/40 uppercase font-bold">
              {steps[currentStepIndex]?.label}
            </span>
            <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / 6) * 100}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-between min-w-[400px]">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = idx < currentStepIndex || step === "success";
              const isActive = s.key === step;

              return (
                <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1 relative">
                  {idx !== 0 && (
                    <div
                      className={`absolute right-1/2 w-full h-[2px] -z-10 top-4 ${isCompleted ? "bg-green-500/50" : "bg-white/10"}`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-white/5 text-white/40"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-primary" : "text-white/40"}`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === "service" && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Escolha o Serviço</h2>
                    <p className="text-xs text-white/50">Selecione a experiência desejada</p>
                  </div>
                </div>
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep("barber");
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-black overflow-hidden">
                          <img
                            src={
                              service.image_url ||
                              "https://images.unsplash.com/photo-1503951914875-452162b0f3f1"
                            }
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold">{service.name}</h3>
                          <p className="text-xs text-white/40">{service.duration_minutes} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">R$ {service.price}</span>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "barber" && (
              <motion.div
                key="barber"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("service")}
                  className="text-white/40 hover:text-white -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Escolha o Barbeiro</h2>
                    <p className="text-xs text-white/50">Quem irá cuidar do seu visual?</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber);
                        setStep("datetime");
                      }}
                      className="flex flex-col items-center p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-center group"
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-primary/20 p-1 mb-4 group-hover:border-primary/50 transition-all">
                        <img
                          src={
                            barber.avatar_url ||
                            "https://api.dicebear.com/7.x/avataaars/svg?seed=" + barber.full_name
                          }
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <h3 className="font-bold text-sm">{barber.full_name}</h3>
                      <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                        Expert Barber
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "datetime" && (
              <motion.div
                key="datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("barber")}
                  className="text-white/40 hover:text-white -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Data e Horário</h2>
                    <p className="text-xs text-white/50">Selecione o melhor momento</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ptBR}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="bg-transparent text-white"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Horários Disponíveis
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        const availableSlots = timeSlots.length - bookedSlots.length;
                        const isUrgent = !isBooked && availableSlots <= 2;

                        return (
                          <div key={time} className="relative">
                            <button
                              disabled={isBooked}
                              onClick={() => setSelectedTime(time)}
                              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                                selectedTime === time
                                  ? "bg-primary text-primary-foreground"
                                  : isBooked
                                    ? "bg-white/5 text-white/20 cursor-not-allowed line-through"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {time}
                            </button>
                            {isUrgent && (
                              <div className="absolute -top-2 -right-1 z-10">
                                <motion.span
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="bg-red-500 text-white text-[7px] font-black uppercase px-1 rounded flex items-center gap-0.5 shadow-lg shadow-red-500/20"
                                >
                                  🔥 ÚLTIMAS!
                                </motion.span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    disabled={!selectedTime}
                    onClick={() => setStep("info")}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold"
                  >
                    Continuar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("datetime")}
                  className="text-white/40 hover:text-white -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Seus Dados</h2>
                    <p className="text-xs text-white/50">
                      Quase lá! Só precisamos saber quem você é.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                      Nome Completo
                    </label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                      WhatsApp
                    </label>
                    <input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mt-6">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
                      Resumo
                    </h4>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/40">Serviço:</span>
                      <span className="font-bold">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/40">Barbeiro:</span>
                      <span className="font-bold">{selectedBarber?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Data/Hora:</span>
                      <span className="font-bold">
                        {selectedDate ? format(selectedDate, "dd/MM 'às' ", { locale: ptBR }) : ""}{" "}
                        {selectedTime}
                      </span>
                    </div>
                  </div>

                  <Button
                    disabled={!clientName || !clientPhone}
                    onClick={() => setStep("payment_method")}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold"
                  >
                    Ir para o Pagamento
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "payment_method" && (
              <motion.div
                key="payment_method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Forma de Pagamento</h2>
                    <p className="text-xs text-white/50">Escolha como deseja pagar</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button
                    onClick={() => handleBooking("PIX")}
                    disabled={loading}
                    className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white"
                  >
                    <QrCode className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">PIX</p>
                      <p className="text-[10px] text-white/40 uppercase">Liberação Imediata</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleBooking("CREDIT_CARD")}
                    disabled={loading}
                    className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white"
                  >
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">Cartão de Crédito</p>
                      <p className="text-[10px] text-white/40 uppercase">Pelo Asaas</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleBooking("IN_PERSON")}
                    disabled={loading}
                    className="h-16 justify-start gap-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white"
                  >
                    <Wallet className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-bold">Pagar na Barbearia</p>
                      <p className="text-[10px] text-white/40 uppercase">No Local</p>
                    </div>
                  </Button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold">
                      Processando cobrança...
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {step === "payment_pix" && (
              <motion.div
                key="payment_pix"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-primary font-serif">Escaneie o PIX</h3>
                  <p className="text-xs text-white/50">
                    Pague agora para confirmar seu horário automaticamente.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto shadow-2xl shadow-primary/20">
                  {asaasData?.encodedImage ? (
                    <img
                      src={`data:image/png;base64,${asaasData.encodedImage}`}
                      alt="QR PIX"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-black">
                      QR Indisponível
                    </div>
                  )}
                </div>

                <div className="space-y-4 px-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {isExpired ? (
                      <div className="space-y-3">
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest">
                          Código expirado — gere um novo PIX
                        </p>
                        <Button
                          onClick={handleRegeneratePix}
                          className="w-full bg-primary text-black font-bold h-10 rounded-xl"
                        >
                          Gerar Novo PIX
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          Expira em
                        </p>
                        <p className="text-2xl font-mono font-bold text-primary">
                          ⏱️ {formatTime(timeLeft)}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isExpired && (
                    <>
                      <Button
                        variant="outline"
                        onClick={copyPix}
                        className="w-full border-white/10 bg-white/5 h-12 rounded-xl text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copiar Código Copia e Cola
                      </Button>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                          Aguardando confirmação em tempo real...
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === "payment_card" && (
              <motion.div
                key="payment_card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <h3 className="text-xl font-bold text-primary font-serif">Finalize no Cartão</h3>
                <p className="text-xs text-white/50 px-8">
                  Clique no botão abaixo para abrir o ambiente seguro de pagamento do Asaas.
                </p>

                <div className="px-4">
                  <Button
                    asChild
                    className="w-full h-12 bg-primary text-black font-bold rounded-xl"
                  >
                    <a href={asaasData?.invoiceUrl} target="_blank" rel="noopener noreferrer">
                      Abrir Checkout Asaas
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-6">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                    Monitorando pagamento...
                  </span>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-12"
              >
                <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </motion.div>
                </div>
                <h2 className="text-3xl font-bold font-serif mb-4">Agendado!</h2>
                <p className="text-white/50 mb-8 max-w-[300px]">
                  Sua experiência na The Royal Cut está confirmada. Enviamos os detalhes para seu
                  WhatsApp.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-[300px]">
                  <Button
                    onClick={() => {
                      const date = selectedDate
                        ? format(selectedDate, "dd/MM", { locale: ptBR })
                        : "";
                      const text = `Olá ${clientName}! Seu agendamento na The Royal Cut foi confirmado! ✅ Serviço: ${selectedService?.name} | Barbeiro: ${selectedBarber?.full_name}. Até lá! ✂️`;
                      window.open(
                        `https://wa.me/55${clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
                        "_blank",
                      );
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Enviar confirmação no WhatsApp
                  </Button>
                  <Button
                    onClick={close}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold"
                  >
                    Concluído
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
