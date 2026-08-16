import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  LogOut,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    const { checkIsAdmin } = await import("@/lib/auth.functions");
    const { isAdmin } = await checkIsAdmin();

    if (!isAdmin) {
      console.error("Admin check failed: User is not an admin");
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

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
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
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col bg-[#050505]">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-serif font-bold text-primary">
            <Scissors className="w-6 h-6" />
            <span>THE ROYAL CUT</span>
          </Link>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-2 ml-8 font-bold">Admin Panel</p>
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
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:text-white"}`} />
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

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto">
        <header className="h-20 border-b border-white/10 px-8 flex items-center justify-between bg-black/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-xl font-bold font-serif">
            {menuItems.find(m => m.href === currentPath)?.label || "Admin"}
          </h2>
          
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-primary uppercase">Thiago</span>
                <span className="text-[10px] text-white/40">Master Administrator</span>
             </div>
             <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5 bg-primary/10">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Thiago" className="w-full h-full rounded-full" />
             </div>
          </div>
        </header>
        
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}