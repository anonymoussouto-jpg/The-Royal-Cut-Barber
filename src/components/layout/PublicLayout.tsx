import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import {
  Scissors,
  ShoppingBag,
  Calendar,
  User,
  MessageSquare,
  LayoutDashboard,
  MapPin,
  Clock,
  Crown,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import { useChatbot } from "@/hooks/use-chatbot";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const booking = useBooking();
  const chatbot = useChatbot();
  const location = useLocation();

  const queryClient = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
  });

  const { data: hasSubscription } = useQuery({
    queryKey: ["has-subscription", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("client_id", session!.user.id)
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries({ queryKey: ["session"] });
    window.location.href = "/";
  };

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("key, value");
      if (!data) return {};
      return data.reduce((acc, curr) => {
        let val = curr.value;
        try {
          val = JSON.parse(val as string);
        } catch {
          // ignore
        }
        return { ...acc, [curr.key]: val };
      }, {} as Record<string, any>);
    },
  });

  const whatsappNumber = settings?.["whatsapp_number"];

  const isLinkActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-serif font-bold tracking-tighter text-primary"
          >
            <Scissors className="w-6 h-6" />
            <span className="hidden sm:inline">THE ROYAL CUT</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive("/") ? "text-primary" : "hover:text-primary"}`}
            >
              Início
              {isLinkActive("/") && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </Link>
            <Link
              to="/services"
              className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive("/services") ? "text-primary" : "hover:text-primary"}`}
            >
              Serviços
              {isLinkActive("/services") && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </Link>
            <Link
              to="/shop"
              className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive("/shop") ? "text-primary" : "hover:text-primary"}`}
            >
              Loja
              {isLinkActive("/shop") && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </Link>
            <Link
              to="/membership"
              className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive("/membership") ? "text-primary" : "hover:text-primary"}`}
            >
              Clube
              {isLinkActive("/membership") && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </Link>
          </div>

          {/* Tablet Icons Navigation */}
          <div className="hidden md:flex lg:hidden items-center gap-6">
            <Link
              to="/"
              title="Início"
              className={`${isLinkActive("/") ? "text-primary" : "text-white/50 hover:text-white"}`}
            >
              <Scissors className="w-5 h-5" />
            </Link>
            <Link
              to="/services"
              title="Serviços"
              className={`${isLinkActive("/services") ? "text-primary" : "text-white/50 hover:text-white"}`}
            >
              <Calendar className="w-5 h-5" />
            </Link>
            <Link
              to="/shop"
              title="Loja"
              className={`${isLinkActive("/shop") ? "text-primary" : "text-white/50 hover:text-white"}`}
            >
              <ShoppingBag className="w-5 h-5" />
            </Link>
            <Link
              to="/membership"
              title="Clube"
              className={`${isLinkActive("/membership") ? "text-primary" : "text-white/50 hover:text-white"}`}
            >
              <Crown className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {hasSubscription && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Crown className="w-3 h-3" />
                <span className="hidden lg:inline">Membro Royal</span>
              </div>
            )}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full border border-primary/20 bg-primary/10"
                  >
                    <span className="text-primary font-bold">
                      {profile?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-zinc-950 border-white/10 text-white"
                  align="end"
                >
                  <DropdownMenuLabel className="font-serif">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <Link to="/perfil">
                    <DropdownMenuItem className="cursor-pointer focus:bg-primary focus:text-black">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/perfil">
                    <DropdownMenuItem className="cursor-pointer focus:bg-primary focus:text-black">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Meus Agendamentos</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/membership">
                    <DropdownMenuItem className="cursor-pointer focus:bg-primary focus:text-black">
                      <Crown className="mr-2 h-4 w-4" />
                      <span>Minha Assinatura</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:bg-red-500 focus:text-white"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="icon" className="text-white/50 hover:text-white">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <Button
              onClick={() => booking.open()}
              className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Agendar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-grow pt-16 pb-20 md:pb-0">{children}</main>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2 text-xl font-serif font-bold text-primary">
              <Scissors className="w-6 h-6" />
              <span>THE ROYAL CUT</span>
            </div>
            <p className="text-gray-400 text-sm italic">
              "Tudo que fizer, faça de coração - Col 3:23"
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-primary mb-2">Local & Horário</h4>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2 hover:text-primary transition-colors"
            >
              <MapPin className="w-4 h-4" /> {settings?.["address"] || "Rua Principal, 123 - Centro"}
            </a>
            <div className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2">
              <Clock className="w-4 h-4" /> Seg a Sab: 9h–20h | Dom: Fechado
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center md:items-end">
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </a>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </a>
            </div>
            <p className="text-xs text-gray-600">
              © 2026 The Royal Cut. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {whatsappNumber && (
        <div className="fixed bottom-24 right-6 z-[45] md:bottom-6 group">
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Falar com a equipe
          </div>
          <a
            href={`https://wa.me/55${whatsappNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-2xl shadow-green-500/20 hover:bg-green-600 hover:scale-110 transition-all duration-300"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.43 5.623 1.43h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      )}

      {/* Mobile Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/40 px-4 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto h-14">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive("/") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <Scissors className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Home</span>
          </Link>
          <Link
            to="/services"
            className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive("/services") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Serviços</span>
          </Link>

          <div className="flex items-center justify-center w-full px-2">
            <Button
              onClick={() => booking.open()}
              size="sm"
              className="bg-primary text-primary-foreground -mt-8 shadow-2xl shadow-primary/40 rounded-full w-14 h-14 p-0 border-4 border-background ring-4 ring-primary/10"
            >
              <Calendar className="w-6 h-6" />
            </Button>
          </div>

          <Link
            to="/shop"
            className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive("/shop") ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Loja</span>
          </Link>
          <button
            onClick={() => chatbot.open()}
            className="flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">IA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;
