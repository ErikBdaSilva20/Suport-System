import { useState, useEffect } from 'react';
import { UserPlus, Loader2, Copy, Check, AlertTriangle, MoreHorizontal, Mail, KeyRound } from 'lucide-react';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { InviteAgentUseCase, type InviteMode } from '@/application/identity/InviteAgentUseCase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AdminPasswordDialog } from '@/components/team/AdminPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/domain/identity/value-objects/UserRole';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfileProps } from '@/domain/identity/entities/Profile';

export default function TeamSettings() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<ProfileProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('agent');
  const [inviteMode, setInviteMode] = useState<InviteMode>('email');
  const [inviting, setInviting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [passwordDialogAgent, setPasswordDialogAgent] = useState<ProfileProps | null>(null);
  const [sendingResetTo, setSendingResetTo] = useState<string | null>(null);

  const handleSendResetEmail = async (agent: ProfileProps) => {
    setSendingResetTo(agent.id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(agent.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Link enviado', description: `Enviamos um e-mail de redefinição para ${agent.email}.` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSendingResetTo(null);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  useEffect(() => {
    getProfileRepository().listAgents(false)
      .then(list => {
        setAgents(list.map(a => a.toPlainObject()));
        setLoading(false);
      })
      .catch(e => {
        console.error('[TeamSettings] listAgents failed:', e);
        setError(e.message ?? 'Erro ao carregar agentes');
        setLoading(false);
      });
  }, []);

  const handleToggleActive = async (agent: ProfileProps) => {
    try {
      await getProfileRepository().setActive(agent.id, !agent.isActive);
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, isActive: !a.isActive } : a));
      toast({ title: `Agente ${!agent.isActive ? 'ativado' : 'desativado'}` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const email = inviteEmail.trim();
      const result = await new InviteAgentUseCase().execute(email, 'Administrador', inviteRole, inviteMode);
      if (result.mode === 'manual' && result.tempPassword) {
        setCredentials({ email, password: result.tempPassword });
        setShowInvite(false);
        // recarrega lista
        getProfileRepository().listAgents(false).then(list => setAgents(list.map(a => a.toPlainObject())));
      } else {
        toast({ title: 'Convite enviado', description: `${email} (${inviteRole === 'admin' ? 'Admin' : 'Agente'})` });
        setShowInvite(false);
      }
      setInviteEmail('');
      setInviteRole('agent');
      setInviteMode('email');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  if (error) return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      <strong>Erro ao carregar equipe:</strong> {error}
      <p className="text-xs mt-1 text-muted-foreground">Verifique se as políticas RLS de profiles estão configuradas corretamente no Supabase.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground">Gerencie os agentes do sistema.</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Convidar Agente
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map(agent => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                        {agent.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{agent.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{agent.email}</TableCell>
                <TableCell>
                  <Badge variant={agent.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                    {agent.role === 'admin' ? 'Admin' : 'Agente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={agent.isActive} onCheckedChange={() => handleToggleActive(agent)} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {sendingResetTo === agent.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <MoreHorizontal className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSendResetEmail(agent)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar link de redefinição
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPasswordDialogAgent(agent)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Definir nova senha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {passwordDialogAgent && (
        <AdminPasswordDialog
          open={!!passwordDialogAgent}
          onOpenChange={(o) => { if (!o) setPasswordDialogAgent(null); }}
          agentId={passwordDialogAgent.id}
          agentName={passwordDialogAgent.fullName}
          agentEmail={passwordDialogAgent.email}
        />
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adicionar Agente</DialogTitle>
            <DialogDescription>Escolha como o novo agente vai receber o acesso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={inviteMode} onValueChange={(v) => setInviteMode(v as InviteMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Convidar por e-mail</TabsTrigger>
                <TabsTrigger value="manual">Criar e gerar senha</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {inviteMode === 'email'
                ? 'Enviamos um link por e-mail para o agente definir a própria senha.'
                : 'A conta é criada na hora com uma senha temporária. Você copia e repassa por outro canal (WhatsApp, pessoalmente etc.). O agente pode trocar a senha depois.'}
            </p>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@empresa.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              {inviteMode === 'email' ? 'Enviar Convite' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(open) => { if (!open) setCredentials(null); }}>
        <DialogContent className="bg-card border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Agente criado</DialogTitle>
            <DialogDescription>Copie as credenciais agora — a senha não será mostrada novamente.</DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Repasse esses dados por um canal seguro. Peça ao agente para trocar a senha em "Meu perfil" após o primeiro login.</span>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.email} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.email, 'email')}>
                    {copiedField === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Senha temporária</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.password} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.password, 'password')}>
                    {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => copyToClipboard(`E-mail: ${credentials.email}\nSenha: ${credentials.password}`, 'both')}
              >
                {copiedField === 'both' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar credenciais
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
