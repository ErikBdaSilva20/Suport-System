import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Shield, Webhook, Loader2, AtSign, Ticket, Globe, Mail, Key } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function IntegrationsSettings() {
  // Resend
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState<string | null>(null);
  const [maskedWebhookSecret, setMaskedWebhookSecret] = useState<string | null>(null);
  const [currentFromEmail, setCurrentFromEmail] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);

  // Zendesk API
  const [zSubdomain, setZSubdomain] = useState('');
  const [zAgentEmail, setZAgentEmail] = useState('');
  const [zApiToken, setZApiToken] = useState('');
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(null);
  const [currentAgentEmail, setCurrentAgentEmail] = useState<string | null>(null);
  const [maskedApiToken, setMaskedApiToken] = useState<string | null>(null);
  const [savingApi, setSavingApi] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('settings')
        .select('resend_api_key_masked, resend_webhook_secret_masked, resend_from_email, support_email, zendesk_subdomain, zendesk_agent_email, zendesk_api_token_masked')
        .limit(1)
        .single();
      if (data) {
        const d = data as any;
        setMaskedApiKey(d.resend_api_key_masked ?? null);
        setMaskedWebhookSecret(d.resend_webhook_secret_masked ?? null);
        setCurrentFromEmail(d.resend_from_email ?? null);
        setSupportEmail(d.support_email ?? null);
        if (d.resend_from_email) setFromEmail(d.resend_from_email);

        setCurrentSubdomain(d.zendesk_subdomain ?? null);
        setCurrentAgentEmail(d.zendesk_agent_email ?? null);
        setMaskedApiToken(d.zendesk_api_token_masked ?? null);
        if (d.zendesk_subdomain) setZSubdomain(d.zendesk_subdomain);
        if (d.zendesk_agent_email) setZAgentEmail(d.zendesk_agent_email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const body: Record<string, string> = {};
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();
    if (fromEmail.trim() && fromEmail.trim().toLowerCase() !== (currentFromEmail ?? '').toLowerCase()) {
      body.fromEmail = fromEmail.trim();
    }
    if (Object.keys(body).length === 0) { toast.info('Nada para salvar.'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-resend-key', { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Resend salvo.');
      setApiKey(''); setWebhookSecret('');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleSaveApi() {
    const body: Record<string, string> = {};
    if (zSubdomain.trim() && zSubdomain.trim() !== (currentSubdomain ?? '')) body.subdomain = zSubdomain.trim();
    if (zAgentEmail.trim() && zAgentEmail.trim().toLowerCase() !== (currentAgentEmail ?? '').toLowerCase()) body.agentEmail = zAgentEmail.trim();
    if (zApiToken.trim()) body.apiToken = zApiToken.trim();
    if (Object.keys(body).length === 0) { toast.info('Nada para salvar.'); return; }
    setSavingApi(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-zendesk-secret', { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Credenciais da API salvas.');
      setZApiToken('');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally { setSavingApi(false); }
  }

  const apiKeyConfigured = !!maskedApiKey;
  const resendWebhookConfigured = !!maskedWebhookSecret;
  const fullyConfigured = apiKeyConfigured && resendWebhookConfigured;
  const canSave = (!!apiKey.trim() || !!webhookSecret.trim() ||
    (fromEmail.trim() && fromEmail.trim().toLowerCase() !== (currentFromEmail ?? '').toLowerCase())) && !saving;

  const apiConfigured = !!currentSubdomain && !!currentAgentEmail && !!maskedApiToken;
  const canSaveApi = (zSubdomain.trim() && zSubdomain.trim() !== (currentSubdomain ?? '')) ||
    (zAgentEmail.trim() && zAgentEmail.trim().toLowerCase() !== (currentAgentEmail ?? '').toLowerCase()) ||
    !!zApiToken.trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RESEND */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Resend</CardTitle>
                <CardDescription>Envio de e-mails (notificações, respostas, CSAT)</CardDescription>
              </div>
            </div>
            <Badge variant={fullyConfigured ? 'default' : 'secondary'}>
              {fullyConfigured ? 'Configurado' : apiKeyConfigured || resendWebhookConfigured ? 'Parcial' : 'Não configurado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {(apiKeyConfigured || resendWebhookConfigured || currentFromEmail) && (
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              {apiKeyConfigured && <p><span className="text-muted-foreground">API Key:</span> <code className="text-foreground">{maskedApiKey}</code></p>}
              {resendWebhookConfigured && <p><span className="text-muted-foreground">Webhook Secret:</span> <code className="text-foreground">{maskedWebhookSecret}</code></p>}
              {currentFromEmail && <p><span className="text-muted-foreground">Remetente:</span> <code className="text-foreground">{currentFromEmail}</code></p>}
              {supportEmail && <p><span className="text-muted-foreground">E-mail de suporte:</span> <code className="text-foreground">{supportEmail}</code></p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="resend-key">Resend API Key</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="resend-key" type="password" placeholder={apiKeyConfigured ? 'Deixe em branco para manter a atual' : 're_xxxxxxxxxxxxxxxxxxxx'} value={apiKey} onChange={e => setApiKey(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-webhook">Webhook Signing Secret</Label>
            <div className="relative">
              <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="resend-webhook" type="password" placeholder={resendWebhookConfigured ? 'Deixe em branco para manter o atual' : 'whsec_xxxxxxxxxxxxxxxx'} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-from">E-mail remetente (opcional)</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="resend-from" type="email" placeholder={supportEmail || 'no-reply@seudominio.com'} value={fromEmail} onChange={e => setFromEmail(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Button disabled={!canSave} onClick={handleSave} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {fullyConfigured ? 'Atualizar credenciais' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      {/* ZENDESK API */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Zendesk (API)</CardTitle>
                <CardDescription>Credenciais para puxar tickets do Zendesk via API</CardDescription>
              </div>
            </div>
            <Badge variant={apiConfigured ? 'default' : 'secondary'}>
              {apiConfigured ? 'Configurado' : 'Não configurado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Após salvar as credenciais, use o botão <strong>Atualizar Tickets</strong> na tela de Tickets para sincronizar os chamados do dia sob demanda.
          </p>

          {apiConfigured && (
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Subdomínio:</span> <code className="text-foreground">{currentSubdomain}.zendesk.com</code></p>
              <p><span className="text-muted-foreground">Agente:</span> <code className="text-foreground">{currentAgentEmail}</code></p>
              <p><span className="text-muted-foreground">API Token:</span> <code className="text-foreground">{maskedApiToken}</code></p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="z-subdomain">Subdomínio do Zendesk</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="z-subdomain" placeholder="suaempresa" value={zSubdomain} onChange={e => setZSubdomain(e.target.value)} className="pl-9" />
              </div>
              <p className="text-[11px] text-muted-foreground">https://<strong>subdomínio</strong>.zendesk.com</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="z-email">E-mail do Agente</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="z-email" type="email" placeholder="agente@empresa.com" value={zAgentEmail} onChange={e => setZAgentEmail(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="z-token">Token da API</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="z-token" type="password" placeholder={maskedApiToken ? 'Deixe em branco para manter o atual' : 'API Token do Zendesk'} value={zApiToken} onChange={e => setZApiToken(e.target.value)} className="pl-9" />
              </div>
              <p className="text-[11px] text-muted-foreground">Zendesk Admin Center → Apps and integrations → APIs → Zendesk API → Settings → API tokens.</p>
            </div>
          </div>

          <Button disabled={!canSaveApi || savingApi} onClick={handleSaveApi} className="w-full sm:w-auto">
            {savingApi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {apiConfigured ? 'Atualizar credenciais da API' : 'Salvar credenciais da API'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
