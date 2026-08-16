import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cpu, Key, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Configurações Globais</h1>
        <p className="text-muted-foreground">Gerencie suas chaves de API, pagamentos e preferências do sistema.</p>
      </div>

      <div className="grid gap-8">
        {/* IA Configuration */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <Cpu className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Inteligência Artificial (Fallback System)</CardTitle>
              <p className="text-sm text-muted-foreground">Configuração de redundância para o Chatbot.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <Label>Google Gemini (Principal)</Label>
              <div className="space-y-2">
                <Input type="password" placeholder="Gemini API Key 1" defaultValue="••••••••••••" />
                <Input type="password" placeholder="Gemini API Key 2" />
                <Input type="password" placeholder="Gemini API Key 3" />
              </div>
            </div>
            <div className="grid gap-4 pt-4 border-t border-border/40">
              <Label>Groq Llama 3 (Fallback)</Label>
              <div className="space-y-2">
                <Input type="password" placeholder="Groq API Key 1" defaultValue="••••••••••••" />
                <Input type="password" placeholder="Groq API Key 2" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="space-y-0.5">
                <Label>Alternância Automática</Label>
                <p className="text-xs text-muted-foreground">Mudar automaticamente se uma chave falhar.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Payment Configuration */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <Wallet className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Pagamentos (PIX)</CardTitle>
              <p className="text-sm text-muted-foreground">Defina as chaves para recebimento instantâneo.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Chave Principal (CNPJ/Email)</Label>
              <Input placeholder="sua-chave@pix.com" />
            </div>
            <Button className="bg-primary text-primary-foreground">Salvar Alterações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
