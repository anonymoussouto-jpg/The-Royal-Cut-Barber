import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Scissors, ShoppingBag, Calendar, User, MessageSquare, LayoutDashboard, MapPin, Clock, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import { useChatbot } from "@/hooks/use-chatbot";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const booking = useBooking();
  const chatbot = useChatbot();
  const location = useLocation();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: hasSubscription } = useQuery({
    queryKey: ['has-subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('client_id', session!.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    }
  });

  const isLinkActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-serif font-bold tracking-tighter text-primary">
            <Scissors className="w-6 h-6" />
            <span className="hidden sm:inline">THE ROYAL CUT</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive('/') ? 'text-primary' : 'hover:text-primary'}`}>
              Início
              {isLinkActive('/') && <motion.div layoutId="activeNav" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </Link>
            <Link to="/services" className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive('/services') ? 'text-primary' : 'hover:text-primary'}`}>
              Serviços
              {isLinkActive('/services') && <motion.div layoutId="activeNav" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </Link>
            <Link to="/shop" className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive('/shop') ? 'text-primary' : 'hover:text-primary'}`}>
              Loja
              {isLinkActive('/shop') && <motion.div layoutId="activeNav" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </Link>
            <Link to="/membership" className={`text-sm font-medium transition-colors relative py-1 ${isLinkActive('/membership') ? 'text-primary' : 'hover:text-primary'}`}>
              Clube
              {isLinkActive('/membership') && <motion.div layoutId="activeNav" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </Link>
          </div>

          {/* Tablet Icons Navigation */}
          <div className="hidden md:flex lg:hidden items-center gap-6">
            <Link to="/" title="Início" className={`${isLinkActive('/') ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <Scissors className="w-5 h-5" />
            </Link>
            <Link to="/services" title="Serviços" className={`${isLinkActive('/services') ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <Calendar className="w-5 h-5" />
            </Link>
            <Link to="/shop" title="Loja" className={`${isLinkActive('/shop') ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
              <ShoppingBag className="w-5 h-5" />
            </Link>
            <Link to="/membership" title="Clube" className={`${isLinkActive('/membership') ? 'text-primary' : 'text-white/50 hover:text-white'}`}>
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
             <Link to="/admin" className="hidden sm:block">
              <Button variant="ghost" size="icon">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
            </Link>
            <Button onClick={() => booking.open()} className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90">
              Agendar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-grow pt-16 pb-20 md:pb-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2 text-xl font-serif font-bold text-primary">
              <Scissors className="w-6 h-6" />
              <span>THE ROYAL CUT</span>
            </div>
            <p className="text-gray-400 text-sm italic">"Tudo que fizer, faça de coração - Col 3:23"</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-primary mb-2">Local & Horário</h4>
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2 hover:text-primary transition-colors">
              <MapPin className="w-4 h-4" /> Rua Principal, 123 - Centro
            </a>
            <div className="text-sm text-gray-400 flex items-center justify-center md:justify-start gap-2">
              <Clock className="w-4 h-4" /> Seg a Sab: 9h–20h | Dom: Fechado
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center md:items-end">
            <div className="flex gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-primary/20 transition-colors"><MessageSquare className="w-5 h-5 text-gray-400" /></a>
              <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-primary/20 transition-colors"><MessageSquare className="w-5 h-5 text-gray-400" /></a>
            </div>
            <p className="text-xs text-gray-600">© 2026 The Royal Cut. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/40 px-4 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto h-14">
          <Link to="/" className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <Scissors className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Início</span>
          </Link>
          <Link to="/shop" className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive('/shop') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Loja</span>
          </Link>
          
          <div className="flex items-center justify-center w-full px-2">
            <Button onClick={() => booking.open()} size="sm" className="bg-primary text-primary-foreground -mt-8 shadow-2xl shadow-primary/40 rounded-full w-14 h-14 p-0 border-4 border-background ring-4 ring-primary/10">
              <Calendar className="w-6 h-6" />
            </Button>
          </div>

          <Link to="/membership" className={`flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] transition-colors ${isLinkActive('/membership') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">Clube</span>
          </Link>
          <button onClick={() => chatbot.open()} className="flex flex-col items-center justify-center gap-1 w-full min-w-[44px] min-h-[44px] text-muted-foreground hover:text-primary">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">IA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;