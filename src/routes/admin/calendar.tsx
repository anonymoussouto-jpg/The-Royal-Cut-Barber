import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, User, Scissors, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/calendar")({
  component: AdminCalendar,
});

function AdminCalendar() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles(full_name),
          barbers(full_name),
          services(name)
        `)
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Calendar error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Controle de Agenda Geral</h1>
        <p className="text-muted-foreground">Visualização completa de todos os barbeiros e horários.</p>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <div className="aspect-video rounded-3xl border border-dashed border-border/40 flex items-center justify-center bg-card/20">
            <span className="text-muted-foreground italic text-sm">Nenhum agendamento encontrado.</span>
          </div>
        ) : (
          appointments.map((app) => (
            <Card key={app.id} className="border-border/40 bg-card/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <CalendarIcon className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{format(new Date(app.start_time), "dd 'de' MMMM", { locale: ptBR })}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(app.start_time), "HH:mm")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow px-0 md:px-8">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary/60" />
                      <span className="text-sm font-medium">{app.profiles?.full_name || 'Cliente'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-primary/60" />
                      <span className="text-sm font-medium">{app.services?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">Barbeiro: {app.barbers?.full_name}</span>
                    </div>
                  </div>

                  <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
                    app.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
                  }`}>
                    {app.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
