import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, User, Loader2, Key, ShieldCheck, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createBarberUser } from "@/lib/barbers.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/staff")({
  component: StaffManagement,
});

interface Barber {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  auth_user_id?: string | null;
  email?: string | null;
}

function StaffManagement() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    specialties: "",
    email: "",
    password: "",
  });

  const createAccessFn = useServerFn(createBarberUser);
  const [creatingAccess, setCreatingAccess] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase.from("barbers").select("*");
      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error("Error fetching barbers:", error);
      toast.error("Erro ao carregar barbeiros");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        full_name: formData.full_name,
        bio: formData.bio,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
      };

      if (editingBarber) {
        const { error } = await supabase.from("barbers").update(data).eq("id", editingBarber.id);
        if (error) throw error;
        toast.success("Barbeiro atualizado com sucesso");
      } else {
        const { error } = await supabase.from("barbers").insert([data]);
        if (error) throw error;
        toast.success("Barbeiro cadastrado com sucesso");
      }
      setIsDialogOpen(false);
      setEditingBarber(null);
      setFormData({ full_name: "", bio: "", specialties: "", email: "", password: "" });
      fetchBarbers();
    } catch (error) {
      console.error("Error saving barber:", error);
      toast.error("Erro ao salvar barbeiro");
    }
  };

  const handleCreateAccess = async () => {
    if (!editingBarber) return;
    if (!formData.email || !formData.password) {
      toast.error("Preencha email e senha temporária");
      return;
    }

    setCreatingAccess(true);
    try {
      await createAccessFn({
        data: {
          barberId: editingBarber.id,
          email: formData.email,
          password: formData.password
        }
      });
      toast.success("Acesso criado com sucesso!");
      fetchBarbers();
    } catch (error: any) {
      console.error("Error creating barber access:", error);
      toast.error(error.message || "Erro ao criar acesso");
    } finally {
      setCreatingAccess(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este barbeiro?")) return;
    try {
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Barbeiro removido com sucesso");
      fetchBarbers();
    } catch (error) {
      console.error("Error deleting barber:", error);
      toast.error("Erro ao remover barbeiro");
    }
  };

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setFormData({
      full_name: barber.full_name,
      bio: barber.bio || "",
      specialties: barber.specialties?.join(", ") || "",
      email: barber.email || "",
      password: "",
    });
    setIsDialogOpen(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Gestão de Colaboradores</h1>
          <p className="text-muted-foreground">Cadastro e horários dos profissionais.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground" onClick={() => {
              setEditingBarber(null);
              setFormData({ full_name: "", bio: "", specialties: "", email: "", password: "" });
            }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingBarber ? "Editar Barbeiro" : "Novo Barbeiro"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">Especialidades (separadas por vírgula)</Label>
                <Input
                  id="specialties"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Fade, Barboterapia, Tesoura"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / Descrição</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              {editingBarber && (
                <div className="pt-6 border-t border-border space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Acesso ao Sistema</h3>
                  </div>
                  
                  {editingBarber.auth_user_id ? (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-xs font-bold text-green-500 uppercase">Acesso Ativo</p>
                        <p className="text-[10px] text-muted-foreground">{editingBarber.email}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-[10px] uppercase">Email de Login</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@barbearia.com"
                            className="bg-background border-border h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="pass" className="text-[10px] uppercase">Senha Temp.</Label>
                          <Input
                            id="pass"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="******"
                            className="bg-background border-border h-9 text-xs"
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full border-primary/20 hover:bg-primary/5 text-primary h-9 text-xs font-bold"
                        onClick={handleCreateAccess}
                        disabled={creatingAccess}
                      >
                        {creatingAccess ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Key className="w-3 h-3 mr-2" />}
                        Criar Acesso ao Sistema
                      </Button>
                    </>
                  )}
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button type="submit" className="bg-primary text-primary-foreground w-full sm:w-auto">
                  {editingBarber ? "Salvar Perfil" : "Cadastrar Profissional"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <div key={barber.id} className="p-6 rounded-2xl border border-border/40 bg-card/50 relative group transition-all hover:border-primary/20">
            <div className="flex justify-between items-start mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20">
                {barber.avatar_url ? (
                  <img src={barber.avatar_url} alt={barber.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(barber)} className="hover:bg-primary/10">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(barber.id)} className="hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{barber.full_name}</h3>
              <p className="text-xs text-muted-foreground">
                {barber.specialties?.join(", ") || "Barbeiro Especialista"}
              </p>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase py-0.5">
                Ativo
              </Badge>
              {barber.auth_user_id && (
                <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20 text-[10px] font-bold uppercase py-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Acesso Ativo
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
