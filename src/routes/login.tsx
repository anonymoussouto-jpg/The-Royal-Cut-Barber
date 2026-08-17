import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Home } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({
    title: "Entrar | The Royal Cut",
    meta: [
      {
        name: "description",
        content: "Acesse sua conta na The Royal Cut para gerenciar seus agendamentos e Barber Points.",
      },
    ],
  }),
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = useSearch({ from: "/login" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbStatus, setDbStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    const checkDB = async () => {
      try {
        const { error } = await supabase.from("services").select("id").limit(1);
        if (error) throw error;
        setDbStatus("online");
      } catch (e: any) {
        setDbStatus("offline");
      }
    };
    checkDB();
  }, []);

  useEffect(() => {
    let redirecting = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        if (redirecting) return;
        
        if (window.location.pathname !== "/login") {
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const dest = params.get("redirect") || "/admin";
        
        redirecting = true;
        
        setTimeout(() => {
          window.location.replace(dest);
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        toast.error(error.message);
      } else if (data.session) {
        // Força o redirecionamento imediato após sucesso, 
        // caso o listener do useEffect falhe ou demore.
        const params = new URLSearchParams(window.location.search);
        const dest = params.get("redirect") || "/admin";
        window.location.replace(dest);
      }
    } catch (err: any) {
      console.error("Login exception", err);
      toast.error("Ocorreu um erro inesperado durante o login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <Card className="w-full max-w-md relative border-white/10 bg-zinc-900/90 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-serif font-bold tracking-tight text-primary">
            ROYAL LOGIN
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Acesse o Painel Administrativo
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="p-2 bg-black/50 rounded text-[10px] font-mono border border-zinc-800 flex justify-between">
              <span>Status do Banco:</span>
              <span className={dbStatus === "online" ? "text-green-500" : "text-red-500"}>
                {dbStatus.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-login">E-mail</Label>
              <Input
                id="email-login"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 h-11"
                placeholder="exemplo@royal.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-login">Senha</Label>
              <div className="relative">
                <Input
                  id="password-login"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pr-10 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-6">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl transition-all"
            >
              {loading ? "Processando..." : "Entrar no Painel"}
            </Button>
            <Link to="/" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-zinc-500 hover:text-white gap-2"
              >
                <Home size={16} />
                Voltar para o Início
              </Button>
            </Link>
            <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest opacity-40">
              Royal Admin Interface v2.0
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}