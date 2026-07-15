import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getSettingsRepository } from '@/infrastructure/registries/settings';
import { UpdateSettingsUseCase } from '@/application/settings/UpdateSettingsUseCase';
import { getStorageService } from '@/infrastructure/registries/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppSettings } from '@/domain/settings/entities/AppSettings';

const TIMEZONES = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Bahia', 'America/Fortaleza',
  'America/Belem', 'America/Cuiaba', 'America/Rio_Branco',
];
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function GeneralSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettingsRepository().get().then(s => { setSettings(s); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const uc = new UpdateSettingsUseCase();
      const { id, ...rest } = settings;
      await uc.execute(rest);
      toast({ title: 'Configurações salvas' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const storage = getStorageService();
      const url = await storage.upload('company-assets', `logo-${Date.now()}.${file.name.split('.').pop()}`, file);
      setSettings({ ...settings, companyLogoUrl: url });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    }
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.businessDays.includes(day)
      ? settings.businessDays.filter(d => d !== day)
      : [...settings.businessDays, day].sort();
    setSettings({ ...settings, businessDays: days });
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label>Nome da empresa</Label>
        <Input value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {settings.companyLogoUrl && <img src={settings.companyLogoUrl} alt="Logo" className="h-10 w-10 rounded object-cover" />}
          <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>E-mail de suporte</Label>
        <Input type="email" value={settings.supportEmail} onChange={e => setSettings({ ...settings, supportEmail: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={settings.timezone} onValueChange={v => setSettings({ ...settings, timezone: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Horário início</Label>
          <Input type="time" value={settings.businessHoursStart} onChange={e => setSettings({ ...settings, businessHoursStart: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Horário fim</Label>
          <Input type="time" value={settings.businessHoursEnd} onChange={e => setSettings({ ...settings, businessHoursEnd: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dias úteis</Label>
        <div className="flex gap-3">
          {DAY_LABELS.map((label, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={settings.businessDays.includes(i + 1)} onCheckedChange={() => toggleDay(i + 1)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor primária</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={settings.primaryColor} onChange={e => setSettings({ ...settings, primaryColor: e.target.value })} className="h-9 w-9 rounded cursor-pointer" />
          <Input value={settings.primaryColor} onChange={e => setSettings({ ...settings, primaryColor: e.target.value })} className="w-32" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>URL base do aplicativo</Label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://meu-helpdesk.com"
            value={settings.appBaseUrl ?? ''}
            onChange={e => setSettings({ ...settings, appBaseUrl: e.target.value || null })}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setSettings({ ...settings, appBaseUrl: window.location.origin })}
          >
            Usar atual
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          URL absoluta usada nos links enviados em e-mails (CSAT, convites, notificações). Atual: <code>{window.location.origin}</code>
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar Configurações
      </Button>
    </div>
  );
}
