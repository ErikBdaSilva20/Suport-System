import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePriorityRules } from '@/presentation/hooks/settings/usePriorityRules';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { PriorityRule } from '@/domain/settings/entities/PriorityRule';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};

const PRIORITY_TONE: Record<TicketPriority, string> = {
  low: 'bg-status-resolved/15 text-status-resolved border-status-resolved/30',
  medium: 'bg-primary/15 text-primary border-primary/30',
  high: 'bg-status-pending/15 text-status-pending border-status-pending/30',
  urgent: 'bg-destructive/15 text-destructive border-destructive/30',
};

interface AutomationFlags {
  ai_classify_priority: boolean;
  ai_auto_first_response: boolean;
  ai_priority_min_confidence: number;
}

export default function AutomationSettings() {
  const { toast } = useToast();
  const { data: rules, isLoading, save, remove } = usePriorityRules();
  const [flags, setFlags] = useState<AutomationFlags | null>(null);
  const [savingFlag, setSavingFlag] = useState(false);
  const [editing, setEditing] = useState<Partial<PriorityRule> | null>(null);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  const openEditor = (rule: Partial<PriorityRule>) => {
    setEditing(rule);
    setKeywordsInput((rule.keywords ?? []).join(', '));
  };

  const closeEditor = () => {
    setEditing(null);
    setKeywordsInput('');
  };

  useEffect(() => {
    supabase.from('settings').select('id, ai_classify_priority, ai_auto_first_response, ai_priority_min_confidence' as any).limit(1).single()
      .then(({ data }) => {
        if (data) setFlags({
          ai_classify_priority: (data as any).ai_classify_priority,
          ai_auto_first_response: (data as any).ai_auto_first_response,
          ai_priority_min_confidence: Number((data as any).ai_priority_min_confidence),
        });
      });
  }, []);

  const updateFlag = async (changes: Partial<AutomationFlags>) => {
    if (!flags) return;
    setSavingFlag(true);
    const next = { ...flags, ...changes };
    setFlags(next);
    const { data: row } = await supabase.from('settings').select('id').limit(1).single();
    if (row) {
      const { error } = await supabase.from('settings').update(changes as any).eq('id', row.id);
      if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
    setSavingFlag(false);
  };

  const handleSaveRule = async () => {
    if (!editing) return;
    if (!editing.priority || !(editing.intentDescription ?? '').trim()) {
      toast({ title: 'Preencha prioridade e descrição da intenção', variant: 'destructive' });
      return;
    }
    setSavingRule(true);
    try {
      const keywords = keywordsInput.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
      await save({
        id: editing.id,
        priority: editing.priority as TicketPriority,
        keywords,
        intentDescription: editing.intentDescription ?? '',
        isActive: editing.isActive ?? true,
        sortOrder: editing.sortOrder ?? rules.length,
      });
      closeEditor();
      toast({ title: 'Regra salva' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar regra', description: e.message, variant: 'destructive' });
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Automações com IA
          </CardTitle>
          <CardDescription>Configure como a IA atua quando um chamado é criado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!flags ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Classificar prioridade automaticamente</Label>
                  <p className="text-xs text-muted-foreground">A IA lê o chamado e ajusta a prioridade conforme as regras abaixo.</p>
                </div>
                <Switch
                  checked={flags.ai_classify_priority}
                  disabled={savingFlag}
                  onCheckedChange={(v) => updateFlag({ ai_classify_priority: v })}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm">Enviar primeira resposta automática via IA</Label>
                  <p className="text-xs text-muted-foreground">Se houver artigo na base de conhecimento, a IA responde com um passo a passo. Caso contrário, envia confirmação com prazo de SLA.</p>
                </div>
                <Switch
                  checked={flags.ai_auto_first_response}
                  disabled={savingFlag}
                  onCheckedChange={(v) => updateFlag({ ai_auto_first_response: v })}
                />
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-sm">Confiança mínima para alterar prioridade</Label>
                  <p className="text-xs text-muted-foreground">Entre 0 e 1. Se a IA tiver confiança abaixo desse valor, a prioridade não é alterada.</p>
                </div>
                <Input
                  type="number" min={0} max={1} step={0.05}
                  className="w-24"
                  value={flags.ai_priority_min_confidence}
                  onChange={(e) => setFlags({ ...flags, ai_priority_min_confidence: Number(e.target.value) })}
                  onBlur={() => updateFlag({ ai_priority_min_confidence: flags.ai_priority_min_confidence })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Regras de Priorização</CardTitle>
            <CardDescription>Palavras-chave e intenções que a IA usa para decidir a prioridade.</CardDescription>
          </div>
          <Button size="sm" onClick={() => openEditor({ priority: 'medium', keywords: [], intentDescription: '', isActive: true, sortOrder: rules.length })}>
            <Plus className="h-4 w-4 mr-1" /> Nova regra
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma regra cadastrada. A IA usará apenas o bom senso.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-md border border-border bg-card">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={PRIORITY_TONE[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
                    {!r.isActive && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-foreground">{r.intentDescription || <em className="text-muted-foreground">(sem descrição)</em>}</p>
                  {r.keywords.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {r.keywords.map((k) => (
                        <span key={k} className="text-[11px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditor(r)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">{editing.id ? 'Editar regra' : 'Nova regra'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={editing.priority}
                  onValueChange={(v) => setEditing({ ...editing, priority: v as TicketPriority })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  checked={editing.isActive ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, isActive: v })}
                />
                <Label className="text-sm">Ativa</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição da intenção</Label>
              <Textarea
                placeholder="Ex.: Cliente relata que o sistema está completamente fora do ar para todos os usuários."
                value={editing.intentDescription ?? ''}
                onChange={(e) => setEditing({ ...editing, intentDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Palavras-chave (separadas por vírgula ou Enter)</Label>
              <Textarea
                placeholder="fora do ar, sistema caiu, não funciona"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditor}>Cancelar</Button>
              <Button onClick={handleSaveRule} disabled={savingRule}>
                {savingRule && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
