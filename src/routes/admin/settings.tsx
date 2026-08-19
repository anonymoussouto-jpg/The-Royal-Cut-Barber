import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cpu, Wallet, Loader2, CreditCard, ShieldCheck, Percent, Table } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchServicesCommission();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("key, value");
      if (error) throw error;

      const settingsMap = data.reduce((acc, curr) => {
        let value = curr.value;
        // If it's an object/array, we want to keep it as string for the inputs
        if (value !== null && typeof value === 'object') {
          value = JSON.stringify(value);
        } else if (typeof value === 'string') {
          // Attempt to strip extra quotes if it was double-JSON-stringified
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'string') value = parsed;
          } catch (e) {
            // Keep original string
          }
        }

        return {
          ...acc,
          [curr.key]: String(value ?? ""),
        };
      }, {});

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesCommission = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setServices(data);
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from("system_settings").upsert(
        {
          key,
          value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      if (error) throw error;
      await fetchSettings();
      toast.success(`Configuração ${key} salva`);
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error(`Erro ao salvar ${key}`);
    } finally {
      setLoading(false);
    }
  };

  const updateCommission = async (serviceId: string, owner: number, barber: number) => {
    if (owner + barber !== 100) {
      toast.error("A soma das comissões deve ser 100%");
      return;
    }
    const { error } = await supabase
      .from("services")
      .update({ owner_percentage: owner, barber_percentage: barber })
      .eq("id", serviceId);

    if (error) {
      toast.error("Erro ao atualizar comissão");
    } else {
      setServices(
        services.map((s) =>
          s.id === serviceId ? { ...s, owner_percentage: owner, barber_percentage: barber } : s,
        ),
      );
      toast.success("Comissão atualizada");
    }
  };

  const handleSaveAll = async () => {
    // Save all services that have valid 100% sum
    const validServices = services.filter(s => (s.owner_percentage ?? 50) + (s.barber_percentage ?? 50) === 100);
    
    if (validServices.length > 0) {
      const promises = validServices.map(s => 
        supabase.from("services").update({
          owner_percentage: s.owner_percentage ?? 50,
          barber_percentage: s.barber_percentage ?? 50
        }).eq("id", s.id)
      );
      await Promise.all(promises);
      await fetchServicesCommission();
    }

    toast.success("Configurações salvas com sucesso!");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold uppercase tracking-widest text-xs">
          Carregando configurações...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-serif font-bold">Configurações Globais</h1>
        <p className="text-muted-foreground">
          Gerencie suas chaves de API, pagamentos e preferências do sistema.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-6">
          <TabsTrigger
            value="general"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="commission"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            Comissões por Serviço
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          <div className="grid gap-8">
            {/* Asaas Configuration */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <CreditCard className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Gateway de Pagamento (Asaas)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Integração real para PIX e Cartão de Crédito.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>API Key Asaas</Label>
                    <Input
                      type="password"
                      placeholder="$asaas_access_token..."
                      value={settings["asaas_api_key"] || ""}
                      onChange={(e) => saveSetting("asaas_api_key", e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Chave de acesso obtida no painel do Asaas.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ambiente</Label>
                      <Select
                        value={settings["asaas_env"] || "sandbox"}
                        onValueChange={(val) => saveSetting("asaas_env", val)}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Selecione o ambiente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                          <SelectItem value="production">Produção (Real)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Secret</Label>
                      <Input
                        type="password"
                        placeholder="Token do Webhook..."
                        value={settings["asaas_webhook_secret"] || ""}
                        onChange={(e) => saveSetting("asaas_webhook_secret", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase">Segurança de Webhook</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Configure a URL do webhook no painel do Asaas para: <br />
                      <code className="text-primary font-mono select-all">
                        {window.location.origin}/api/public/asaas-webhook
                      </code>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IA Configuration */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <Cpu className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Inteligência Artificial (Fallback System)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configuração de redundância para o Chatbot.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <Label>Google Gemini (Principal)</Label>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Input
                        key={`gemini-${i}`}
                        type="password"
                        placeholder={`Gemini API Key ${i}`}
                        value={settings[`gemini_api_key_${i}`] || ""}
                        onChange={(e) => saveSetting(`gemini_api_key_${i}`, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 pt-4 border-t border-border/40">
                  <Label>Groq Llama 3 (Fallback)</Label>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Input
                        key={`groq-${i}`}
                        type="password"
                        placeholder={`Groq API Key ${i}`}
                        value={settings[`groq_api_key_${i}`] || ""}
                        onChange={(e) => saveSetting(`groq_api_key_${i}`, e.target.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 pt-4 border-t border-border/40">
                  <Label className="text-primary font-bold">Comportamento da IA</Label>
                  <div className="space-y-2">
                    <Label>Prompt do Systema (Regras de Atendimento)</Label>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Ex: Responda de forma humanizada, seja educado..."
                      value={settings["ai_system_prompt"] || ""}
                      onChange={(e) => saveSetting("ai_system_prompt", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Delay na Resposta (ms)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 20"
                        value={settings["ai_response_delay_ms"] || "20"}
                        onChange={(e) => saveSetting("ai_response_delay_ms", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo de Caracteres</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 150"
                        value={settings["ai_max_chars"] || "150"}
                        onChange={(e) => saveSetting("ai_max_chars", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagens por Pergunta</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 3"
                        value={settings["ai_max_messages"] || "3"}
                        onChange={(e) => saveSetting("ai_max_messages", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="space-y-0.5">
                    <Label>Alternância Automática</Label>
                    <p className="text-xs text-muted-foreground">
                      Mudar automaticamente se uma chave falhar.
                    </p>
                  </div>
                  <Switch
                    checked={settings["ai_auto_fallback"] === "true"}
                    onCheckedChange={(val) => saveSetting("ai_auto_fallback", val.toString())}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Configuration (Fallback) */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <Wallet className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Chave PIX Manual (Backup)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Usada caso o gateway automático esteja desativado.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Chave Principal (CNPJ/Email)</Label>
                  <Input
                    placeholder="sua-chave@pix.com"
                    value={settings["pix_key"] || ""}
                    onChange={(e) => saveSetting("pix_key", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>WhatsApp da Barbearia (Público)</Label>
                  <Input
                    placeholder="Ex: 11999999999"
                    value={settings["whatsapp_number"] || ""}
                    onChange={(e) => saveSetting("whatsapp_number", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Número para o botão flutuante no site (apenas números com DDD).
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Endereço da Barbearia</Label>
                  <Input
                    placeholder="Rua Exemplo, 123 - Centro"
                    value={settings["address"] || ""}
                    onChange={(e) => saveSetting("address", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Endereço que aparecerá no rodapé do site.
                  </p>
                </div>
                <Button onClick={handleSaveAll} className="bg-primary text-primary-foreground">
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commission" className="space-y-6">
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center gap-4">
              <Percent className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Divisão Financeira por Serviço</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure os percentuais de comissão para cada serviço.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/40 border-b border-white/5 uppercase text-[10px] font-bold tracking-widest">
                    <tr>
                      <th className="py-3 text-left px-2">Serviço</th>
                      <th className="py-3 text-center px-2">Preço Base</th>
                      <th className="py-3 text-center px-2">Dono (%)</th>
                      <th className="py-3 text-center px-2">Barbeiro (%)</th>
                      <th className="py-3 text-right px-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {services.map((service) => (
                      <tr
                        key={service.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-4 px-2 font-bold">{service.name}</td>
                        <td className="py-4 px-2 text-center text-primary font-serif font-black">
                          R$ {service.price}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              className={`w-20 mx-auto bg-black/40 border-white/10 text-center h-8 text-xs ${
                                (service.owner_percentage || 50) + (service.barber_percentage || 50) !== 100 
                                  ? "border-red-500 text-red-500" 
                                  : ""
                              }`}
                              value={service.owner_percentage ?? 50}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setServices(
                                  services.map((s) =>
                                    s.id === service.id
                                      ? { ...s, owner_percentage: val }
                                      : s,
                                  ),
                                );
                              }}
                            />
                            {(service.owner_percentage || 0) + (service.barber_percentage || 0) !== 100 && (
                              <p className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">
                                A soma deve ser 100%
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Input
                            type="number"
                            className={`w-20 mx-auto bg-black/40 border-white/10 text-center h-8 text-xs ${
                              (service.owner_percentage || 50) + (service.barber_percentage || 50) !== 100 
                                ? "border-red-500 text-red-500" 
                                : ""
                            }`}
                            value={service.barber_percentage ?? 50}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setServices(
                                services.map((s) =>
                                  s.id === service.id
                                    ? { ...s, barber_percentage: val }
                                    : s,
                                ),
                              );
                            }}
                          />
                        </td>
                        <td className="py-4 px-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-primary/20 hover:bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest"
                            onClick={() =>
                              updateCommission(
                                service.id,
                                service.owner_percentage ?? 50,
                                service.barber_percentage ?? 50,
                              )
                            }
                          >
                            Salvar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
