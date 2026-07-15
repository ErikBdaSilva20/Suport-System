import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  agentEmail: string;
}

export function AdminPasswordDialog({ open, onOpenChange, agentId, agentName, agentEmail }: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setPassword(''); setConfirm(''); };

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast({ title: 'Senha muito curta', description: 'Mínimo 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: agentId, newPassword: password },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Senha redefinida', description: `Nova senha definida para ${agentEmail}.` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Definir nova senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{agentName}</strong> ({agentEmail}). Repasse por um canal seguro e peça a troca no próximo acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !password || !confirm}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Definir senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
