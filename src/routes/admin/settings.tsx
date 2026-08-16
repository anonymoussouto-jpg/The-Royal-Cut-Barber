import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cpu, Wallet, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('key, value');
      if (error) throw error;
      
      const settingsMap = data.reduce((acc, curr) => {
        let parsedValue = curr.value;
        try {
          // If it's already an object, use it; if it's a JSON-encoded string, parse it
          if (typeof curr.value === 'string') {
            parsedValue = JSON.parse(curr.value);
          }
        } catch (e) {
          parsedValue = curr.value;
        }
        
        return {
          ...acc,
          [curr.key]: String(parsedValue)
        };
      }, {});
      
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      // Serialize value as JSONB for Supabase
      const jsonValue = JSON.stringify(value);
      
      const { error } = await supabase.from('system_settings').upsert({
        key,
        value: jsonValue,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error(`Erro ao salvar ${key}`);
    }
  };

  const handleSaveAll = async () => {
    toast.success('Configurações salvas com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold uppercase tracking-widest text-xs">Carregando configurações...</p>
      </div>
    );
  }

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
                {[1, 2, 3].map(i => (
                  <Input 
                    key={`gemini-${i}`}
                    type="password" 
                    placeholder={`Gemini API Key ${i}`} 
                    value={settings[`gemini_api_key_${i}`] || ''}
                    onChange={(e) => saveSetting(`gemini_api_key_${i}`, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-4 pt-4 border-t border-border/40">
              <Label>Groq Llama 3 (Fallback)</Label>
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <Input 
                    key={`groq-${i}`}
                    type="password" 
                    placeholder={`Groq API Key ${i}`} 
                    value={settings[`groq_api_key_${i}`] || ''}
                    onChange={(e) => saveSetting(`groq_api_key_${i}`, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="space-y-0.5">
                <Label>Alternância Automática</Label>
                <p className="text-xs text-muted-foreground">Mudar automaticamente se uma chave falhar.</p>
              </div>
              <Switch checked={settings['ai_auto_fallback'] === 'true'} onCheckedChange={(val) => saveSetting('ai_auto_fallback', val.toString())} />
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
              <Input 
                placeholder="sua-chave@pix.com" 
                value={settings['pix_key'] || ''}
                onChange={(e) => saveSetting('pix_key', e.target.value)}
              />
            </div>
            <Button onClick={handleSaveAll} className="bg-primary text-primary-foreground">Salvar Alterações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
