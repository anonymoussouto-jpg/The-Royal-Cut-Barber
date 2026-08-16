import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Scissors, ShoppingBag, Calendar, User, MessageSquare, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const booking = useBooking();
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
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">IA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;
