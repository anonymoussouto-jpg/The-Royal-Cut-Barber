import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/perfil")({
  component: BarberProfile,
});

function BarberProfile() {
  const [user, setUser] = useState<any>(null);
  const [barber, setBarber] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">Meu Perfil</h1>
        <p className="text-white/40">Suas informações profissionais no sistema.</p>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-8">
        <div className="flex items-center gap-6 pb-8 border-b border-white/5">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/20">
            {barber?.avatar_url ? (
              <img src={barber.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif">{barber?.full_name || 'Profissional'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Colaborador Verificado</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label className="text-white/40 uppercase text-[10px] font-bold tracking-[0.2em]">Nome Completo</Label>
            <Input readOnly value={barber?.full_name || ''} className="bg-black/40 border-white/5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-white/40 uppercase text-[10px] font-bold tracking-[0.2em]">Email de Acesso</Label>
              <Input readOnly value={user?.email || ''} className="bg-black/40 border-white/5" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/40 uppercase text-[10px] font-bold tracking-[0.2em]">Telefone</Label>
              <Input readOnly value={barber?.email || ''} placeholder="Não cadastrado" className="bg-black/40 border-white/5" />
            </div>
          </div>

          <div className="space-y-2 pt-4">
             <Button className="bg-primary text-black font-bold hover:opacity-90 transition-opacity">
               Alterar Senha
             </Button>
             <p className="text-[10px] text-white/20">Para alterar outros dados, entre em contato com o administrador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
