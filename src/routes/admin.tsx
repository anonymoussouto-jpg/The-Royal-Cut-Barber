import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, Calendar, Settings, PieChart, Scissors, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const menuItems = [
    { to: "/admin", icon: PieChart, label: "Dashboard" },
    { to: "/admin/calendar", icon: Calendar, label: "Agenda" },
    { to: "/admin/staff", icon: Users, label: "Barbeiros" },
    { to: "/admin/crm", icon: Users, label: "Clientes" },
    { to: "/admin/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 border-r border-border/40 bg-card/50 flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-primary font-serif font-bold tracking-tighter text-xl">
            <Scissors className="w-6 h-6" />
            <span>ROYAL ADMIN</span>
          </Link>
        </div>

        <nav className="flex-grow px-4 space-y-2 py-4">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-primary/10 text-primary border-primary/20" }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all border border-transparent font-medium"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border/40">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl">
            <LogOut className="w-5 h-5 mr-3" />
            Sair do Painel
          </Button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto bg-background p-8">
        <Outlet />
      </main>
    </div>
  );
}
