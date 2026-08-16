import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Users, 
  Image as ImageIcon, 
  User, 
  LogOut, 
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/barber")({
  beforeLoad: async ({ context }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }

    const { data: isBarber } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'barber'
    });

    if (!isBarber) {
      // Check if admin (admins can also access)
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      if (!isAdmin) {
        throw redirect({ to: "/" });
      }
    }
  },
  component: BarberLayout,
});

function BarberLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
    toast.success("Sessão encerrada");
  };

  const navItems = [
    { label: "Minha Agenda", icon: Calendar, to: "/barber/agenda" },
    { label: "Meus Clientes", icon: Users, to: "/barber/clientes" },
    { label: "Minhas Fotos", icon: ImageIcon, to: "/barber/fotos" },
    { label: "Meu Perfil", icon: User, to: "/barber/perfil" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-r border-white/5">
      <div className="p-8">
        <Link to="/barber" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <span className="font-serif font-black text-black">R</span>
          </div>
          <span className="font-serif font-bold text-xl tracking-tighter">THE ROYAL CUT</span>
        </Link>
        <p className="text-[10px] text-primary font-bold tracking-[0.2em] mt-1 ml-10 opacity-60">PORTAL DO COLABORADOR</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-primary hover:bg-primary/5 transition-all group [&.active]:bg-primary/10 [&.active]:text-primary"
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Colaborador</p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start text-white/40 hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-white/5 px-6 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-50">
          <Link to="/barber" className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg">THE ROYAL CUT</span>
          </Link>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-white/5 w-72">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <div className="p-6 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
