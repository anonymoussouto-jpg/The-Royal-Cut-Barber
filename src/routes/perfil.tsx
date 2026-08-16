import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Calendar as CalendarIcon, ShoppingBag, LogOut, Edit3, Loader2, Award, ChevronRight } from "lucide-react";
import { useBooking } from "@/hooks/use-booking";

export const Route = createFileRoute("/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const [profileRes, appRes, orderRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("appointments").select("*, services(name), barbers(full_name)").eq("client_id", user.id).order("start_time", { ascending: false }).limit(10),
      supabase.from("orders").select("*").eq("client_id", user.id).order("created_at", { ascending: false })
    ]);

    setProfile(profileRes.data);
    setEditName(profileRes.data?.full_name || "");
    setEditPhone(profileRes.data?.phone || "");
    setAppointments(appRes.data || []);
    setOrders(orderRes.data || []);
    setLoading(false);
  }

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName, phone: editPhone })
        .eq("id", profile.id);

      if (error) throw error;
      
      toast.success("Perfil atualizado com sucesso!");
      setIsEditDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPointsLevel = (points: number) => {
    if (points > 500) return { label: "Ouro", color: "text-yellow-500", progress: 100 };
    if (points > 200) return { label: "Prata", color: "text-gray-400", progress: (points / 500) * 100 };
    return { label: "Bronze", color: "text-amber-700", progress: (points / 200) * 100 };
  };

  const level = getPointsLevel(profile?.barber_points || 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-4xl py-20 px-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <Card className="flex-1 bg-zinc-900/50 border-white/10 p-6 rounded-3xl w-full">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold">{profile?.full_name}</h2>
              <p className="text-white/50">{profile?.phone}</p>
            </div>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-primary hover:bg-primary/10">
                <Edit3 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-white/10">Cancelar</Button>
                <Button onClick={handleUpdateProfile} disabled={isUpdating} className="bg-primary text-black hover:bg-primary/90">
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>

        <Card className="flex-1 bg-zinc-900/50 border-white/10 p-6 rounded-3xl w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2"><Award className="text-primary w-5 h-5" /> Barber Points</h3>
            <span className={`font-black ${level.color}`}>{level.label}</span>
          </div>
          <div className="text-4xl font-black text-primary mb-2">{profile?.barber_points || 0} pts</div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${level.progress}%` }} />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-white/5 rounded-xl p-1">
          <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black">Meus Agendamentos</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black">Minhas Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4 pt-6">
          {appointments.length === 0 ? (
            <p className="text-center py-10 text-white/30 italic">Nenhum agendamento encontrado.</p>
          ) : (
            appointments.map((app) => (
              <div key={app.id} className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold">{app.services?.name}</p>
                  <p className="text-xs text-white/50">{format(new Date(app.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR })} • {app.barbers?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <p className="text-xs font-bold text-primary">R$ {Number(app.total_price).toFixed(2)}</p>
                    <p className="text-[9px] uppercase text-white/40">{app.payment_status || 'pendente'}</p>
                  </div>
                  <Button onClick={() => booking.open(app.services?.id)} size="sm" variant="outline" className="border-white/10 hover:bg-primary hover:text-black">Reagendar</Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 pt-6">
          {orders.length === 0 ? (
            <p className="text-center py-10 text-white/30 italic">Nenhum pedido encontrado.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-white/50">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">R$ {Number(order.total_amount).toFixed(2)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">{order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Button onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/" }))} variant="destructive" className="w-full rounded-xl">
        <LogOut className="w-4 h-4 mr-2" /> Sair
      </Button>
    </div>
  );
}
