import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Search, 
  History, 
  Calendar, 
  Phone, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/clientes")({
  component: BarberClients,
});

function BarberClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [barber, setBarber] = useState<any>(null);

  useEffect(() => {
    fetchBarberAndClients();
  }, []);

  const fetchBarberAndClients = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: barberData } = await supabase
        .from('barbers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!barberData) return;
      setBarber(barberData);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          client_id,
          client_name,
          client_phone,
          client:profiles(*)
        `)
        .eq('barber_id', barberData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by client_id to get unique list
      const uniqueClients = Array.from(new Map(data.map(item => [
        item.client_id || item.client_phone, 
        {
          id: item.client_id,
          name: item.client_name || item.client?.full_name || 'Cliente',
          phone: item.client_phone || item.client?.phone,
          profile: item.client
        }
      ])).values());

      setClients(uniqueClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientHistory = async (clientId: string, clientPhone: string) => {
    if (!barber) return;
    setLoadingHistory(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          service:services(name, price)
        `)
        .eq('barber_id', barber.id)
        .order('start_time', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('client_phone', clientPhone);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClientHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Meus Clientes</h1>
        <p className="text-white/40">Histórico de cavalheiros atendidos por você.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <Input 
          placeholder="Buscar por nome ou telefone..." 
          className="bg-white/5 border-white/10 pl-12 h-12 rounded-xl focus:border-primary transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Sheet key={client.id || client.phone}>
              <SheetTrigger asChild>
                <button 
                  onClick={() => fetchClientHistory(client.id, client.phone)}
                  className="bg-card/50 border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{client.name}</p>
                      <p className="text-xs text-white/40">{client.phone || 'Sem telefone'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary transition-colors" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0A0A0A] border-l-white/5 w-full sm:max-w-md p-0 overflow-y-auto">
                <SheetHeader className="p-8 border-b border-white/5 bg-white/5">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <SheetTitle className="text-2xl font-serif font-bold text-center text-white">{client.name}</SheetTitle>
                  <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                    <Phone className="w-3 h-3" />
                    <span>{client.phone}</span>
                  </div>
                </SheetHeader>

                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                    <History className="w-4 h-4" />
                    Histórico de Atendimentos
                  </div>

                  {loadingHistory ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : clientHistory.length === 0 ? (
                    <p className="text-center text-white/20 text-sm py-10">Nenhum atendimento registrado.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientHistory.map((app) => (
                        <div key={app.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-sm">{app.service?.name}</p>
                            <span className="text-primary font-serif font-black text-sm">R$ {app.total_price}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-white/40 uppercase font-bold tracking-wider">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(app.start_time), "dd/MM/yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(app.start_time), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      )}
    </div>
  );
}
