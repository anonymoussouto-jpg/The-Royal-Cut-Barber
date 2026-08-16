import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, User, Scissors, Loader2, Zap, DollarSign, UserCheck, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

export const Route = createFileRoute("/admin/calendar")({
  component: AdminCalendar,
});

function AdminCalendar() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    client_name: '',
    phone: '',
    service_id: '',
    barber_id: ''
  });

  useEffect(() => {
    fetchAppointments();
    fetchBarbersAndServices();

    const channel = supabase
      .channel('calendar-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBarbersAndServices = async () => {
    const [barbersRes, servicesRes] = await Promise.all([
      supabase.from('barbers').select('*'),
      supabase.from('services').select('*')
    ]);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles(full_name),
          barbers(full_name),
          services(name, price, owner_percentage, barber_percentage)
        `)
        .order("start_time", { ascending: false });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Calendar error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalkIn = async () => {
    if (!walkInData.client_name || !walkInData.service_id || !walkInData.barber_id) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      const service = services.find(s => s.id === walkInData.service_id);
      const guestId = uuidv4();
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: guestId,
          full_name: walkInData.client_name,
          phone: walkInData.phone || null,
          is_guest: true
        });
      
      if (profileError) throw profileError;

      const appToInsert: any = {
        client_id: guestId,
        barber_id: walkInData.barber_id,
        service_id: walkInData.service_id,
        start_time: new Date().toISOString(),
        status: 'confirmed',
        total_price: service.price,
        client_name: walkInData.client_name,
        client_phone: walkInData.phone || null
      };

      const { error: appError } = await supabase
        .from('appointments')
        .insert(appToInsert);


      if (appError) throw appError;

      toast.success("Atendimento walk-in registrado!");
      setIsWalkInOpen(false);
      setWalkInData({ client_name: '', phone: '', service_id: '', barber_id: '' });
    } catch (error) {
      console.error("Walk-in error:", error);
      toast.error("Erro ao registrar atendimento");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-primary font-bold uppercase tracking-widest text-xs">Carregando Agenda...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Controle de Agenda Geral</h1>
          <p className="text-muted-foreground">Visualização completa de todos os barbeiros e horários.</p>
        </div>
        
        <Dialog open={isWalkInOpen} onOpenChange={setIsWalkInOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-widest text-xs h-12 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              ⚡ Atendimento Imediato
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif font-black flex items-center gap-2">
                <Zap className="text-primary w-6 h-6" />
                Agendamento Rápido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input 
                  className="bg-zinc-900 border-zinc-800 focus:border-primary" 
                  placeholder="Ex: João Silva"
                  value={walkInData.client_name}
                  onChange={e => setWalkInData({...walkInData, client_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  className="bg-zinc-900 border-zinc-800 focus:border-primary" 
                  placeholder="(00) 00000-0000"
                  value={walkInData.phone}
                  onChange={e => setWalkInData({...walkInData, phone: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select onValueChange={val => setWalkInData({...walkInData, service_id: val})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} - R${s.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Barbeiro *</Label>
                  <Select onValueChange={val => setWalkInData({...walkInData, barber_id: val})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {barbers.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleWalkIn}
                className="w-full bg-primary text-black font-black uppercase tracking-widest"
              >
                Confirmar Atendimento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <div className="aspect-video rounded-3xl border border-dashed border-border/40 flex items-center justify-center bg-card/20">
            <span className="text-muted-foreground italic text-sm">Nenhum agendamento encontrado.</span>
          </div>
        ) : (
          appointments.map((app) => {
            const totalPrice = app.total_price || 0;
            const ownerPerc = app.services?.owner_percentage || 50;
            const barberPerc = app.services?.barber_percentage || 50;
            const ownerVal = (totalPrice * ownerPerc) / 100;
            const barberVal = (totalPrice * barberPerc) / 100;

            return (
              <Card key={app.id} className="border-border/40 bg-card/50 hover:border-primary/50 transition-all group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <CalendarIcon className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-white">{format(new Date(app.start_time), "dd 'de' MMMM", { locale: ptBR })}</h4>
                        <div className="flex items-center gap-2 text-sm text-primary font-bold">
                          <Clock className="w-3 h-3" />
                          {format(new Date(app.start_time), "HH:mm")}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow px-0 lg:px-8 border-l border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-1">
                          <User className="w-3 h-3" /> Cliente
                        </span>
                        <span className="text-sm font-bold text-white">{app.profiles?.full_name || app.client_name || 'Cliente'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-1">
                          <Scissors className="w-3 h-3" /> Serviço
                        </span>
                        <span className="text-sm font-bold text-white">{app.services?.name}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Barbeiro
                        </span>
                        <span className="text-sm font-bold text-primary">{app.barbers?.full_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                          <DollarSign className="w-3 h-3" />
                          Total: <span className="text-white font-serif font-black ml-1">R$ {totalPrice}</span>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">
                            <Shield className="w-2.5 h-2.5" /> R$ {ownerVal.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400">
                            <Scissors className="w-2.5 h-2.5" /> R$ {barberVal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        app.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {app.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
