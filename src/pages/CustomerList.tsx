import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building, Ticket, AlertTriangle, UserPlus, Loader2 } from 'lucide-react';
import { useCustomers } from '@/presentation/hooks/customer-portal/useCustomers';
import { useTickets } from '@/presentation/hooks/ticketing/useTickets';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'há poucos minutos';
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const { data: customersData, isLoading: customersLoading, refetch } = useCustomers();
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({});

  // Create customer dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast({ title: 'Nome e e-mail são obrigatórios', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const customer = await getCustomerRepository().create({
        fullName: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || null,
        company: newCompany.trim() || null,
        authUserId: null,
        notes: null,
        
      });
      toast({ title: 'Cliente criado com sucesso' });
      setShowCreate(false);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewCompany('');
      refetch();
      navigate(`/customers/${customer.toPlainObject().id}`);
    } catch (e: any) {
      toast({ title: 'Erro ao criar cliente', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };


  const isLoading = customersLoading || ticketsLoading;
  const customers = customersData?.customers ?? [];
  const tickets = ticketsData?.tickets ?? [];

  const companies = useMemo(() => {
    const map = new Map<string, { company: string; customerIds: string[]; customers: typeof customers }>();

    for (const c of customers) {
      const key = c.company || c.name;
      if (!map.has(key)) map.set(key, { company: key, customerIds: [], customers: [] });
      const entry = map.get(key)!;
      entry.customerIds.push(c.id);
      entry.customers.push(c);
    }

    return Array.from(map.values()).map((entry) => {
      const cTickets = tickets.filter((t) => entry.customerIds.includes(t.customer_id));
      const open = cTickets.filter((t) => ['open', 'pending'].includes(t.status)).length;
      const resolved = cTickets.filter((t) => t.status === 'resolved').length;
      const slaBad = cTickets.filter((t) => t.sla_status === 'breached' || t.sla_status === 'warning').length;
      const latest = cTickets.length ? cTickets.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at : null;
      const pct = cTickets.length ? Math.round((resolved / cTickets.length) * 100) : 0;

      return { ...entry, total: cTickets.length, open, resolved, slaBad, latest, pct };
    });
  }, [customers, tickets]);

  const filtered = companies.filter((c) => c.company.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Visão agrupada por empresa</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa ou cliente..."
          className="pl-9 bg-secondary border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((company) => (
          <Card
            key={company.company}
            className="cursor-pointer transition-all duration-200 hover:border-primary/50 shadow-elevation-1 hover:shadow-elevation-3 hover:-translate-y-0.5"
            onClick={() => navigate(`/customers/${encodeURIComponent(company.customerIds[0])}`)}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{company.company}</p>
                    <p className="text-xs text-muted-foreground">{company.customers.length} contato(s)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-secondary p-2">
                  <Ticket className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{company.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="rounded-md bg-secondary p-2">
                  <AlertTriangle className="mx-auto h-4 w-4 text-status-open mb-1" />
                  <p className="text-lg font-bold text-foreground">{company.open}</p>
                  <p className="text-[10px] text-muted-foreground">Abertos</p>
                </div>
                <div className="rounded-md bg-secondary p-2">
                  <AlertTriangle className="mx-auto h-4 w-4 text-sla-breached mb-1" />
                  <p className="text-lg font-bold text-foreground">{company.slaBad}</p>
                  <p className="text-[10px] text-muted-foreground">SLA Risco</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Resolução</span>
                  <span>{company.pct}%</span>
                </div>
                <Progress value={company.pct} className="h-2" />
              </div>

              {company.latest && (
                <p className="text-xs text-muted-foreground">
                  Último ticket: {timeAgo(company.latest)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-0000" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input placeholder="Nome da empresa" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
