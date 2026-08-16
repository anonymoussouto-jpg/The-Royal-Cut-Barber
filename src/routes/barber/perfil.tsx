import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, ShieldCheck, Loader2, Camera, Edit3, Save, X, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/perfil")({
  component: BarberProfile,
});

function BarberProfile() {
  const [user, setUser] = useState<any>(null);
  const [barber, setBarber] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    specialties: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('barbers')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();
        setBarber(data);
        if (data) {
          setFormData({
            full_name: data.full_name || "",
            bio: data.bio || "",
            specialties: data.specialties ? (Array.isArray(data.specialties) ? data.specialties.join(", ") : data.specialties) : "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barber) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barber.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('barbers')
        .update({ avatar_url: publicUrl })
        .eq('id', barber.id);

      if (updateError) throw updateError;

      setBarber({ ...barber, avatar_url: publicUrl });
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!barber) return;
    setSaving(true);
    try {
      const specialtiesArray = formData.specialties
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('barbers')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          specialties: specialtiesArray
        })
        .eq('id', barber.id);

      if (error) throw error;

      setBarber({
        ...barber,
        full_name: formData.full_name,
        bio: formData.bio,
        specialties: specialtiesArray
      });
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setShowPasswordDialog(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast.success("Senha atualizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Meu Perfil</h1>
          <p className="text-white/40">Suas informações profissionais e de acesso.</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl"
          >
            <Edit3 className="w-4 h-4 mr-2 text-primary" /> Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsEditing(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 space-y-8 shadow-xl shadow-black/40">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 pb-8 border-b border-white/5">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-3xl bg-primary/5 flex items-center justify-center overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-all duration-300 shadow-lg">
              {barber?.avatar_url ? (
                <img src={barber.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <User className="w-12 h-12 text-primary/40" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Camera className="w-6 h-6 text-white" />}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
          
          <div className="text-center md:text-left space-y-2">
            <div>
              <h2 className="text-3xl font-bold font-serif text-white tracking-tight">
                {isEditing ? (
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-white/5 border-white/10 text-2xl h-12 px-4 focus:border-primary"
                  />
                ) : (
                  barber?.full_name || 'Profissional'
                )}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Colaborador Verificado</span>
              </div>
            </div>
            
            {!isEditing && barber?.bio && (
              <p className="text-sm text-white/50 italic max-w-md">"{barber.bio}"</p>
            )}
          </div>
        </div>

        <div className="grid gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-white/30 uppercase text-[10px] font-black tracking-[0.3em]">Email de Acesso</Label>
              <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl p-4 text-white/40">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.email || ''}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-white/30 uppercase text-[10px] font-black tracking-[0.3em]">Especialidades</Label>
              {isEditing ? (
                <Input 
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Ex: Fade, Barboterapia, Navalha (separe por vírgula)"
                  className="bg-white/5 border-white/10 h-14 rounded-2xl focus:border-primary"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {barber?.specialties && Array.isArray(barber.specialties) && barber.specialties.length > 0 ? (
                    barber.specialties.map((s: string) => (
                      <span key={s} className="bg-primary/5 text-primary border border-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-white/20 text-xs italic">Nenhuma especialidade definida</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white/30 uppercase text-[10px] font-black tracking-[0.3em]">Biografia / Frase de Impacto</Label>
            {isEditing ? (
              <Textarea 
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Conte um pouco sobre sua trajetória..."
                className="bg-white/5 border-white/10 min-h-[120px] rounded-2xl focus:border-primary resize-none"
              />
            ) : (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white/60 min-h-[60px]">
                {barber?.bio || 'Nenhuma biografia cadastrada.'}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Segurança da Conta</h4>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Mantenha suas credenciais sempre atualizadas</p>
            </div>
            <Button 
              onClick={() => setShowPasswordDialog(true)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-6"
            >
              <Lock className="w-4 h-4 mr-2 text-primary" /> Alterar Minha Senha
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-black flex items-center gap-2">
              <Lock className="text-primary w-6 h-6" />
              Nova Senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nova Senha</Label>
              <Input 
                type="password"
                className="bg-white/5 border-white/10 focus:border-primary rounded-xl h-12" 
                placeholder="Mínimo 6 caracteres"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Confirmar Nova Senha</Label>
              <Input 
                type="password"
                className="bg-white/5 border-white/10 focus:border-primary rounded-xl h-12" 
                placeholder="Repita a nova senha"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdatePassword}
              disabled={saving}
              className="w-full bg-primary text-black font-black uppercase tracking-widest h-12 rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
