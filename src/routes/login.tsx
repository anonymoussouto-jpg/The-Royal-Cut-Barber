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

  // Debug session state
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH_EVENT:", event, session?.user?.id);
      if (event === "SIGNED_IN" && session) {
        toast.success("Autenticado!");
        setTimeout(() => {
          navigate({ to: (redirect as any) || "/admin" });
        }, 500);
      }
    });
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
        toast.error(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos"
            : error.message,
        );
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

                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-xs text-zinc-500 hover:text-primary transition-colors text-center"
                >
                  Esqueci minha senha
                </button>

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
