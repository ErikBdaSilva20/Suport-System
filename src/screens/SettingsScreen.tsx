import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { listSettings, createSettings, updateSettings } from '@/lib/data/settings.repo';
import type { AppSettings } from '@/lib/data/settings.repo';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsScreen() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#16a34a');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSettings()
      .then(rows => {
        const first = rows[0] ?? null;
        setSettings(first);
        if (first) {
          setCompanyName(first.company_name);
          setPrimaryColor(first.primary_color);
        }
      })
      .catch(e => toast({ title: 'Erro ao carregar configurações', description: e.message, variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings) {
        const updated = await updateSettings(settings.id, { company_name: companyName, primary_color: primaryColor });
        setSettings(updated);
      } else {
        const created = await createSettings({ company_name: companyName, primary_color: primaryColor });
        setSettings(created);
      }
      toast({ title: 'Configurações salvas' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências da sua central de atendimento</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="space-y-2">
          <Label>Nome da empresa</Label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Minha Empresa" />
        </div>
        <div className="space-y-2">
          <Label>Cor primária</Label>
          <div className="flex items-center gap-2">
            <Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-16 p-1" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="text-foreground font-medium mb-1">Equipe e papéis</p>
          <p>Promover um rep a manager ainda não tem uma rota própria no gateway — para o v1, isso é feito manualmente pelo administrador do tenant (console/banco). O primeiro usuário do tenant já vira admin automaticamente no cadastro.</p>
        </div>
      </div>
    </div>
  );
}
