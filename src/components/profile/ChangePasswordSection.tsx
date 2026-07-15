import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function ChangePasswordSection() {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast({ title: 'Senha muito curta', description: 'Use no mínimo 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Senha atualizada com sucesso' });
      setPassword('');
      setConfirm('');
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar senha', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança</CardTitle>
        <CardDescription>Altere sua senha de acesso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving || !password || !confirm}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alterar senha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
