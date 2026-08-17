import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status,
          paid_at: status === "confirmed" ? new Date().toISOString() : null
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status do pedido atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Confirmado</Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold uppercase tracking-widest text-xs">
          Carregando pedidos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Pedidos da Loja</h1>
        <p className="text-muted-foreground">Gerencie as vendas da Grooming Store.</p>
      </div>

      <div className="grid gap-4">
        {orders?.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <ShoppingBag className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/40">Nenhum pedido realizado ainda.</p>
          </div>
        ) : (
          orders?.map((order) => (
            <Card
              key={order.id}
              className="bg-card/50 border-white/10 overflow-hidden group hover:border-primary/30 transition-all"
            >
              <CardContent className="p-0">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-primary font-bold">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <h3 className="font-bold text-lg">{order.client_name}</h3>
                      <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {order.client_phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow max-w-md bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                      Itens do Pedido
                    </p>
                    <div className="space-y-1">
                      {(order.items as any[]).map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-white/70">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="text-white/50">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Total
                      </p>
                      <p className="text-xl font-bold text-primary">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: order.id, status: "confirmed" })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Pedido
                      </Button>
                    )}
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
