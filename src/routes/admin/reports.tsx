import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Users, Calendar, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    totals: { appointments: 0, revenue: 0, ownerRevenue: 0, barberRevenue: 0 },
    barberRanking: [],
    popularServices: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const monthStart = startOfMonth(new Date()).toISOString();
    const monthEnd = endOfMonth(new Date()).toISOString();

    const { data: apps } = await supabase
      .from('appointments')
      .select(`
        *,
        services(name, owner_percentage, barber_percentage),
        barbers(full_name, avatar_url)
      `)
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd)
      .eq('status', 'completed');

    if (apps) {
      const totals = apps.reduce((acc, app) => {
        const price = Number(app.total_price || 0);
        const ownerP = app.services?.owner_percentage || 50;
        const barberP = app.services?.barber_percentage || 50;
        return {
          appointments: acc.appointments + 1,
          revenue: acc.revenue + price,
          ownerRevenue: acc.ownerRevenue + (price * ownerP / 100),
          barberRevenue: acc.barberRevenue + (price * barberP / 100)
        };
      }, { appointments: 0, revenue: 0, ownerRevenue: 0, barberRevenue: 0 });

      const barberMap = new Map();
      apps.forEach(app => {
        const bId = app.barber_id;
        const barber = app.barbers;
        if (!barberMap.has(bId)) {
          barberMap.set(bId, { name: barber?.full_name, avatar: barber?.avatar_url, count: 0, revenue: 0, barberRevenue: 0 });
        }
        const stats = barberMap.get(bId);
        stats.count += 1;
        stats.revenue += Number(app.total_price);
        stats.barberRevenue += (Number(app.total_price) * (app.services?.barber_percentage || 50) / 100);
      });

      const serviceMap = new Map();
      apps.forEach(app => {
        const sName = app.services?.name || 'Outro';
        if (!serviceMap.has(sName)) {
          serviceMap.set(sName, { name: sName, count: 0, revenue: 0 });
        }
        const stats = serviceMap.get(sName);
        stats.count += 1;
        stats.revenue += Number(app.total_price);
      });

      setData({
        totals,
        barberRanking: Array.from(barberMap.values()).sort((a, b) => b.count - a.count),
        popularServices: Array.from(serviceMap.values()).sort((a, b) => b.count - a.count)
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif font-bold">Relatórios Avançados</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Agendamentos", value: data.totals.appointments, icon: Calendar },
          { label: "Faturamento Bruto", value: `R$ ${data.totals.revenue.toFixed(2)}`, icon: Wallet },
          { label: "Receita do Dono", value: `R$ ${data.totals.ownerRevenue.toFixed(2)}`, icon: TrendingUp },
          { label: "Receita Colaboradores", value: `R$ ${data.totals.barberRevenue.toFixed(2)}`, icon: Users },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</CardTitle>
              <stat.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-xl font-bold">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card/50 border-border/40">
          <CardHeader><CardTitle>Ranking de Barbeiros</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Barbeiro</TableHead>
                  <TableHead>Atendimentos</TableHead>
                  <TableHead>Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.barberRanking.map((b: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{i + 1}º - {b.name}</TableCell>
                    <TableCell>{b.count}</TableCell>
                    <TableCell>R$ {b.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/40">
          <CardHeader><CardTitle>Serviços Mais Populares</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Serviço</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.popularServices.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{i + 1}º - {s.name}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>R$ {s.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
