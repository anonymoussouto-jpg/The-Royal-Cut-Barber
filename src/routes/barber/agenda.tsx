import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  Circle,
  Filter,
  Search,
  Loader2,
  Zap,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

export const Route = createFileRoute("/barber/agenda")({
  component: BarberAgenda,
});

type FilterType = 'today' | 'week' | 'month' | 'all';

function BarberAgenda() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('today');
  const [barber, setBarber] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    client_name: '',
    phone: '',
    service_id: ''
  });

  useEffect(() => {
    fetchBarberAndInitialData();
  }, []);

  useEffect(() => {
    if (barber) {
      fetchAppointments();
    }
  }, [filter, barber]);

  useEffect(() => {
    const channel = supabase
      .channel('barber-agenda-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        if (barber) fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barber]);

  const fetchBarberAndInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: barberData } = await supabase
        .from('barbers')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single();

      if (!barberData) {
        toast.error("Vínculo de barbeiro não encontrado");
        return;
      }
      setBarber(barberData);

      const { data: servicesData } = await supabase.from('services').select('*');
      if (servicesData) setServices(servicesData);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchAppointments = async () => {
    if (!barber) return;
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          service:services(name, price, barber_percentage, owner_percentage),
          client:profiles(full_name, phone)
        `)
        .eq('barber_id', barber.id)
        .order('start_time', { ascending: false });

      const now = new Date();
      if (filter === 'today') {
        query = query
          .gte('start_time', startOfDay(now).toISOString())
          .lte('start_time', endOfDay(now).toISOString());
      } else if (filter === 'week') {
        query = query
          .gte('start_time', startOfWeek(now, { weekStartsOn: 1 }).toISOString())
          .lte('start_time', endOfWeek(now, { weekStartsOn: 1 }).toISOString());
      } else if (filter === 'month') {
        query = query
          .gte('start_time', startOfMonth(now).toISOString())
          .lte('start_time', endOfMonth(now).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching agenda:", error);
      toast.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  };

  const handleWalkIn = async () => {
    if (!walkInData.client_name || !walkInData.service_id || !barber) {
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
            barber_id: barber.id,
            service_id: walkInData.service_id,
            start_time: new Date().toISOString(),
            status: 'confirmed',
            payment_status: 'pending',
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
      setWalkInData({ client_name: '', phone: '', service_id: '' });
      fetchAppointments();
    } catch (error) {
      console.error("Walk-in error:", error);
      toast.error("Erro ao registrar atendimento");
    }
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'confirmed' && paymentStatus === 'PAID') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-black tracking-widest px-2 py-0.5">PAGO</Badge>;
    }
    if (paymentStatus === 'pending') {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] font-black tracking-widest px-2 py-0.5">PENDENTE</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-black tracking-widest px-2 py-0.5">CONFIRMADO</Badge>;
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Minha Agenda</h1>
          <p className="text-white/40 text-sm">Gerencie seus atendimentos e comissões.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            {(['today', 'week', 'month', 'all'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 text-[10px] font-black uppercase tracking-widest h-9 ${
                  filter === f ? 'bg-primary text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Tudo'}
              </Button>
            ))}
          </div>

          <Dialog open={isWalkInOpen} onOpenChange={setIsWalkInOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-[10px] h-11 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10">
                <Zap className="w-3.5 h-3.5" />
                ⚡ Atendimento Imediato
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif font-black flex items-center gap-2">
                  <Zap className="text-primary w-6 h-6" />
                  Novo Walk-in
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nome do Cliente *</Label>
                  <Input 
                    className="bg-zinc-900 border-zinc-800 focus:border-primary rounded-xl" 
                    placeholder="Ex: João Silva"
                    value={walkInData.client_name}
                    onChange={e => setWalkInData({...walkInData, client_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Telefone</Label>
                  <Input 
                    className="bg-zinc-900 border-zinc-800 focus:border-primary rounded-xl" 
                    placeholder="(00) 00000-0000"
                    value={walkInData.phone}
                    onChange={e => setWalkInData({...walkInData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Serviço *</Label>
                  <Select onValueChange={val => setWalkInData({...walkInData, service_id: val})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} - R${s.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleWalkIn}
                  className="w-full bg-primary text-black font-black uppercase tracking-widest h-12 rounded-xl"
                >
                  Registrar Agora
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizando agenda...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
          <CalendarIcon className="w-12 h-12 text-white/5 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white/60">Nenhum agendamento</h3>
          <p className="text-white/20 text-xs">Você não possui atendimentos para este período.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((app) => {
            const totalPrice = app.total_price || 0;
            const barberPerc = app.service?.barber_percentage || 50;
            const barberCommission = (totalPrice * barberPerc) / 100;

            return (
              <div 
                key={app.id} 
                className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 hover:bg-zinc-900/60 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[70px] flex flex-col items-center justify-center border-r border-white/5 pr-6">
                    <p className="text-2xl font-black font-serif text-primary leading-none tracking-tighter">
                      {format(new Date(app.start_time), 'HH:mm')}
                    </p>
                    <p className="text-[9px] text-white/40 font-black uppercase mt-1 tracking-widest">
                      {format(new Date(app.start_time), 'dd MMM', { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary/60" />
                      </div>
                      <p className="font-black text-white text-sm">{app.client_name || app.client?.full_name || 'Cliente'}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <Scissors className="w-3 h-3 text-white/20" />
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wide">{app.service?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 border-l border-white/5 pl-0 md:pl-6">
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">
                      <DollarSign className="w-3 h-3" /> Total: <span className="text-white/60 ml-1">R$ {totalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 px-3 py-1.5 rounded-xl">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-green-500 font-serif font-black text-sm">R$ {barberCommission.toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-green-500/40 uppercase font-black tracking-widest mr-1">Minha Comissão</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    {getStatusBadge(app.status, app.payment_status || 'pending')}
                    <Button variant="outline" size="sm" className="bg-transparent border-white/5 hover:bg-primary hover:text-black hover:border-primary transition-all rounded-xl h-8 px-4 text-[9px] font-black uppercase tracking-widest">
                      Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
