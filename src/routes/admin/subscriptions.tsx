import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Crown, 
  Calendar as CalendarIcon,
  User as UserIcon,
  TrendingUp,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
});

function AdminSubscriptions() {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles:client_id (
            full_name,
            email
          )
        `)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-3 py-1">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1 px-3 py-1">
            <XCircle className="w-3 h-3" /> Cancelado
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 gap-1 px-3 py-1">
            <Clock className="w-3 h-3" /> Expirado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'Irmandade Plena':
        return <Badge className="bg-primary text-black font-bold">Irmandade Plena</Badge>;
      case 'Aliança Royal':
        return <Badge className="bg-white/10 text-white border-white/20 font-bold">Aliança Royal</Badge>;
      case 'Membro Fiel':
        return <Badge variant="secondary">Membro Fiel</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold uppercase tracking-widest text-xs">Carregando assinaturas...</p>
      </div>
    );
  }

  // KPIs
  const totalRevenue = subscriptions?.reduce((acc, sub) => acc + Number(sub.price_paid), 0) || 0;
  const activeSubs = subscriptions?.filter(sub => sub.status === 'active').length || 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Assinaturas do Clube</h1>
          <p className="text-muted-foreground text-sm">Gerencie os membros da irmandade e planos ativos.</p>
        </div>
        
        <div className="flex gap-4">
          <Card className="bg-primary/5 border-primary/20 min-w-[200px]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Faturamento Clube</p>
                <p className="text-xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 min-w-[200px]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Membros Ativos</p>
                <p className="text-xl font-bold">{activeSubs}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-[300px]">Membro</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-white/20">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions?.map((sub) => (
                  <TableRow key={sub.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <UserIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{(sub.profiles as any)?.full_name || 'Usuário Royal'}</p>
                          <p className="text-[10px] text-white/40">{(sub.profiles as any)?.email || '---'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(sub.plan_name)}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-sm text-white/60">
                      {format(new Date(sub.started_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm text-white/60">
                      {format(new Date(sub.expires_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      R$ {Number(sub.price_paid).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
