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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/agenda")({
  component: BarberAgenda,
});

type FilterType = 'today' | 'week' | 'month' | 'all';

function BarberAgenda() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('today');
  const [barber, setBarber] = useState<any>(null);

  useEffect(() => {
    fetchBarberAndAppointments();
  }, [filter]);

  const fetchBarberAndAppointments = async () => {
    setLoading(true);
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

      let query = supabase
        .from('appointments')
        .select(`
          *,
          service:services(name, price),
          client:profiles(full_name, phone)
        `)
        .eq('barber_id', barberData.id)
        .order('start_time', { ascending: true });

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

  const getStatusBadge = (status: string, paymentMethod: string) => {
    if (status === 'confirmed') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">PAGO</Badge>;
    }
    if (paymentMethod === 'IN_PERSON') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">PRESENCIAL</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">PENDENTE</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Minha Agenda</h1>
          <p className="text-white/40">Gerencie seus atendimentos e horários.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {(['today', 'week', 'month', 'all'] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 text-xs font-bold uppercase tracking-wider ${
                filter === f ? 'bg-primary text-primary-foreground' : 'text-white/40 hover:text-white'
              }`}
            >
              {f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Tudo'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Sincronizando agenda...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <CalendarIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Nenhum agendamento</h3>
          <p className="text-white/40 text-sm">Você não possui atendimentos para este período.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((app) => (
            <div 
              key={app.id} 
              className="bg-card/50 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="text-center min-w-[60px]">
                  <p className="text-2xl font-black font-serif text-primary leading-none">
                    {format(new Date(app.start_time), 'HH:mm')}
                  </p>
                  <p className="text-[10px] text-white/40 font-bold uppercase mt-1">
                    {format(new Date(app.start_time), 'dd MMM', { locale: ptBR })}
                  </p>
                </div>
                
                <div className="w-[1px] h-10 bg-white/5 hidden md:block" />
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-primary/60" />
                    <p className="font-bold">{app.client_name || app.client?.full_name || 'Cliente'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3 h-3 text-white/20" />
                    <p className="text-xs text-white/40">{app.service?.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold">R$ {app.total_price}</p>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Valor Total</p>
                </div>
                {getStatusBadge(app.status, app.payment_method)}
                <Button variant="outline" size="sm" className="border-white/5 hover:bg-primary hover:text-black hover:border-primary transition-all rounded-lg h-9">
                  Detalhes
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
