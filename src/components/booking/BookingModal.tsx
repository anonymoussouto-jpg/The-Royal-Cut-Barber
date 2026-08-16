import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '@/hooks/use-booking';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Step = 'service' | 'barber' | 'datetime' | 'info' | 'payment' | 'success';

export function BookingModal() {
  const { isOpen, close, serviceId: initialServiceId, barberId: initialBarberId } = useBooking();
  const [step, setStep] = useState<Step>('service');
  const [loading, setLoading] = useState(false);
  
  // Data from Supabase
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [pixKey, setPixKey] = useState<string>("00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5913THE ROYAL CUT6009SAO PAULO62070503***6304E2B1");

  // Selection state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchBarbers();
      fetchPixKey();
      setStep('service');
      // Reset if not starting from a specific service
      if (!initialServiceId) {
        setSelectedService(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialServiceId && services.length > 0) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setStep('barber');
      }
    }
  }, [initialServiceId, services]);

  useEffect(() => {
    if (initialBarberId && barbers.length > 0) {
      const barber = barbers.find(b => b.id === initialBarberId);
      if (barber) {
        setSelectedBarber(barber);
        setStep('datetime');
      }
    }
  }, [initialBarberId, barbers]);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedBarber, selectedDate]);

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*');
    if (data) setServices(data);
  }

  async function fetchBarbers() {
    const { data } = await supabase.from('barbers').select('*');
    if (data) setBarbers(data);
  }

  async function fetchPixKey() {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pix_key')
      .single();
    if (data?.value) setPixKey(String(data.value));
  }

  async function fetchBookedSlots() {
    if (!selectedBarber || !selectedDate) return;
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('barber_id', selectedBarber.id)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (data) {
      setBookedSlots(data.map(a => new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
    }
  }

  const timeSlots = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  const handleBooking = async () => {
    setLoading(true);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const startTime = new Date(selectedDate!);
      const [hoursStr, minutesStr] = selectedTime!.split(':');
      startTime.setHours(parseInt(hoursStr || '0'), parseInt(minutesStr || '0'), 0, 0);

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('appointments').insert({
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        client_id: user?.id || '00000000-0000-0000-0000-000000000000',
        start_time: startTime.toISOString(),
        total_price: selectedService.price,
        status: 'confirmed'
      });

      if (error) throw error;
      
      setStep('success');
      toast.success('Agendamento confirmado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao agendar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    toast.success('Código PIX copiado!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-white/10 text-white overflow-hidden p-0">
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'service' && (
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
                        setStep('barber');
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-black overflow-hidden">
                          <img src={service.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1"} className="w-full h-full object-cover opacity-80" />
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

            {step === 'barber' && (
              <motion.div
                key="barber"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button variant="ghost" size="sm" onClick={() => setStep('service')} className="text-white/40 hover:text-white -ml-2">
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
                        setStep('datetime');
                      }}
                      className="flex flex-col items-center p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-center group"
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-primary/20 p-1 mb-4 group-hover:border-primary/50 transition-all">
                        <img 
                          src={barber.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + barber.full_name} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      </div>
                      <h3 className="font-bold text-sm">{barber.full_name}</h3>
                      <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Expert Barber</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'datetime' && (
              <motion.div
                key="datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button variant="ghost" size="sm" onClick={() => setStep('barber')} className="text-white/40 hover:text-white -ml-2">
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
                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => setSelectedTime(time)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${
                              selectedTime === time
                                ? 'bg-primary text-primary-foreground'
                                : isBooked
                                ? 'bg-white/5 text-white/20 cursor-not-allowed line-through'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <Button 
                    disabled={!selectedTime}
                    onClick={() => setStep('info')}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold"
                  >
                    Continuar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Button variant="ghost" size="sm" onClick={() => setStep('datetime')} className="text-white/40 hover:text-white -ml-2">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Seus Dados</h2>
                    <p className="text-xs text-white/50">Quase lá! Só precisamos saber quem você é.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">WhatsApp</label>
                    <input 
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mt-6">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Resumo</h4>
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
                      <span className="font-bold">{selectedDate ? format(selectedDate, "dd/MM 'às' ", { locale: ptBR }) : ''} {selectedTime}</span>
                    </div>
                  </div>

                  <Button 
                    disabled={!clientName || !clientPhone}
                    onClick={() => setStep('payment')}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold"
                  >
                    Ir para o Pagamento
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <QrCode className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold font-serif mb-2">Pagamento via PIX</h2>
                  <p className="text-sm text-white/50 max-w-[280px]">Escaneie o código abaixo para confirmar seu agendamento.</p>
                </div>

                <div className="bg-white p-4 rounded-3xl w-48 h-48 mx-auto mb-8">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixKey)}`} className="w-full h-full" alt="QR PIX" />
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={copyPix}
                    className="w-full border-white/10 bg-white/5 h-12 rounded-xl text-white hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copia e Cola
                  </Button>
                  
                  <div className="flex items-center gap-4 py-4">
                    <div className="h-px flex-grow bg-white/10" />
                    <span className="text-[10px] text-white/20 uppercase tracking-widest">Simulação de Pagamento</span>
                    <div className="h-px flex-grow bg-white/10" />
                  </div>

                  <Button 
                    disabled={loading}
                    onClick={handleBooking}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-bold"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Pagamento"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
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
                  Sua experiência na The Royal Cut está confirmada. Enviamos os detalhes para seu WhatsApp.
                </p>
                <Button 
                  onClick={close}
                  className="bg-primary text-primary-foreground px-10 h-12 rounded-full font-bold"
                >
                  Concluído
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
