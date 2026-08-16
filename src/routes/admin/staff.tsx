import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/staff")({
  component: StaffManagement,
});

interface Barber {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
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
  });

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
      setFormData({ full_name: "", bio: "", specialties: "" });
      fetchBarbers();
    } catch (error) {
      console.error("Error saving barber:", error);
      toast.error("Erro ao salvar barbeiro");
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
              setFormData({ full_name: "", bio: "", specialties: "" });
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
              <DialogFooter>
                <Button type="submit" className="bg-primary text-primary-foreground">
                  {editingBarber ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <div key={barber.id} className="p-6 rounded-2xl border border-border/40 bg-card/50 relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(barber)}>
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(barber.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <h3 className="font-bold text-lg">{barber.full_name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {barber.specialties?.join(", ") || "Barbeiro Master"}
            </p>
            <div className="text-xs py-1 px-3 rounded-full bg-primary/10 text-primary w-fit font-bold">Ativo</div>
          </div>
        ))}
      </div>
    </div>
  );
}
