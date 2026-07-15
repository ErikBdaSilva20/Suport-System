import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SaveSLAPolicyUseCase } from '@/application/settings/SaveSLAPolicyUseCase';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

interface Props { onSaved: () => void; }

const DEFAULTS: Array<{ priority: TicketPriority; label: string; firstResponseMin: number; resolutionMin: number }> = [
  { priority: 'urgent', label: 'Urgente', firstResponseMin: 15, resolutionMin: 240 },
  { priority: 'high',   label: 'Alta',    firstResponseMin: 60, resolutionMin: 480 },
  { priority: 'medium', label: 'Média',   firstResponseMin: 240, resolutionMin: 1440 },
  { priority: 'low',    label: 'Baixa',   firstResponseMin: 480, resolutionMin: 2880 },
];

export function SLAStep({ onSaved }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const update = (i: number, field: 'firstResponseMin' | 'resolutionMin', val: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const save = async () => {
    setSaving(true);
    try {
      const uc = new SaveSLAPolicyUseCase();
      for (const r of rows) {
        await uc.execute({
          priority: r.priority,
          firstResponseMinutes: r.firstResponseMin,
          resolutionMinutes: r.resolutionMin,
        });
      }
      toast({ title: 'Políticas de SLA criadas' });
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina os tempos máximos de primeira resposta e resolução para cada prioridade (em minutos). Valores sugeridos já preenchidos.
      </p>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-2.5 text-muted-foreground font-medium">Prioridade</th>
              <th className="text-left p-2.5 text-muted-foreground font-medium">1ª Resposta (min)</th>
              <th className="text-left p-2.5 text-muted-foreground font-medium">Resolução (min)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.priority} className="border-b border-border last:border-0">
                <td className="p-2.5 font-medium text-foreground">{r.label}</td>
                <td className="p-2.5">
                  <Input type="number" min={1} className="w-24 h-8" value={r.firstResponseMin}
                    onChange={e => update(i, 'firstResponseMin', +e.target.value)} />
                </td>
                <td className="p-2.5">
                  <Input type="number" min={1} className="w-24 h-8" value={r.resolutionMin}
                    onChange={e => update(i, 'resolutionMin', +e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
