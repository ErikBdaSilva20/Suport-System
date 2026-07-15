import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, User, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LoginSignupForm = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupAllowed, setSignupAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.functions.invoke('check-signup-allowed')
      .then(({ data }) => {
        const allowed = !!(data as { allowed?: boolean } | null)?.allowed;
        setSignupAllowed(allowed);
        if (allowed) setTab('signup');
      })
      .catch(() => setSignupAllowed(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: unknown) {
      toast({ title: 'Erro ao entrar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: signupName },
        },
      });
      if (error) throw error;
      toast({
        title: 'Conta criada!',
        description: 'Você é o administrador da plataforma. Verifique seu email se solicitado e entre.',
      });
      setTab('login');
      setLoginEmail(signupEmail);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast({
        title: 'Erro ao cadastrar',
        description: msg.includes('Signup disabled')
          ? 'Cadastro desabilitado. Solicite um convite ao administrador.'
          : msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-surface-1 p-4">
      <Card className="w-full max-w-md shadow-elevation-4 border-border rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-6 pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            {signupAllowed ? 'Bem-vindo' : 'Login'}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            {signupAllowed
              ? 'Crie a conta de administrador da plataforma'
              : 'Acesse o painel de atendimento'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          {signupAllowed === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : signupAllowed ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                <TabsTrigger value="login">Entrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signup" className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Você será o <strong>administrador</strong> da plataforma. Os próximos usuários só entrarão por convite.</span>
                </div>
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="relative">
                    <Input type="text" placeholder="Nome completo" value={signupName} onChange={(e) => setSignupName(e.target.value)} required className="pl-4 pr-10 py-6 bg-secondary border-border rounded-xl" />
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <Input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="pl-4 pr-10 py-6 bg-secondary border-border rounded-xl" />
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} className="pl-4 pr-10 py-6 bg-secondary border-border rounded-xl" />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                  <Button type="submit" className="w-full py-6 rounded-xl text-base font-semibold" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Criando...</> : 'Criar conta de admin'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <LoginFields email={loginEmail} setEmail={setLoginEmail} password={loginPassword} setPassword={setLoginPassword} loading={loading} onSubmit={handleLogin} />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <LoginFields email={loginEmail} setEmail={setLoginEmail} password={loginPassword} setPassword={setLoginPassword} loading={loading} onSubmit={handleLogin} />
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Cadastro apenas por convite. Contate o administrador.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function LoginFields({ email, setEmail, password, setPassword, loading, onSubmit }: {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  loading: boolean; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-4">
        <div className="relative">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-4 pr-10 py-6 bg-secondary border-border rounded-xl" />
          <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="relative">
          <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-4 pr-10 py-6 bg-secondary border-border rounded-xl" />
          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <Button type="submit" className="w-full py-6 rounded-xl text-base font-semibold" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Entrando...</> : 'Entrar'}
      </Button>
    </form>
  );
}

export default LoginSignupForm;
