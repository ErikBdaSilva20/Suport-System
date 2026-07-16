import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Phone } from 'lucide-react';
import { auth } from '@/lib/data/client';
import { createCustomer } from '@/lib/data/customers.repo';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup' | 'customer'>('login');
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
      toast({ title: 'Erro ao entrar', description: (err as Error).message, variant: 'destructive' });
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
      toast({ title: 'Erro ao cadastrar', description: (err as Error).message, variant: 'destructive' });
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
        phone_e164: customerPhone.replace(/\D/g, ''),
        email: customerEmail,
      });
      navigate('/tickets');
    } catch (err) {
      toast({ title: 'Erro ao cadastrar', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-2xl font-bold text-foreground">HelpDesk</CardTitle>
          <CardDescription>Acesse o painel de atendimento</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Tabs value={tab} onValueChange={v => setTab(v as 'login' | 'signup' | 'customer')}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Equipe</TabsTrigger>
              <TabsTrigger value="customer">Sou cliente</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="relative">
                  <Input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="pl-4 pr-10" />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="password" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="pl-4 pr-10" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="relative">
                  <Input type="text" placeholder="Nome completo" value={signupName} onChange={e => setSignupName(e.target.value)} required className="pl-4 pr-10" />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="email" placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required className="pl-4 pr-10" />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="password" placeholder="Senha (mín. 8 caracteres)" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={8} className="pl-4 pr-10" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">O primeiro cadastro vira administrador automaticamente. Depois do 1º acesso, novos funcionários são criados pelo administrador em Configurações.</p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="customer">
              <form className="space-y-4" onSubmit={handleCustomerSignup}>
                <div className="relative">
                  <Input type="text" placeholder="Nome completo" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="pl-4 pr-10" />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="email" placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required className="pl-4 pr-10" />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="tel" placeholder="Telefone (WhatsApp)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required className="pl-4 pr-10" />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input type="password" placeholder="Senha (mín. 8 caracteres)" value={customerPassword} onChange={e => setCustomerPassword(e.target.value)} required minLength={8} className="pl-4 pr-10" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Seu telefone é como o suporte vai entrar em contato pelo WhatsApp.</p>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
