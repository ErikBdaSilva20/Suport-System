import { useState } from 'react';
import { Loader2, Send, Shield, Webhook, AtSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props { onSaved: () => void; }

export function ResendStep({ onSaved }: Props) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!apiKey.trim() && !webhookSecret.trim() && !fromEmail.trim()) {
      toast({ title: 'Informe ao menos a API Key e o Webhook Secret', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (webhookSecret.trim()) body.webhookSecret = webhookSecret.trim();
      if (fromEmail.trim()) body.fromEmail = fromEmail.trim();

      const r = await supabase.functions.invoke('save-resend-key', { body });
      if (r.error) throw r.error;
      if ((r.data as any)?.error) throw new Error((r.data as any).error);

      toast({ title: 'Resend configurado' });
      setApiKey(''); setWebhookSecret(''); setFromEmail('');
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O Help Desk usa o Resend tanto para <strong>enviar</strong> quanto para <strong>receber</strong> e-mails (via webhook <code>email.received</code>). Você pode trocar essas chaves depois em Configurações → Integrações.
      </p>

      <div className="space-y-1.5">
        <Label>Resend API Key</Label>
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="re_xxxxxxxxxxxxxxxxxxxx"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">Resend Dashboard → API Keys.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Webhook Signing Secret</Label>
        <div className="relative">
          <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            placeholder="whsec_xxxxxxxxxxxxxx"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Resend Dashboard → Webhooks → endpoint → Signing secret. Endpoint deve apontar para a função <code>resend-inbound-webhook</code> com o evento <code>email.received</code>.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>E-mail remetente (opcional)</Label>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value)}
            placeholder="no-reply@seudominio.com"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">Em domínio verificado no Resend. Se vazio, usa o e-mail de suporte.</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar e continuar
        </Button>
      </div>
    </div>
  );
}
