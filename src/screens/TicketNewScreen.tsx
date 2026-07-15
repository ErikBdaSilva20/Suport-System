import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { listCustomers, createCustomer } from '@/lib/data/customers.repo';
import { createTicket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { TicketPriority } from '@/lib/data/types.gen';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function TicketNewScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [submitting, setSubmitting] = useState(false);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  useEffect(() => {
    listCustomers().then(setCustomers).catch(e => toast({ title: 'Erro ao carregar clientes', description: e.message, variant: 'destructive' }));
  }, []);

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: 'Nome e telefone são obrigatórios', variant: 'destructive' });
      return;
    }
    setCreatingCustomer(true);
    try {
      const digits = newPhone.replace(/\D/g, '');
      const customer = await createCustomer({ name: newName.trim(), phone_e164: digits, email: newEmail.trim() || null });
      setCustomers(prev => [...prev, customer]);
      setCustomerId(customer.id);
      setShowNewCustomer(false);
      setNewName(''); setNewPhone(''); setNewEmail('');
      toast({ title: 'Cliente criado e selecionado' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar cliente', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerId) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    if (subject.trim().length < 3) {
      toast({ title: 'Assunto muito curto', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({ customer_id: customerId, subject: subject.trim(), description: description.trim(), priority });
      toast({ title: 'Ticket criado', description: `#${ticket.number}` });
      navigate(`/tickets/${ticket.id}`);
    } catch (e: any) {
      toast({ title: 'Erro ao criar ticket', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
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

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <div className="flex gap-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => setShowNewCustomer(true)}>
              <UserPlus className="h-4 w-4" /> Novo
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Assunto</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Resumo do problema" />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" placeholder="Detalhes do problema..." />
        </div>

        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Criar Ticket
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/tickets')}>Cancelar</Button>
        </div>
      </div>

      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (WhatsApp) *</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancelar</Button>
            <Button onClick={handleCreateCustomer} disabled={creatingCustomer} className="gap-2">
              {creatingCustomer && <Loader2 className="h-4 w-4 animate-spin" />} Criar e Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
