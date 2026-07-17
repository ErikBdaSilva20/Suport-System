import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/data/client';
import { Copy, Info, Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';

export default function SettingsScreen() {
  const { toast } = useToast();

  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const handleCreateEmployee = async () => {
    if (!employeeName.trim() || !employeeEmail.trim()) {
      toast({ title: 'Nome e e-mail são obrigatórios', variant: 'destructive' });
      return;
    }
    setCreatingEmployee(true);
    try {
      const result = await auth.adminCreateUser(
        employeeName.trim(),
        employeeEmail.trim(),
        'manager'
      );
      setCreatedCredential({
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
      });
      setEmployeeName('');
      setEmployeeEmail('');
      toast({ title: 'Funcionário criado', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar funcionário', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingEmployee(false);
    }
  };

  const handleCopyCredential = () => {
    if (!createdCredential) return;
    navigator.clipboard.writeText(
      `Email: ${createdCredential.email}\nSenha temporária: ${createdCredential.temporaryPassword}`
    );
    toast({ title: 'Copiado', variant: 'success' });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferências da sua central de atendimento
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Criar funcionário</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cria uma conta de manager com senha temporária — copie e envie pro funcionário por fora
            (WhatsApp, etc.), não é enviada por e-mail.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              placeholder="funcionario@empresa.com"
            />
          </div>
        </div>
        <Button onClick={handleCreateEmployee} disabled={creatingEmployee} className="gap-2">
          {creatingEmployee ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}{' '}
          Criar funcionário
        </Button>

        {createdCredential && (
          <Alert>
            <AlertTitle>Conta criada</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                <span className="text-muted-foreground">E-mail:</span> {createdCredential.email}
              </p>
              <p>
                <span className="text-muted-foreground">Senha temporária:</span>{' '}
                <code className="font-mono">{createdCredential.temporaryPassword}</code>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleCopyCredential}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-1 border-t border-border">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-3" />
          <p className="text-xs text-muted-foreground pt-2.5">
            Isso funciona neste ambiente local de testes. Em produção depende do tenant-gateway real
            oferecer o mesmo endpoint — até lá, promoção manual via console/banco é a alternativa
            (mesma limitação documentada na Story 6.3).
          </p>
        </div>
      </div>
    </div>
  );
}
