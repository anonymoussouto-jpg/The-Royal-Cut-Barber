import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = [
    { label: "Faturamento (Hoje)", value: "R$ 1.240,00", icon: Wallet, trend: "+12%" },
    { label: "Agendamentos", value: "24", icon: Calendar, trend: "+5" },
    { label: "Novos Clientes", value: "8", icon: Users, trend: "+2" },
    { label: "Assinantes Ativos", value: "142", icon: TrendingUp, trend: "+3%" },
  ];

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
              <p className="text-xs text-green-500 mt-1 font-medium">{stat.trend} em relação a ontem</p>
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
              Gráfico de agendamentos será exibido aqui.
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50 min-h-[300px]">
          <CardHeader>
            <CardTitle>Faturamento Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic text-center py-20">
              Gráfico de faturamento será exibido aqui.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
