import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
  User,
  Crown,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // Apenas no cliente
    if (typeof window === "undefined") return;

    // Tenta obter a sessão e o usuário
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    // Verifica se o usuário tem o cargo de admin
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Acesso negado: Usuário não é administrador", roleError);
      throw redirect({
        to: "/",
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const [adminProfile, setAdminProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  useEffect(() => {
    const fetchAdminProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();

        if (data) {
          setAdminProfile(data);
        }
      }
    };

    fetchAdminProfile();
  }, []);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Serviços", href: "/admin/services", icon: Scissors },
    { label: "Produtos", href: "/admin/products", icon: ShoppingBag },
    { label: "Relatórios", href: "/admin/reports", icon: TrendingUp },
    { label: "Pedidos Loja", href: "/admin/orders", icon: ShoppingBag },
    { label: "Assinaturas", href: "/admin/subscriptions", icon: Crown },
    { label: "Agenda", href: "/admin/calendar", icon: Calendar },
    { label: "Clientes CRM", href: "/admin/crm", icon: Users },
    { label: "Equipe", href: "/admin/staff", icon: Scissors },
    { label: "Configurações", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 border-r border-white/10 flex-col bg-[#050505] shrink-0">
        <div className="p-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-serif font-bold text-primary"
          >
            <Scissors className="w-6 h-6" />
            <span>THE ROYAL CUT</span>
          </Link>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-2 ml-8 font-bold">
            Admin Panel
          </p>
        </div>

        <nav className="flex-grow px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:text-white"}`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-white/50 hover:text-red-400 hover:bg-red-400/10 gap-3"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Top Nav & Sidebar Drawer */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#050505]">
        <Link to="/" className="flex items-center gap-2 text-lg font-serif font-bold text-primary">
          <Scissors className="w-5 h-5" />
          <span>THE ROYAL CUT</span>
        </Link>

        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-[#050505] border-white/10 p-0 w-72">
            <SheetHeader className="p-8 text-left border-b border-white/10">
              <SheetTitle className="flex items-center gap-2 text-xl font-serif font-bold text-primary">
                <Scissors className="w-6 h-6" />
                <span>THE ROYAL CUT</span>
              </SheetTitle>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-2 font-bold">
                Admin Panel
              </p>
            </SheetHeader>
            <nav className="p-4 space-y-2 flex-grow overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-4 border-primary"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-6 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-white/50 hover:text-red-400 hover:bg-red-400/10 gap-3"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto">
        <header className="h-20 border-b border-white/10 px-8 flex items-center justify-between bg-black/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-xl font-bold font-serif">
            {menuItems.find((m) => m.href === currentPath)?.label || "Admin"}
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-primary uppercase">
                {adminProfile?.full_name || "Administrador"}
              </span>
              <span className="text-[10px] text-white/40">Master Administrator</span>
            </div>
            <Avatar className="w-10 h-10 border border-primary/20 p-0.5 bg-primary/10">
              <AvatarImage
                src={
                  adminProfile?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminProfile?.full_name || "Admin"}`
                }
              />
              <AvatarFallback className="bg-primary text-black font-bold">
                {getInitials(adminProfile?.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
