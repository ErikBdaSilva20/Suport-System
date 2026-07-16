import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { listCustomers, createCustomer } from '@/lib/data/customers.repo';
import { createTicket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { TicketPriority } from '@/lib/data/types.gen';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PROBLEM_CATEGORIES = ['Técnico', 'Atendimento', 'Financeiro', 'Cadastro/Acesso', 'Sem resposta do cliente'];
const OTHER_CATEGORY = 'outro';
const CUSTOM_CATEGORY_MAX_WORDS = 5;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export default function TicketNewScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const isRep = session?.role === 'rep';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [categorySelection, setCategorySelection] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Fallback pra conta rep legada, cadastrada antes do cliente virar rep (sem
  // registro em customers ainda) — o nome/telefone entram junto no mesmo
  // envio do ticket, não como uma etapa separada bloqueando o resto do form.
  const [ownName, setOwnName] = useState('');
  const [ownPhone, setOwnPhone] = useState('');

  useEffect(() => {
    listCustomers()
      .then(rows => {
        setCustomers(rows);
        if (isRep && rows[0]) setCustomerId(rows[0].id);
      })
      .catch(e => toast({ title: 'Erro ao carregar clientes', description: e.message, variant: 'destructive' }));
  }, [isRep]);

  useEffect(() => {
    if (session?.user.name) setOwnName(session.user.name);
  }, [session?.user.name]);

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
      toast({ title: 'Cliente criado e selecionado', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Erro ao criar cliente', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleCustomCategoryChange = (value: string) => {
    if (countWords(value) > CUSTOM_CATEGORY_MAX_WORDS) return;
    setCustomCategory(value);
  };

  const handleCategorySelectionChange = (value: string) => {
    setCategorySelection(value);
    if (value !== OTHER_CATEGORY) setCustomCategory('');
  };

  const handleSubmit = async () => {
    const needsOwnCustomer = isRep && !customers[0];

    if (needsOwnCustomer) {
      if (!ownName.trim() || !ownPhone.trim()) {
        toast({ title: 'Preencha seu nome e telefone', variant: 'destructive' });
        return;
      }
    } else if (!customerId) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    if (subject.trim().length < 3) {
      toast({ title: 'Assunto muito curto', variant: 'destructive' });
      return;
    }
    const category = categorySelection === OTHER_CATEGORY ? customCategory.trim() : categorySelection;
    if (!category) {
      toast({ title: 'Escolha o tipo de problema', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const resolvedCustomerId = needsOwnCustomer
        ? (await createCustomer({ name: ownName.trim(), phone_e164: ownPhone.replace(/\D/g, ''), email: session?.user.email ?? null })).id
        : customerId;
      const ticket = await createTicket({ customer_id: resolvedCustomerId, subject: subject.trim(), description: description.trim(), priority, category });
      toast({ title: 'Ticket criado', description: `#${ticket.number}`, variant: 'success' });
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
        {isRep ? (
          customers[0] ? (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                {customers[0].name} · {customers[0].phone_e164}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seu nome</Label>
                <Input value={ownName} onChange={e => setOwnName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Seu telefone (WhatsApp)</Label>
                <Input value={ownPhone} onChange={e => setOwnPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
          )
        ) : (
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
        )}

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

        <div className="space-y-2">
          <Label>Tipo de problema</Label>
          <Select value={categorySelection} onValueChange={handleCategorySelectionChange}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo de problema" /></SelectTrigger>
            <SelectContent>
              {PROBLEM_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value={OTHER_CATEGORY}>Outro</SelectItem>
            </SelectContent>
          </Select>
          {categorySelection === OTHER_CATEGORY && (
            <div className="space-y-1 pt-1">
              <Input
                value={customCategory}
                onChange={e => handleCustomCategoryChange(e.target.value)}
                placeholder="Descreva em até 5 palavras"
              />
              <p aria-live="polite" className={`text-xs ${countWords(customCategory) >= CUSTOM_CATEGORY_MAX_WORDS ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                {countWords(customCategory)}/{CUSTOM_CATEGORY_MAX_WORDS} palavras{countWords(customCategory) >= CUSTOM_CATEGORY_MAX_WORDS ? ' — limite atingido' : ''}
              </p>
            </div>
          )}
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
