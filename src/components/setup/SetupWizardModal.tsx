import { useEffect, useMemo, useState } from 'react';
import { Building2, Send, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SetupStepper } from './SetupStepper';
import { CompanyStep } from './steps/CompanyStep';
import { ResendStep } from './steps/ResendStep';
import { SLAStep } from './steps/SLAStep';
import { AutomationStep } from './steps/AutomationStep';
import type { SetupPending } from '@/presentation/hooks/setup/useSetupStatus';

interface Props {
  open: boolean;
  pending: SetupPending;
  onSkip: () => void;
  onRefetch: () => Promise<void>;
  onComplete: () => void;
}

const STEP_META = [
  { key: 'general', label: 'Empresa', icon: Building2 },
  { key: 'resend', label: 'E-mail (Resend)', icon: Send },
  { key: 'sla', label: 'SLA', icon: Clock },
  { key: 'automation', label: 'Automação', icon: Sparkles },
] as const;

export function SetupWizardModal({ open, pending, onSkip, onRefetch, onComplete }: Props) {
  const dones = useMemo(() => ({
    general: !pending.general,
    resend: !pending.resend,
    sla: !pending.sla,
    automation: !pending.automation,
  }), [pending]);

  const allDone = dones.general && dones.resend && dones.sla && dones.automation;

  // Start at first pending step
  const firstPendingIdx = STEP_META.findIndex(s => pending[s.key as keyof SetupPending]);
  const [current, setCurrent] = useState(firstPendingIdx === -1 ? 0 : firstPendingIdx);

  useEffect(() => {
    if (open) {
      const idx = STEP_META.findIndex(s => pending[s.key as keyof SetupPending]);
      setCurrent(idx === -1 ? STEP_META.length - 1 : idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stepDefs = STEP_META.map(s => ({
    key: s.key,
    label: s.label,
    done: dones[s.key as keyof typeof dones],
  }));

  const handleSaved = async () => {
    await onRefetch();
    // Move to next pending step
    const nextIdx = STEP_META.findIndex((s, i) => i > current && pending[s.key as keyof SetupPending]);
    // After refetch, pending state will update; advance optimistically
    if (current < STEP_META.length - 1) {
      setCurrent(nextIdx === -1 ? Math.min(current + 1, STEP_META.length - 1) : nextIdx);
    }
  };

  const StepIcon = STEP_META[current].icon;

  return (
    <Dialog open={open} onOpenChange={() => { /* não-fechável */ }}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // hide default close X
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="h-5 w-5 text-primary" />
            Configuração inicial
          </DialogTitle>
          <DialogDescription>
            Complete os passos abaixo para liberar todos os recursos. Você pode adiar agora, mas o assistente reabrirá no próximo login.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <SetupStepper steps={stepDefs} current={current} onJump={setCurrent} />
        </div>

        <div className="min-h-[280px]">
          {allDone ? (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-status-resolved" />
              <h3 className="text-lg font-semibold text-foreground">Tudo configurado!</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Sua central está pronta para receber e responder tickets automaticamente.
              </p>
              <Button onClick={onComplete} className="mt-2">Ir para o Dashboard</Button>
            </div>
          ) : current === 0 ? (
            dones.general
              ? <DoneNotice label="Dados da empresa já configurados" onNext={() => setCurrent(1)} />
              : <CompanyStep onSaved={handleSaved} />
          ) : current === 1 ? (
            dones.resend
              ? <DoneNotice label="Resend já configurado" onNext={() => setCurrent(2)} />
              : <ResendStep onSaved={handleSaved} />
          ) : current === 2 ? (
            dones.sla
              ? <DoneNotice label="Políticas de SLA já criadas" onNext={() => setCurrent(3)} />
              : <SLAStep onSaved={handleSaved} />
          ) : (
            dones.automation
              ? <DoneNotice label="Regras de automação já criadas" onNext={onComplete} nextLabel="Concluir" />
              : <AutomationStep onSaved={handleSaved} />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Configurar depois
          </Button>
          <div className="flex gap-2">
            {current > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCurrent(c => Math.max(0, c - 1))}>
                Voltar
              </Button>
            )}
            {current < STEP_META.length - 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrent(c => Math.min(STEP_META.length - 1, c + 1))}
              >
                Próximo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DoneNotice({ label, onNext, nextLabel = 'Próximo' }: { label: string; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
      <CheckCircle2 className="h-10 w-10 text-status-resolved" />
      <p className="text-sm text-foreground">{label}</p>
      <Button size="sm" onClick={onNext}>{nextLabel}</Button>
    </div>
  );
}
