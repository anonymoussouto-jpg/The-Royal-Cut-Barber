import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { Scissors, ShoppingBag, Calendar, User, MessageSquare, LayoutDashboard, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import { useChatbot } from "@/hooks/use-chatbot";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const booking = useBooking();
  const chatbot = useChatbot();
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-serif font-bold tracking-tighter text-primary">
            <Scissors className="w-6 h-6" />
            <span>THE ROYAL CUT</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Início</Link>
            <Link to="/services" className="text-sm font-medium hover:text-primary transition-colors">Serviços</Link>
            <Link to="/shop" className="text-sm font-medium hover:text-primary transition-colors">Loja</Link>
            <Link to="/membership" className="text-sm font-medium hover:text-primary transition-colors">Clube</Link>
          </div>

          <div className="flex items-center gap-4">
             <Link to="/admin">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
            </Link>
            <Button onClick={() => booking.open()} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90">
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/40 px-6 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link to="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Scissors className="w-5 h-5" />
            <span className="text-[10px]">Início</span>
          </Link>
          <Link to="/shop" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px]">Loja</span>
          </Link>
          <Button onClick={() => booking.open()} size="sm" className="bg-primary text-primary-foreground -mt-8 shadow-lg shadow-primary/20 rounded-full w-12 h-12 p-0">
            <Calendar className="w-6 h-6" />
          </Button>
          <Link to="/membership" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Clube</span>
          </Link>
          <button onClick={() => chatbot.open()} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">IA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;