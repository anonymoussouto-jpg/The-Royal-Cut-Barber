import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, Wallet, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, startOfMonth } from "date-fns";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState([
    { label: "Faturamento (Hoje)", value: "R$ 0,00", icon: Wallet, trend: "0%", key: 'revenue' },
    { label: "Agendamentos", value: "0", icon: Calendar, trend: "0", key: 'appointments' },
    { label: "Novos Clientes", value: "0", icon: Users, trend: "0", key: 'clients' },
    { label: "Faturamento (Mês)", value: "R$ 0,00", icon: TrendingUp, trend: "0%", key: 'monthly' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = startOfDay(new Date()).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();

      // Fetch today's appointments and revenue
      const { data: todayApps } = await supabase
        .from('appointments')
        .select('total_price')
        .gte('start_time', today);

      // Fetch monthly revenue
      const { data: monthApps } = await supabase
        .from('appointments')
        .select('total_price')
        .gte('start_time', monthStart);

      // Fetch total clients
      const { count: clientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const todayRevenue = todayApps?.reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;
      const monthRevenue = monthApps?.reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;

      setStats([
        { label: "Faturamento (Hoje)", value: `R$ ${todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, trend: "+0%", key: 'revenue' },
        { label: "Agendamentos", value: String(todayApps?.length || 0), icon: Calendar, trend: "+0", key: 'appointments' },
        { label: "Novos Clientes", value: String(clientCount || 0), icon: Users, trend: "+0", key: 'clients' },
        { label: "Faturamento (Mês)", value: `R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, trend: "+0%", key: 'monthly' },
      ]);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Painel de Resultados</h1>
        <p className="text-muted-foreground">Bem-vindo de volta, aqui está o resumo de hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-500 mt-1 font-medium">{stat.trend} em relação ao período anterior</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border/40 bg-card/50 min-h-[300px]">
          <CardHeader>
            <CardTitle>Agendamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic text-center py-20">
              Dados reais sendo sincronizados do banco de dados.
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50 min-h-[300px]">
          <CardHeader>
            <CardTitle>Faturamento Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic text-center py-20">
              Gráfico de faturamento em processamento.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
