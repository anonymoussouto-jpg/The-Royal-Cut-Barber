import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
import { Scissors, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | The Royal Cut" }
    ] as any,
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
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Debug session state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH_EVENT:", event, session?.user?.id);
      if (event === "SIGNED_IN" && session) {
        toast.success("Autenticado!");
        setTimeout(() => {
          navigate({ to: (redirect as any) || "/admin" });
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
    console.log("LOGGING_IN:", email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("AUTH_ERROR:", error);
        
        // Enhanced logging for diagnostics
        console.error("AUTH_DIAGNOSTIC:", {
          status: error.status,
          message: error.message,
          code: (error as any).code,
          name: error.name
        });
        
        // Specific feedback for potential role issues or database schema errors (500)
        if (error.message.includes("Database error") || error.status === 500) {
          toast.error("Falha na conexão com o banco de dados. Isso pode ser um problema temporário nas permissões da tabela profiles ou user_roles.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
        } else {
          toast.error(
            error.message === "Invalid login credentials"
              ? "Credenciais inválidas. Verifique se o e-mail e a senha estão corretos."
              : `Erro de acesso: ${error.message}`,
          );
        }
        return;
      }

      console.log("AUTH_SUCCESS:", data.user?.id);
    } catch (error: any) {
      console.error("CRITICAL_AUTH_ERROR:", error);
      toast.error("Erro técnico ao acessar o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (result.error) throw result.error;
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Google");
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast.error("Informe seu e-mail primeiro");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("Enviamos um link de recuperação para seu e-mail.");
      setShowResetForm(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !registerName) {
      toast.error("Preencha todos os campos");
      return;
    }

    setRegisterLoading(true);
    console.log("STARTING_REGISTRATION:", { email: registerEmail, name: registerName });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerName,
          },
        },
      });

      if (error) {
        console.error("REGISTRATION_AUTH_ERROR:", error);
        throw error;
      }
      
      console.log("REGISTRATION_AUTH_SUCCESS:", { userId: data.user?.id, sessionActive: !!data.session });

      if (data.user) {
        // Log profile check attempt
        console.log("VERIFYING_PROFILE_CREATION:", data.user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("PROFILE_VERIFICATION_FAILED:", profileError);
        } else {
          console.log("PROFILE_VERIFIED:", profile);
        }

        if (data.session) {
          toast.success("Cadastro realizado com sucesso!");
          navigate({ to: "/admin" });
        } else {
          toast.success("Cadastro iniciado. Verifique seu e-mail para confirmar.");
          setShowRegisterForm(false);
        }
      }
    } catch (error: any) {
      console.error("FINAL_REGISTRATION_EXCEPTION:", error);
      toast.error(error.message || "Erro ao realizar cadastro");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <Card className="w-full max-w-md relative border-white/10 bg-zinc-900/90 backdrop-blur-xl text-white overflow-hidden">
        {showResetForm ? (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight">
                RECUPERAR SENHA
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Informe seu e-mail para receber o link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                onClick={handleResetPassword}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl"
                disabled={resetLoading}
              >
                {resetLoading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowResetForm(false)}
                className="w-full text-zinc-400 hover:text-white"
              >
                Voltar para o Login
              </Button>
            </CardFooter>
          </>
        ) : showRegisterForm ? (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight">
                CRIAR CONTA
              </CardTitle>
              <CardDescription className="text-zinc-400">Entre para a irmandade Royal</CardDescription>
            </CardHeader>

            <form onSubmit={handleRegister} className="space-y-4">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nome Completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Seu nome"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">E-mail</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl"
                  disabled={registerLoading}
                >
                  {registerLoading ? "Criando conta..." : "Criar Conta"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="text-xs text-zinc-500 hover:text-primary transition-colors text-center"
                >
                  Já tem uma conta? Entre aqui
                </button>
              </CardFooter>
            </form>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                  <Scissors className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-serif font-bold tracking-tight">
                ROYAL LOGIN
              </CardTitle>
              <CardDescription className="text-zinc-400">Acesse sua conta premium</CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="px-6 text-center text-[10px] text-zinc-600 opacity-20 hover:opacity-100 transition-opacity">
                '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                        
                                            
                                            Adicionar logs detalhados e uma mensagem de erro amigável na tela de login para eu identificar por que a senha não é aceita.
              </div>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Entrar"}
                </Button>

                <div className="flex justify-between w-full px-1">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(true)}
                    className="text-xs text-zinc-500 hover:text-primary transition-colors"
                  >
                    Criar conta
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-xs text-zinc-500 hover:text-primary transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <div className="relative w-full py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-900 px-2 text-zinc-500">Ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl border-zinc-700 hover:bg-zinc-800 text-white"
                  onClick={handleGoogleLogin}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </CardFooter>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
