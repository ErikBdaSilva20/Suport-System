import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSLAPolicies } from '@/presentation/hooks/settings/useSLAPolicies';
import { SaveSLAPolicyUseCase } from '@/application/settings/SaveSLAPolicyUseCase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

const PRIORITY_LABELS: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };
const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];

export default function SLASettings() {
  const { data: policies, isLoading, refetch } = useSLAPolicies();
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<string, { firstResponse: number; resolution: number }>>({});
  const [saving, setSaving] = useState(false);

  const getValue = (priority: TicketPriority, field: 'firstResponse' | 'resolution'): number => {
    if (edits[priority]?.[field] !== undefined) return edits[priority][field];
    const policy = policies.find(p => p.priority === priority);
    if (!policy) return field === 'firstResponse' ? 8 : 24;
    return field === 'firstResponse' ? policy.firstResponseMinutes / 60 : policy.resolutionMinutes / 60;
  };

  const setEdit = (priority: TicketPriority, field: 'firstResponse' | 'resolution', val: number) => {
    setEdits(prev => ({
      ...prev,
      [priority]: { ...prev[priority], firstResponse: getValue(priority, 'firstResponse'), resolution: getValue(priority, 'resolution'), [field]: val },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uc = new SaveSLAPolicyUseCase();
      for (const priority of PRIORITIES) {
        const existing = policies.find(p => p.priority === priority);
        const fr = getValue(priority, 'firstResponse');
        const res = getValue(priority, 'resolution');
        await uc.execute({
          ...(existing ? { id: existing.id } : {}),
          priority,
          firstResponseMinutes: fr * 60,
          resolutionMinutes: res * 60,
        });
      }
      setEdits({});
      await refetch();
      toast({ title: 'Políticas de SLA salvas' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Políticas de SLA</h2>
        <p className="text-sm text-muted-foreground">Defina os tempos de resposta e resolução em horas por prioridade.</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Prioridade</th>
              <th className="text-left p-3 text-muted-foreground font-medium">1ª Resposta (h)</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Resolução (h)</th>
            </tr>
          </thead>
          <tbody>
            {PRIORITIES.map(p => (
              <tr key={p} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">{PRIORITY_LABELS[p]}</td>
                <td className="p-3">
                  <Input type="number" min={0.5} step={0.5} value={getValue(p, 'firstResponse')} onChange={e => setEdit(p, 'firstResponse', +e.target.value)} className="w-20" />
                </td>
                <td className="p-3">
                  <Input type="number" min={0.5} step={0.5} value={getValue(p, 'resolution')} onChange={e => setEdit(p, 'resolution', +e.target.value)} className="w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar SLA
      </Button>
    </div>
  );
}
