import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import type { Customer } from '@/types';

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSaved?: () => void;
}

export function CustomerEditDialog({ open, onOpenChange, customer, onSaved }: CustomerEditDialogProps) {
  const [fullName, setFullName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [company, setCompany] = useState(customer.company ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone ?? '');
    setCompany(customer.company ?? '');
    setLoadingNotes(true);
    getCustomerRepository().findById(customer.id).then((c) => {
      if (c) setNotes(c.toPlainObject().notes ?? '');
      setLoadingNotes(false);
    });
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await getCustomerRepository().update(customer.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success('Cliente atualizado');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={loadingNotes}
              placeholder={loadingNotes ? 'Carregando...' : 'Observações internas sobre o cliente'}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
