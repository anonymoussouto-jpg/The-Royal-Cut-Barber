import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
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
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar | The Royal Cut" }] as any,
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
  const [authLogs, setAuthLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuthLogs((prev) => [`[${timestamp}] ${msg}`, ...prev].slice(0, 20));
    console.log(`[LOGIN_LOG] ${msg}`);
  };

  useEffect(() => {
    const checkDB = async () => {
      try {
        const { error } = await supabase.from("services").select("id").limit(1);
        if (error) throw error;
        setDbStatus("online");
        addLog("Conectado ao Banco");
      } catch (e: any) {
        setDbStatus("offline");
        addLog(`Erro Banco: ${e.message}`);
      }
    };
    checkDB();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`Auth Event: ${event}`);
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        addLog("Usuário detectado. Redirecionando...");
        toast.success("Logado com sucesso!");
        const dest = (redirect as any) || "/admin";
        
        setTimeout(() => {
          window.location.href = dest;
        }, 500);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirect]);

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
    addLog(`Tentando login: ${email}`);

    try {
      console.log("Supabase signIn attempt...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log("Supabase response:", { hasSession: !!data?.session, error: error?.message });

      if (error) {
        addLog(`Erro: ${error.message} (${error.status})`);
        toast.error(error.message);
      } else if (data.session) {
        addLog("Login bem-sucedido!");
        const dest = (redirect as any) || "/admin";
        window.location.href = dest;
      }
    } catch (err: any) {
      addLog(`Exceção: ${err.message}`);
      console.error("LOGIN_EXCEPTION", err);
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
            <div className="p-2 bg-black/50 rounded text-[10px] font-mono max-h-32 overflow-y-auto border border-zinc-800">
              <div className="flex justify-between border-b border-zinc-800 mb-1">
                <span>DATABASE:</span>
                <span className={dbStatus === "online" ? "text-green-500" : "text-red-500"}>
                  {dbStatus.toUpperCase()}
                </span>
              </div>
              {authLogs.map((log, i) => (
                <div key={i} className="text-zinc-500 truncate text-[9px]">
                  {log}
                </div>
              ))}
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
            <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest opacity-40">
              Royal Admin Interface v2.0
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
