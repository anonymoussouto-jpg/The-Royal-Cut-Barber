import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cpu, Wallet, Loader2, CreditCard, ShieldCheck, Percent, Table, CheckCircle2, AlertCircle, Activity, Play, Terminal, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { saveSystemSetting, validateAiKey, checkAsaasConnection, getSystemStats } from "@/lib/settings.functions";
import { testApiKey, getChatbotResponse } from "@/lib/ai.functions";
import { triggerGithubSync, getGithubSyncLogs } from "@/lib/github.functions";
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
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [asaasStatus, setAsaasStatus] = useState<{ connected: boolean; name?: string; message?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  const saveSettingFn = useServerFn(saveSystemSetting);
  const validateKeyFn = useServerFn(validateAiKey);
  const checkAsaasFn = useServerFn(checkAsaasConnection);
  const getStatsFn = useServerFn(getSystemStats);
  
  const syncGithubFn = useServerFn(triggerGithubSync);
  const getLogsFn = useServerFn(getGithubSyncLogs);
  const testApiKeyFn = useServerFn(testApiKey);
  const testChatbotFn = useServerFn(getChatbotResponse);
  
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [keyStatuses, setKeyStatuses] = useState<Record<string, { status: "ok" | "error"; message: string; responseTime?: number }>>({});
  const [testingKey, setTestingKey] = useState<Record<string, boolean>>({});
  const [testingChatbot, setTestingChatbot] = useState(false);
  const [chatbotTestResult, setChatbotTestResult] = useState<{ success: boolean; response?: string; error?: string } | null>(null);
  const [lastLog, setLastLog] = useState<any>(null);
  const REPO_NAME = "anonymoussouto-jpg/The-Royal-Cut-Barber";

  useEffect(() => {
    fetchSettings();
    fetchServicesCommission();
    fetchSyncLogs();
    loadStats();
    loadLastChatbotLog();
  }, []);

  const loadLastChatbotLog = () => {
    supabase.from("system_settings").select("value").eq("key", "chatbot_last_log").maybeSingle()
      .then(({ data }) => { if (data?.value) { try { setLastLog(JSON.parse(String(data.value))); } catch {} } });
  };

  const loadStats = async () => {
    try {
      const data = await getStatsFn();
      setStats(data);
    } catch (e) {
      console.error("Erro ao carregar stats", e);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const logs = await getLogsFn();
      setSyncLogs(logs);
    } catch (e) {
      console.error("Erro ao buscar logs", e);
    }
  };

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
      
      console.log("[AdminSettings] Configurações carregadas:", Object.keys(settingsMap));
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
      console.log(`[AdminSettings] Chamando saveSettingFn para: ${key}`);
      const result = await saveSettingFn({ data: { key, value } });
      console.log(`[AdminSettings] Resposta de saveSettingFn para ${key}:`, result);
      if (!result.success) throw new Error("Falha ao salvar");
      await fetchSettings();
      toast.success(`Configuração ${key} salva`);
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error(`Erro ao salvar ${key}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAsaas = async () => {
    const key = settings["asaas_api_key"];
    const env = (settings["asaas_env"] as "sandbox" | "production") || "sandbox";
    
    if (!key) {
      toast.error("Insira a API Key do Asaas");
      return;
    }

    try {
      setLoading(true);
      const result = await checkAsaasFn({ data: { apiKey: key, env } });
      if (result.success) {
        setAsaasStatus({ connected: true, name: result.accountName });
        toast.success("Conexão com Asaas estabelecida!");
      } else {
        setAsaasStatus({ connected: false, message: result.message });
        toast.error(result.message || "Erro ao conectar com Asaas");
      }
    } catch (e) {
      toast.error("Erro técnico na validação do Asaas");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateKey = async (keyName: string, provider: "gemini" | "groq") => {
    const keyValue = settings[keyName];
    if (!keyValue) {
      toast.error("Insira uma chave para validar");
      return;
    }

    try {
      setValidating(prev => ({ ...prev, [keyName]: true }));
      const result = await validateKeyFn({ data: { provider, key: keyValue } });
      
      if (result.valid) {
        toast.success(`Chave ${keyName} é válida!`);
        await saveSetting(keyName, keyValue);
      } else {
        toast.error(`Chave inválida: ${result.message}`);
      }
    } catch (error) {
      toast.error("Erro ao validar chave");
    } finally {
      setValidating(prev => ({ ...prev, [keyName]: false }));
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

  const handleSyncGithub = async () => {
    try {
      setSyncing(true);
      const result = await syncGithubFn({ data: { message: "Sincronização manual via Painel Admin" } });
      if (result.success) {
        toast.success("GitHub sincronizado com sucesso!");
        fetchSyncLogs();
      } else {
        toast.error(`Erro na sincronização: ${result.error}`);
      }
    } catch (error) {
      toast.error("Erro ao disparar sincronização");
    } finally {
      setSyncing(false);
    }
  };

  const handleTestKey = async (keyName: string) => {
    setTestingKey(p => ({ ...p, [keyName]: true }));
    try {
      const result = await testApiKeyFn({ data: { keyName } });
      setKeyStatuses(p => ({ ...p, [keyName]: { status: result.status, message: result.message, responseTime: result.responseTime } }));
      result.status === "ok" ? toast.success(`✅ ${keyName}: OK (${result.responseTime}ms)`) : toast.error(`❌ ${keyName}: ${result.message}`);
    } catch (e: any) {
      setKeyStatuses(p => ({ ...p, [keyName]: { status: "error", message: e.message } }));
      toast.error(`Erro ao testar ${keyName}`);
    } finally {
      setTestingKey(p => ({ ...p, [keyName]: false }));
    }
  };

  const handleTestFullChatbot = async () => {
    setTestingChatbot(true);
    setChatbotTestResult(null);
    try {
      const res = await testChatbotFn({ 
        data: { 
          messages: [{ role: "user", content: "Olá! Quais serviços vocês oferecem?" }], 
          servicesContext: "Corte Masculino: R$ 50, Barba: R$ 35", 
          barbersContext: "Thiago" 
        } 
      });
      if (res?.content) { 
        setChatbotTestResult({ success: true, response: res.content }); 
        toast.success("Chatbot respondeu!"); 
      } else { 
        setChatbotTestResult({ success: false, error: "Sem resposta." }); 
        toast.error("Chatbot não respondeu."); 
      }
      loadLastChatbotLog();
    } catch (e: any) {
      setChatbotTestResult({ success: false, error: e.message });
      toast.error("Erro ao testar chatbot.");
    } finally {
      setTestingChatbot(false);
    }
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
            value="chatbot"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            Chatbot IA
          </TabsTrigger>
          <TabsTrigger
            value="commission"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            Comissões
          </TabsTrigger>
          <TabsTrigger
            value="github"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black"
          >
            GitHub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          <div className="grid gap-8">
            {/* System Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Usuários</p>
                      <h3 className="text-2xl font-serif font-black text-primary">{stats?.users || 0}</h3>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Agendamentos</p>
                      <h3 className="text-2xl font-serif font-black text-primary">{stats?.appointments || 0}</h3>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Table className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Serviços</p>
                      <h3 className="text-2xl font-serif font-black text-primary">{stats?.services || 0}</h3>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Cpu className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                  <Button 
                    variant="outline" 
                    className="w-full border-primary/20 hover:bg-primary/10 text-primary uppercase text-[10px] font-bold tracking-widest"
                    onClick={handleCheckAsaas}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Testar Conexão Asaas
                  </Button>

                  {asaasStatus && (
                    <div className={`p-3 rounded-lg flex items-center gap-3 ${asaasStatus.connected ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                      {asaasStatus.connected ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <div className="text-[10px] font-medium">
                        {asaasStatus.connected ? `Conectado: ${asaasStatus.name}` : `Erro: ${asaasStatus.message}`}
                      </div>
                    </div>
                  )}
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

            {/* Global Settings */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle>Configurações da Barbearia</CardTitle>
                <p className="text-sm text-muted-foreground">Dados exibidos no site e rodapé.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Barbearia</Label>
                  <Input
                    value={settings["barber_shop_name"] || ""}
                    onChange={(e) => saveSetting("barber_shop_name", e.target.value)}
                    placeholder="The Royal Cut"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (Somente Números)</Label>
                  <Input
                    value={settings["whatsapp_number"] || ""}
                    onChange={(e) => saveSetting("whatsapp_number", e.target.value)}
                    placeholder="11999999999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    value={settings["address"] || ""}
                    onChange={(e) => saveSetting("address", e.target.value)}
                    placeholder="Rua Principal, 123 - Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={settings["instagram_url"] || ""}
                    onChange={(e) => saveSetting("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/theroyalcut"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Maps URL</Label>
                  <Input
                    value={settings["google_maps_url"] || ""}
                    onChange={(e) => saveSetting("google_maps_url", e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Funcionamento</Label>
                  <Input
                    value={settings["business_hours"] || ""}
                    onChange={(e) => saveSetting("business_hours", e.target.value)}
                    placeholder="Seg a Sab: 9h–20h | Dom: Fechado"
                  />
                </div>
              </CardContent>
            </Card>
            </div>
        </TabsContent>

        <TabsContent value="chatbot" className="space-y-8">
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
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => {
                      const keyName = `gemini_api_key_${i}`;
                      return (
                        <div key={keyName} className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="password"
                              placeholder={`Gemini API Key ${i}`}
                              value={settings[keyName] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSettings(prev => ({ ...prev, [keyName]: val }));
                              }}
                              onBlur={(e) => {
                                // Apenas salva se houver valor, para evitar preenchimento indesejado
                                if (e.target.value.trim()) {
                                  saveSetting(keyName, e.target.value.trim());
                                }
                              }}
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleValidateKey(keyName, "gemini")}
                            disabled={validating[keyName] || !settings[keyName]}
                            className="shrink-0"
                          >
                            {validating[keyName] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button 
                            variant="secondary"
                            onClick={() => saveSetting(keyName, settings[keyName] || "")}
                            disabled={loading || !settings[keyName]}
                          >
                            Salvar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 pt-4 border-t border-border/40">
                  <Label>Groq Llama 3 (Fallback)</Label>
                  <div className="space-y-4">
                    {[1, 2].map((i) => {
                      const keyName = `groq_api_key_${i}`;
                      return (
                        <div key={keyName} className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="password"
                              placeholder={`Groq API Key ${i}`}
                              value={settings[keyName] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSettings(prev => ({ ...prev, [keyName]: val }));
                              }}
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  saveSetting(keyName, e.target.value.trim());
                                }
                              }}
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleValidateKey(keyName, "groq")}
                            disabled={validating[keyName] || !settings[keyName]}
                            className="shrink-0"
                          >
                            {validating[keyName] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button 
                            variant="secondary"
                            onClick={() => saveSetting(keyName, settings[keyName] || "")}
                            disabled={loading || !settings[keyName]}
                          >
                            Salvar
                          </Button>
                        </div>
                      );
                    })}
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

            <Card className="border-border/40 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle>🔬 Diagnóstico do Chatbot IA</CardTitle>
                    <p className="text-sm text-muted-foreground">Teste cada chave individualmente e simule uma conversa real</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Status das Chaves de API
                  </h4>
                  {[
                    { keyName: "gemini_api_key_1", label: "Gemini 1 — Principal" },
                    { keyName: "gemini_api_key_2", label: "Gemini 2 — Reserva" },
                    { keyName: "gemini_api_key_3", label: "Gemini 3 — Reserva 2" },
                    { keyName: "groq_api_key_1", label: "Groq Llama 1 — Fallback" },
                    { keyName: "groq_api_key_2", label: "Groq Llama 2 — Fallback 2" },
                  ].map(({ keyName, label }) => {
                    const st = keyStatuses[keyName];
                    const hasKey = Boolean(settings[keyName]);
                    return (
                      <div key={keyName} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{label}</span>
                            {st?.status === "ok" && <span className="text-[10px] text-green-500 font-bold uppercase">✅ OK ({st.responseTime}ms)</span>}
                            {st?.status === "error" && <span className="text-[10px] text-red-500 font-bold uppercase">❌ ERRO</span>}
                            {!st && <span className="text-[10px] text-muted-foreground italic">{hasKey ? "Não testada" : "Não cadastrada"}</span>}
                          </div>
                          {st?.message && <p className="text-[10px] text-white/60 mt-1">{st.message}</p>}
                        </div>
                        <Button onClick={() => handleTestKey(keyName)} disabled={testingKey[keyName] || !hasKey} className="text-xs h-8">
                          {testingKey[keyName] ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                          Testar
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Teste de Integração
                      </h4>
                      <p className="text-[10px] text-muted-foreground">Simula uma pergunta real passando por todo o fallback</p>
                    </div>
                    <Button onClick={handleTestFullChatbot} disabled={testingChatbot} className="bg-primary text-black">
                      {testingChatbot ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Testar Chatbot
                    </Button>
                  </div>

                  {chatbotTestResult && (
                    <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                      <p className="text-[10px] font-bold uppercase text-primary">{chatbotTestResult.success ? "✅ Resposta recebida:" : "❌ Erro:"}</p>
                      <div className="text-xs text-white/80 leading-relaxed italic p-3 rounded-lg bg-white/5 border border-white/5 italic">
                        {chatbotTestResult.response || chatbotTestResult.error}
                      </div>
                    </div>
                  )}
                </div>

                {lastLog && (
                  <Card className="bg-zinc-950 border-zinc-900 mt-6 overflow-hidden">
                    <div className="p-3 bg-zinc-900 flex items-center justify-between border-b border-zinc-800">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
                        <Terminal className="w-3 h-3 text-primary" /> Último Log de Execução
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-white/40">{lastLog.timestamp ? new Date(lastLog.timestamp).toLocaleString("pt-BR") : ""}</div>
                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${lastLog.success ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {lastLog.success ? "✅ SUCESSO" : "❌ FALHA"}
                        </div>
                      </div>

                      {lastLog.provider_used && <p className="text-xs font-bold text-primary">Provedor: {lastLog.provider_used}</p>}
                      
                      <div className="space-y-2">
                        {lastLog.keys_tried?.map((k: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-1">
                            <span className="text-white/60">#{i+1} {k.keyName}</span>
                            <span className={k.status === 'success' ? 'text-green-500' : 'text-red-500'}>{k.status} {k.responseTimeMs}ms</span>
                          </div>
                        ))}
                      </div>

                      {lastLog.error && <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-mono">{lastLog.error}</div>}
                      {lastLog.preview_response && <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/70 italic italic">"{lastLog.preview_response}"</div>}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

        </TabsContent>

        <TabsContent value="commission" className="space-y-6">
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
                <Label>Nome da Barbearia</Label>
                <Input
                  placeholder="Ex: The Royal Cut"
                  value={settings["barber_shop_name"] || ""}
                  onChange={(e) => saveSetting("barber_shop_name", e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Nome exibido no site, recibos e mensagens automáticas.
                </p>
              </div>
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
              <div className="grid gap-2">
                <Label>Instagram URL</Label>
                <Input
                  placeholder="https://instagram.com/suabarbearia"
                  value={settings["instagram_url"] || ""}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, ["instagram_url"]: e.target.value }));
                  }}
                  onBlur={(e) => saveSetting("instagram_url", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Google Maps URL</Label>
                <Input
                  placeholder="https://maps.google.com/..."
                  value={settings["google_maps_url"] || ""}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, ["google_maps_url"]: e.target.value }));
                  }}
                  onBlur={(e) => saveSetting("google_maps_url", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Horário de Funcionamento</Label>
                <Input
                  placeholder="Seg a Sab: 9h–20h | Dom: Fechado"
                  value={settings["business_hours"] || ""}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, ["business_hours"]: e.target.value }));
                  }}
                  onBlur={(e) => saveSetting("business_hours", e.target.value)}
                />
              </div>
              <Button onClick={handleSaveAll} className="bg-primary text-primary-foreground">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
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
        <TabsContent value="github" className="space-y-6">
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center gap-4">
              <RefreshCw className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Sincronização GitHub</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mantenha seu repositório atualizado com as mudanças do projeto.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <RefreshCw className={`w-8 h-8 ${syncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Status do Repositório</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Clique no botão abaixo para forçar a sincronização de todos os arquivos atuais para o repositório <strong>{REPO_NAME}</strong>.
                  </p>
                </div>
                <Button 
                  onClick={handleSyncGithub} 
                  disabled={syncing}
                  className="bg-primary text-black hover:bg-primary/90 min-w-[200px]"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar Agora
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                <p className="font-bold mb-1">Nota Técnica:</p>
                <p>A sincronização utiliza o Gateway Lovable para realizar commits diretos na branch <code>main</code>. Certifique-se de que sua conexão com o GitHub está ativa nas configurações do projeto.</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Histórico de Sincronização</h3>
                <div className="space-y-2">
                  {syncLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">Nenhum log encontrado.</p>
                  ) : (
                    syncLogs.map((log: any) => (
                      <div key={log.id} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-[11px]">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-bold uppercase tracking-tighter">{log.status === 'success' ? 'Sucesso' : 'Erro'}</span>
                            <span className="text-white/40">{new Date(log.created_at).toLocaleString()}</span>
                            {log.profiles?.full_name && (
                              <span className="text-primary/60 font-medium">Por: {log.profiles.full_name}</span>
                            )}
                          </div>
                          <p className="text-white/60 line-clamp-1 max-w-md">{log.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {log.details?.commit_message && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] uppercase font-bold">
                              {log.details.commit_message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
