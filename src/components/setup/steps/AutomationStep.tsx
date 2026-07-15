import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ManagePriorityRulesUseCase } from '@/application/settings/ManagePriorityRulesUseCase';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

interface Props { onSaved: () => void; }

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};

export function AutomationStep({ onSaved }: Props) {
  const { toast } = useToast();
  const [priority, setPriority] = useState<TicketPriority>('urgent');
  const [intent, setIntent] = useState('Cliente relata que o sistema está completamente fora do ar para todos os usuários.');
  const [keywordsInput, setKeywordsInput] = useState('fora do ar, sistema caiu, não funciona, urgente');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!intent.trim()) {
      toast({ title: 'Descreva a intenção da regra', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const keywords = keywordsInput.split(/[,\n]/).map(k => k.trim()).filter(Boolean);
      await new ManagePriorityRulesUseCase().save({
        priority,
        keywords,
        intentDescription: intent.trim(),
        isActive: true,
        sortOrder: 0,
      });
      toast({ title: 'Regra de automação criada' });
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
        Crie pelo menos uma regra para a IA priorizar tickets. Você pode adicionar mais regras depois em Configurações → Automação.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prioridade alvo</Label>
          <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['urgent', 'high', 'medium', 'low'] as TicketPriority[]).map(p => (
                <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição da intenção</Label>
        <Textarea value={intent} onChange={e => setIntent(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Palavras-chave (vírgula ou Enter)</Label>
        <Textarea value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar e concluir
        </Button>
      </div>
    </div>
  );
}
