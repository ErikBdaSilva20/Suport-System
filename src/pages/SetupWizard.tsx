import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Building2, Clock, Rocket } from 'lucide-react';
import { SaveSLAPolicyUseCase } from '@/application/settings/SaveSLAPolicyUseCase';
import { UpdateSettingsUseCase } from '@/application/settings/UpdateSettingsUseCase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SLA = [
  { priority: 'urgent' as const, firstResponse: 1, resolution: 4 },
  { priority: 'high' as const, firstResponse: 4, resolution: 8 },
  { priority: 'medium' as const, firstResponse: 8, resolution: 24 },
  { priority: 'low' as const, firstResponse: 24, resolution: 72 },
];

const PRIORITY_LABELS: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };

const TOTAL_STEPS = 4;

export default function SetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [slaConfig, setSlaConfig] = useState(DEFAULT_SLA);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSla, setSavingSla] = useState(false);

  const updateSla = (idx: number, field: 'firstResponse' | 'resolution', val: number) => {
    setSlaConfig(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      const settingsUC = new UpdateSettingsUseCase();
      await settingsUC.execute({
        companyName: companyName || 'Minha Empresa',
        supportEmail: supportEmail || 'suporte@empresa.com',
      });
      setStep(2);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingCompany(false);
    }
  };

  const saveSla = async () => {
    setSavingSla(true);
    try {
      const slaUC = new SaveSLAPolicyUseCase();
      for (const s of slaConfig) {
        await slaUC.execute({ priority: s.priority, firstResponseMinutes: s.firstResponse * 60, resolutionMinutes: s.resolution * 60 });
      }
      setStep(3);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingSla(false);
    }
  };

  const finish = () => {
    toast({ title: 'Configuração concluída!' });
    navigate('/dashboard');
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-4">
      <Rocket className="h-16 w-16 mx-auto text-primary" />
      <h2 className="text-2xl font-bold text-foreground">Bem-vindo ao HelpDesk!</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Vamos configurar sua central em poucos passos.
      </p>
      <Button onClick={() => setStep(1)} className="gap-2">Começar <ArrowRight className="h-4 w-4" /></Button>
    </div>,

    // Step 1: Company
    <div key="company" className="space-y-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
        <h2 className="text-xl font-bold text-foreground">Sua Empresa</h2>
      </div>
      <div className="space-y-2">
        <Label>Nome da empresa</Label>
        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Minha Empresa" />
      </div>
      <div className="space-y-2">
        <Label>E-mail de suporte</Label>
        <Input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="suporte@empresa.com" />
      </div>
      <div className="flex justify-end">
        <Button onClick={saveCompany} disabled={savingCompany} className="gap-2">
          Próximo <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>,

    // Step 2: SLA
    <div key="sla" className="space-y-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <Clock className="h-12 w-12 mx-auto text-primary mb-2" />
        <h2 className="text-xl font-bold text-foreground">Políticas de SLA</h2>
        <p className="text-sm text-muted-foreground">Defina os tempos de resposta em horas</p>
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
            {slaConfig.map((s, i) => (
              <tr key={s.priority} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">{PRIORITY_LABELS[s.priority]}</td>
                <td className="p-3"><Input type="number" min={1} value={s.firstResponse} onChange={e => updateSla(i, 'firstResponse', +e.target.value)} className="w-20" /></td>
                <td className="p-3"><Input type="number" min={1} value={s.resolution} onChange={e => updateSla(i, 'resolution', +e.target.value)} className="w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button onClick={saveSla} disabled={savingSla} className="gap-2">
          Próximo <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>,

    // Step 3: Done
    <div key="done" className="text-center space-y-4">
      <div className="h-16 w-16 mx-auto rounded-full bg-sla-ok/20 flex items-center justify-center">
        <Check className="h-8 w-8 text-sla-ok" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Tudo Pronto!</h2>
      <p className="text-muted-foreground">Sua central de atendimento está configurada.</p>
      <Button onClick={finish} className="gap-2">Ir para o Dashboard <ArrowRight className="h-4 w-4" /></Button>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl">
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-2 w-10 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>
        {steps[step]}
      </div>
    </div>
  );
}
