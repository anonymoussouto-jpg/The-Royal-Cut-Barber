import { Tables } from "@/integrations/supabase/types";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, Wallet, Loader2, CalendarRange, Star } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfDay,
  startOfMonth,
  endOfDay,
  subDays,
  eachDayOfInterval,
  isSameDay,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<any[]>([
    { label: "Faturamento (Hoje)", value: "R$ 0,00", icon: Wallet, trend: "0%", key: "revenue" },
    { label: "Agendamentos", value: "0", icon: Calendar, trend: "0", key: "appointments" },
    { label: "Novos Clientes", value: "0", icon: Users, trend: "0", key: "clients" },
    { label: "Faturamento (Mês)", value: "R$ 0,00", icon: TrendingUp, trend: "0%", key: "monthly" },
  ]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [chartData, setChartData] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [barberRanking, setBarberRanking] = useState<any[]>([]);
  const [bestBarber, setBestBarber] = useState<any>(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const months = [
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const date = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
      const monthStart = startOfMonth(date).toISOString();
      const monthEnd = endOfDay(
        new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0),
      ).toISOString();
      
      // Dados do mês anterior
      const prevMonthStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toISOString();
      const prevMonthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0, 23, 59, 59).toISOString();

      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // Fetch monthly appointments with details for advanced reports
      const [monthlyRes, prevMonthlyRes] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            `
            total_price, 
            status, 
            barber_id, 
            start_time,
            services(name),
            barbers(full_name, avatar_url)
          `,
          )
          .gte("start_time", monthStart)
          .lte("start_time", monthEnd),
        supabase
          .from("appointments")
          .select("total_price, status")
          .gte("start_time", prevMonthStart)
          .lte("start_time", prevMonthEnd)
      ]);

      const monthAppsDetailed = monthlyRes.data;
      const prevAppointments = prevMonthlyRes.data;

      const monthRevenue =
        monthAppsDetailed
          ?.filter((a) => a.status === "completed" || a.status === "confirmed")
          .reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;

      // Calculate Top 5 Services
      const serviceCounts: Record<string, number> = {};
      monthAppsDetailed?.forEach((app) => {
        const name = app.services?.name || "Outro";
        serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      });
      const top5Services = Object.entries(serviceCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopServices(top5Services);

      // Calculate Barber Ranking
      const barberStats: Record<string, any> = {};
      monthAppsDetailed?.forEach((app) => {
        const id = app.barber_id;
        if (!barberStats[id]) {
          barberStats[id] = {
            name: app.barbers?.full_name || "Desconhecido",
            count: 0,
            avatar: app.barbers?.avatar_url,
          };
        }
        barberStats[id].count += 1;
      });
      const ranking = Object.values(barberStats).sort((a, b) => b.count - a.count);
      setBarberRanking(ranking);
      setBestBarber(ranking[0] || null);

      // Fetch today's summary
      const { data: todayApps } = await supabase
        .from("appointments")
        .select("total_price, status")
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd);

      const confirmedToday =
        todayApps?.filter((a) => a.status === "confirmed" || a.status === "completed").length || 0;
      const pendingToday = todayApps?.filter((a) => a.status === "pending").length || 0;
      const todayRevenue =
        todayApps
          ?.filter((a) => a.status === "completed" || a.status === "confirmed")
          .reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0;

      // Fetch total clients
      const { count: clientCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch last 7 days for charts
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const { data: weeklyApps } = await supabase
        .from("appointments")
        .select("total_price, start_time, status")
        .gte("start_time", subDays(startOfDay(new Date()), 6).toISOString())
        .lte("start_time", todayEnd);

      const chartDataGenerated = last7Days.map((day) => {
        const dayApps = weeklyApps?.filter((a) => isSameDay(new Date(a.start_time), day)) || [];
        const revenue = dayApps
          .filter((a) => a.status === "completed" || a.status === "confirmed")
          .reduce((acc, curr) => acc + Number(curr.total_price), 0);

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          revenue: revenue,
          count: dayApps.length,
          fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        };
      });

      setChartData(chartDataGenerated);

      const currentRevenue = monthAppsDetailed
        ?.filter(a => a.status === 'completed' || a.status === 'confirmed')
        .reduce((sum, a) => sum + (Number(a.total_price) || 0), 0) || 0;

      const prevRevenue = prevAppointments
        ?.filter(a => a.status === 'completed' || a.status === 'confirmed')
        .reduce((sum, a) => sum + (Number(a.total_price) || 0), 0) || 0;

      const revenueTrend = prevRevenue === 0
        ? (currentRevenue > 0 ? "+100%" : "0%")
        : `${currentRevenue >= prevRevenue ? "+" : ""}${Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)}%`;

      setStats([
        {
          label: "Faturamento (Hoje)",
          value: `R$ ${todayRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          icon: Wallet,
          trend: "+0%",
          key: "revenue",
        },
        {
          label: "Agendamentos",
          value: String(confirmedToday),
          secondaryValue: pendingToday > 0 ? String(pendingToday) : undefined,
          icon: Calendar,
          trend: "+0",
          key: "appointments",
        },
        {
          label: "Novos Clientes",
          value: String(clientCount || 0),
          icon: Users,
          trend: "+0",
          key: "clients",
        },
        {
          label: "Faturamento (Mês)",
          value: `R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          icon: TrendingUp,
          trend: revenueTrend,
          key: "monthly",
        },
      ]);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Painel de Resultados</h1>
          <p className="text-muted-foreground">Bem-vindo de volta, aqui está o resumo de hoje.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] bg-card border-border/40">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] bg-card border-border/40">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat: any, i) => (
          <Card key={i} className="border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.secondaryValue && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] px-1.5 py-0"
                  >
                {stat.secondaryValue} pendentes
              </Badge>
            )}
          </div>
          <p className={`text-xs mt-1 font-medium ${stat.key === 'monthly' ? (stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500') : 'text-green-500'}`}>
            {stat.trend} em relação ao período anterior
          </p>
        </CardContent>
      </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-border/40 bg-card/50 min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-primary" />
                Agendamentos (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Agendamentos"
                    stroke="#e5e7eb"
                    strokeWidth={2}
                    dot={{ fill: "#e5e7eb", r: 4 }}
                    activeDot={{ r: 6, fill: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50 min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Faturamento (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#ffffff40"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`R$ ${value}`, "Faturamento"]}
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#D4AF37" }}
                  />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Highlight of the Month Card */}
        <div className="space-y-8">
          {bestBarber && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Star className="w-8 h-8 text-primary fill-primary animate-pulse" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-primary font-serif font-black tracking-widest uppercase text-xs">
                  ⭐ Barbeiro do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6 text-center">
                <div className="w-24 h-24 rounded-full border-4 border-primary p-1 mb-4">
                  <img
                    src={
                      bestBarber.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${bestBarber.name}`
                    }
                    alt={bestBarber.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-serif font-bold text-white mb-1">{bestBarber.name}</h3>
                <p className="text-primary font-bold text-sm mb-4">
                  {bestBarber.count} Atendimentos
                </p>
                <Badge className="bg-primary text-black font-black uppercase tracking-tighter">
                  Destaque de {months[parseInt(selectedMonth)]?.label || ""}
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/60">
                Top Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topServices.map((service, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-black italic w-4">{i + 1}</span>
                    <span className="text-sm text-white font-medium">{service["name"]}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-white/10">
                    {service["count"]}x
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Performance horizontal ranking */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Ranking Motivacional da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barberRanking} layout="vertical" margin={{ left: 40, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#ffffff40"
                fontSize={12}
                width={100}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#ffffff05" }}
                contentStyle={{
                  backgroundColor: "#111",
                  border: "1px solid #ffffff20",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#D4AF37" }}
              />
              <Bar
                dataKey="count"
                name="Atendimentos"
                fill="#D4AF37"
                radius={[0, 4, 4, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
