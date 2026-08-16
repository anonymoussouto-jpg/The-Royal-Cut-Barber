import { createFileRoute } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/crm")({
  component: CRMPage,
});

interface ClientProfile {
  id: string;
  full_name: string | null;
  barber_points: number | null;
  created_at: string;
}

function CRMPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar lista de clientes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">CRM e Gestão de Clientes</h1>
        <p className="text-muted-foreground">Histórico, pontuação e status de fidelidade.</p>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Barber Points</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} className="border-border/40 hover:bg-primary/5">
                  <TableCell className="font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    {client.full_name || "Usuário Sem Nome"}
                  </TableCell>
                  <TableCell>{format(new Date(client.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{client.barber_points || 0} pts</TableCell>
                  <TableCell>
                    <Badge variant={(client.barber_points || 0) > 500 ? "default" : "outline"}>
                      {(client.barber_points || 0) > 500 ? "VIP" : "Basic"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
