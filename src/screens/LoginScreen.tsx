import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/data/client';
import { createCustomer } from '@/lib/data/customers.repo';
import { ArrowLeft, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type View = 'login' | 'customer-signup' | 'admin-setup';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch } = useAuth();
  const [view, setView] = useState<View>('login');
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.signIn(loginEmail, loginPassword);
      await refetch();
      navigate('/tickets');
    } catch (err) {
      toast({
        title: 'Erro ao entrar',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.signUp(signupEmail, signupPassword, signupName);
      await refetch();
      navigate('/tickets');
    } catch (err) {
      toast({
        title: 'Erro ao cadastrar',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.signUp(customerEmail, customerPassword, customerName, { intent: 'customer' });
      await refetch();
      await createCustomer({
        name: customerName,
        phone_e164: customerPhone,
        email: customerEmail,
      });
      navigate('/tickets');
    } catch (err) {
      toast({
        title: 'Erro ao cadastrar',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 -ml-2"
      onClick={() => setView('login')}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
    </Button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-2xl font-bold text-foreground">HelpDesk</CardTitle>
          <CardDescription>
            {view === 'login' && 'Acesse o painel de atendimento'}
            {view === 'customer-signup' && 'Cadastre-se para abrir um chamado'}
            {view === 'admin-setup' && 'Configure a conta de administrador'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-4">
          {view === 'login' && (
            <>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                </Button>
              </form>

              <div className="space-y-2 pt-2 text-center">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setView('customer-signup')}
                >
                  Sou cliente, quero abrir um chamado
                </button>
                <p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setView('admin-setup')}
                  >
                    Primeiro acesso? Configurar administrador
                  </button>
                </p>
              </div>
            </>
          )}

          {view === 'customer-signup' && (
            <>
              {backToLogin}
              <form className="space-y-4" onSubmit={handleCustomerSignup}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <PhoneInput
                    placeholder="Telefone (WhatsApp)"
                    value={customerPhone}
                    onChange={setCustomerPhone}
                    required
                    className="pl-4 pr-10"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Senha (mín. 8 caracteres)"
                    value={customerPassword}
                    onChange={(e) => setCustomerPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-4 pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Seu telefone é como o suporte vai entrar em contato pelo WhatsApp.
                </p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </>
          )}

          {view === 'admin-setup' && (
            <>
              {backToLogin}
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="pl-4 pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Senha (mín. 8 caracteres)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-4 pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Só funciona pro primeiro acesso do tenant — ele vira administrador
                  automaticamente. Depois disso, novos funcionários são criados pelo administrador
                  em Configurações.
                </p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta de
                  administrador
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
