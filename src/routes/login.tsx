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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Home, Mail, Lock, User, ArrowLeft } from "lucide-react";
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
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbStatus, setDbStatus] = useState<"online" | "offline" | "checking">("checking");
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
      setView("login");
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) throw error;

      toast.success("Link enviado! Verifique seu e-mail.");
      setView("login");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail de redefinição");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <Card className="w-full max-w-md relative border-white/10 bg-zinc-900/90 text-white overflow-hidden">
        {view === "forgot" ? (
          <>
            <CardHeader className="text-center">
              <button 
                onClick={() => setView("login")}
                className="absolute left-6 top-8 text-zinc-500 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-primary mt-4">
                RECUPERAR SENHA
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Enviaremos um link para o seu e-mail
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleResetPassword}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot">E-mail</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-11"
                    placeholder="exemplo@royal.com"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl transition-all"
                >
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>
              </CardFooter>
            </form>
          </>
        ) : (
          <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-serif font-bold tracking-tight text-primary">
                ROYAL CUT
              </CardTitle>
              <TabsList className="grid grid-cols-2 bg-zinc-800/50 mt-4 h-11 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Cadastrar</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
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
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password-login">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-[11px] text-primary hover:underline font-bold"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
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
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <div className="relative">
                      <Input
                        id="signup-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 h-11 pl-10"
                        placeholder="Seu Nome"
                      />
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 h-11 pl-10"
                        placeholder="exemplo@royal.com"
                      />
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 pl-10 pr-10 h-11"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
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
                    {loading ? "Criando conta..." : "Criar Minha Conta"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setView("login")}
                    className="w-full text-zinc-500 hover:text-white"
                  >
                    Já tenho uma conta
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
        <div className="bg-primary/5 py-3 border-t border-white/5">
          <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest opacity-40">
            Royal Admin Interface v2.0
          </p>
        </div>
      </Card>
    </div>
  );
}
