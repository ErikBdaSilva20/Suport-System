import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSettingsRepository } from '@/infrastructure/registries/settings';
import { UpdateSettingsUseCase } from '@/application/settings/UpdateSettingsUseCase';

const TIMEZONES = ['America/Sao_Paulo', 'America/Manaus', 'America/Bahia', 'America/Fortaleza', 'America/Belem', 'America/Cuiaba', 'America/Rio_Branco'];
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface Props { onSaved: () => void; }

export function CompanyStep({ onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [days, setDays] = useState<number[]>([1,2,3,4,5]);

  useEffect(() => {
    getSettingsRepository().get().then(s => {
      setCompanyName(s.companyName === 'Help Desk' ? '' : s.companyName);
      setSupportEmail(s.supportEmail === 'suporte@empresa.com' ? '' : s.supportEmail);
      setTimezone(s.timezone);
      setStart(s.businessHoursStart);
      setEnd(s.businessHoursEnd);
      setDays(s.businessDays?.length ? s.businessDays : [1,2,3,4,5]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggle = (d: number) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

  const save = async () => {
    if (!companyName.trim() || !supportEmail.trim() || days.length === 0) {
      toast({ title: 'Preencha empresa, e-mail e ao menos 1 dia útil', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await new UpdateSettingsUseCase().execute({
        companyName: companyName.trim(),
        supportEmail: supportEmail.trim(),
        timezone,
        businessHoursStart: start,
        businessHoursEnd: end,
        businessDays: days,
      });
      toast({ title: 'Dados da empresa salvos' });
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome da empresa</Label>
        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Minha Empresa" />
      </div>
      <div className="space-y-1.5">
        <Label>E-mail de suporte</Label>
        <Input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="suporte@empresa.com.br" />
      </div>
      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Início</Label>
          <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim</Label>
          <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Dias úteis</Label>
        <div className="flex flex-wrap gap-3">
          {DAY_LABELS.map((l, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={days.includes(i + 1)} onCheckedChange={() => toggle(i + 1)} />
              {l}
            </label>
          ))}
        </div>
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
