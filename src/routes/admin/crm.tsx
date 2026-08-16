import { createFileRoute } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Search, Users, Star, Award, Phone, Calendar as CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/admin/crm")({
  component: CRMPage,
});

interface ClientProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  barber_points: number | null;
  created_at: string;
}

interface AppointmentHistory {
  id: string;
  start_time: string;
  total_price: number;
  status: string;
  services: { name: string } | null;
  barbers: { full_name: string | null } | null;
}

function CRMPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [history, setHistory] = useState<AppointmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, barber_points, created_at")
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

  const fetchClientHistory = async (clientId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          total_price,
          status,
          services (name),
          barbers (full_name)
        `)
        .eq("client_id", clientId)
        .order("start_time", { ascending: false })
        .limit(5);

      if (error) throw error;
      setHistory((data as any) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Erro ao carregar histórico do cliente");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddPoints = async () => {
    if (!selectedClient || !pointsToAdd) return;
    
    setIsUpdatingPoints(true);
    try {
      const currentPoints = selectedClient.barber_points || 0;
      const newPoints = currentPoints + parseInt(pointsToAdd);

      const { error } = await supabase
        .from("profiles")
        .update({ barber_points: newPoints })
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast.success(`${pointsToAdd} pontos adicionados com sucesso!`);
      setSelectedClient({ ...selectedClient, barber_points: newPoints });
      setPointsToAdd("");
      fetchClients(); // Refresh list
    } catch (error) {
      console.error("Error updating points:", error);
      toast.error("Erro ao atualizar pontos");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      (client.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || "").includes(searchTerm)
    );
  }, [clients, searchTerm]);

  const stats = useMemo(() => {
    const total = clients.length;
    const vips = clients.filter(c => (c.barber_points || 0) > 500).length;
    const totalPoints = clients.reduce((acc, c) => acc + (c.barber_points || 0), 0);
    return { total, vips, totalPoints };
  }, [clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white">CRM e Gestão de Clientes</h1>
        <p className="text-muted-foreground">Histórico, pontuação e status de fidelidade.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Clientes VIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.vips}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Pontos em Circulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalPoints} <span className="text-xs font-normal text-muted-foreground uppercase">pts</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-card/30 p-4 rounded-xl border border-border/20">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar cliente por nome ou telefone..." 
          className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-muted-foreground/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent bg-white/5">
              <TableHead className="text-white">Cliente</TableHead>
              <TableHead className="text-white">Telefone</TableHead>
              <TableHead className="text-white">Cadastro</TableHead>
              <TableHead className="text-white">Barber Points</TableHead>
              <TableHead className="text-white">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow 
                  key={client.id} 
                  className="border-border/40 hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedClient(client);
                    fetchClientHistory(client.id);
                  }}
                >
                  <TableCell className="font-bold flex items-center gap-3 py-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                      {client.full_name?.charAt(0) || "U"}
                    </div>
                    <span className="text-white">{client.full_name || "Usuário Sem Nome"}</span>
                  </TableCell>
                  <TableCell className="text-white/70">{client.phone || "-"}</TableCell>
                  <TableCell className="text-white/70">{format(new Date(client.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{client.barber_points || 0}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">pts</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      (client.barber_points || 0) > 500 
                        ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" 
                        : "bg-primary/10 text-primary border-primary/20"
                    }>
                      {(client.barber_points || 0) > 500 ? "VIP ROYAL" : "MEMBRO"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent className="bg-[#0A0A0A] border-l border-border/40 w-full sm:max-w-md p-0">
          {selectedClient && (
            <div className="h-full flex flex-col">
              <SheetHeader className="p-6 bg-gradient-to-b from-primary/10 to-transparent border-b border-border/20">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary">
                    {selectedClient.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-serif text-white">{selectedClient.full_name}</SheetTitle>
                    <SheetDescription className="text-primary font-medium flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {selectedClient.barber_points || 0} Barber Points
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-grow p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Telefone</p>
                      <div className="flex items-center gap-2 text-white/90">
                        <Phone className="w-3 h-3 text-primary" />
                        {selectedClient.phone || "Não informado"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente desde</p>
                      <div className="flex items-center gap-2 text-white/90">
                        <CalendarIcon className="w-3 h-3 text-primary" />
                        {format(new Date(selectedClient.created_at), "dd/MM/yyyy")}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/20" />

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      Gestão de Pontos
                    </h3>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Qtd de pontos..." 
                        className="bg-white/5 border-border/40 text-white"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                      />
                      <Button 
                        onClick={handleAddPoints} 
                        disabled={isUpdatingPoints || !pointsToAdd}
                        className="bg-primary hover:bg-primary/80 text-black font-bold"
                      >
                        {isUpdatingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-border/20" />

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                      Últimos Agendamentos
                    </h3>
                    
                    {loadingHistory ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum agendamento encontrado.</p>
                    ) : (
                      <div className="space-y-3">
                        {history.map((app) => (
                          <div key={app.id} className="p-3 rounded-lg bg-white/5 border border-border/20 space-y-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-white">{app.services?.name || "Serviço"}</p>
                              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                R$ {Number(app.total_price).toFixed(2)}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs text-white/60">
                              <span>Barbeiro: {app.barbers?.full_name || "N/A"}</span>
                              <span>{format(new Date(app.start_time), "dd/MM/yy HH:mm")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="p-6 mt-auto border-t border-border/20 bg-black/40">
                <Button 
                  variant="outline" 
                  className="w-full border-primary/20 text-primary hover:bg-primary/10"
                  onClick={() => setSelectedClient(null)}
                >
                  Fechar Ficha
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
