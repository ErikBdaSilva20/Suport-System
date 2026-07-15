import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicket } from '@/presentation/hooks/ticketing/useCreateTicket';
import { useTags } from '@/presentation/hooks/settings/useTags';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { ProfileProps } from '@/domain/identity/entities/Profile';

const schema = z.object({
  subject: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  description: z.string().min(5, 'Mínimo 5 caracteres').max(5000),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  customerId: z.string().min(1, 'Selecione um cliente'),
  assignedAgentId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

export default function TicketNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTicket, isLoading } = useCreateTicket();
  const { data: tags } = useTags();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [agents, setAgents] = useState<ProfileProps[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [creatingCust, setCreatingCust] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', description: '', priority: 'medium', customerId: '', tagIds: [] },
  });

  // Load agents
  useEffect(() => {
    getProfileRepository().listAgents(true).then(list => {
      setAgents(list.map(a => a.toPlainObject()));
    });
  }, []);

  // Debounced customer search
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const timer = setTimeout(async () => {
      const repo = getCustomerRepository();
      const res = await repo.list({ search: customerSearch });
      setCustomerResults(res.customers.map(c => {
        const p = c.toPlainObject();
        return { id: p.id, name: p.fullName, email: p.email };
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags(prev => {
      const next = prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId];
      form.setValue('tagIds', next);
      return next;
    });
  }, [form]);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustEmail.trim()) {
      toast({ title: 'Nome e e-mail são obrigatórios', variant: 'destructive' });
      return;
    }
    setCreatingCust(true);
    try {
      const cust = await getCustomerRepository().create({
        fullName: newCustName.trim(),
        email: newCustEmail.trim(),
        phone: null, company: null, authUserId: null, notes: null,
      });
      const p = cust.toPlainObject();
      setSelectedCustomer({ id: p.id, name: p.fullName });
      form.setValue('customerId', p.id);
      setCustomerSearch('');
      setCustomerResults([]);
      setShowCreateCustomer(false);
      setNewCustName(''); setNewCustEmail('');
      toast({ title: 'Cliente criado e selecionado' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar cliente', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingCust(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const ticket = await createTicket({
        subject: data.subject,
        number: 0,
        status: 'open',
        priority: data.priority,
        channel: 'email',
        customerId: data.customerId,
        assignedAgentId: data.assignedAgentId ?? null,
        tagIds: data.tagIds ?? [],
        slaStatus: 'ok',
        description: data.description,
      });
      const plain = ticket.toPlainObject();
      toast({ title: 'Ticket criado com sucesso', description: `#${plain.number}` });
      navigate(`/tickets/${plain.id}`);
    } catch (e: any) {
      toast({ title: 'Erro ao criar ticket', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Novo Ticket</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem>
              <FormLabel>Assunto</FormLabel>
              <FormControl><Input placeholder="Resumo do problema" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl><Textarea placeholder="Detalhes do problema..." className="min-h-[120px]" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="assignedAgentId" render={({ field }) => (
              <FormItem>
                <FormLabel>Agente (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="customerId" render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedCustomer.name}</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setSelectedCustomer(null);
                    field.onChange('');
                  }}>Alterar</Button>
                </div>
              ) : (
                <div className="relative">
                  <FormControl>
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </FormControl>
                  {(customerResults.length > 0 || customerSearch.length >= 2) && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setSelectedCustomer({ id: c.id, name: c.name });
                            field.onChange(c.id);
                            setCustomerSearch('');
                            setCustomerResults([]);
                          }}
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground ml-2">{c.email}</span>
                        </button>
                      ))}
                      {customerSearch.length >= 2 && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent border-t border-border flex items-center gap-2"
                          onClick={() => setShowCreateCustomer(true)}
                        >
                          <span className="font-bold">＋</span>
                          Criar cliente &quot;{customerSearch}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )} />


          <div>
            <label className="text-sm font-medium text-foreground">Tags (opcional)</label>
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                  style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Ticket
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/tickets')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="email@empresa.com" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCustomer(false)}>Cancelar</Button>
            <Button onClick={handleCreateCustomer} disabled={creatingCust} className="gap-2">
              {creatingCust && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar e Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
