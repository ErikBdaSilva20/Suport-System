import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase JS processa automaticamente o hash de recovery e emite PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

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
      toast({ title: 'Senha redefinida com sucesso' });
      navigate('/tickets', { replace: true });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            {ready ? 'Defina sua nova senha de acesso.' : 'Validando link de redefinição...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ready ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saving || !password || !confirm}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir senha
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
