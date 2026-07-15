import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building, Pencil, Users } from 'lucide-react';
import { useCustomerDetail } from '@/presentation/hooks/customer-portal/useCustomers';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLABadge } from '@/components/SLABadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer } from '@/types';

const statusLabels: Record<string, string> = {
  open: 'Abertos',
  pending: 'Pendentes',
  resolved: 'Resolvidos',
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useCustomerDetail(id);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/customers')}>Voltar</Button>
      </div>
    );
  }

  const { customer, contacts, tickets } = data;
  const contactsById = new Map(contacts.map(c => [c.id, c]));
  const headerTitle = customer.company || customer.name;

  const counters = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{headerTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contato{contacts.length > 1 ? 's' : ''} · {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <CustomerEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={editTarget ?? customer}
        onSaved={refetch}
      />

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            Contatos
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-secondary/40 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  )}
                  {c.company && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.company}</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(statusLabels).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{counters[key] || 0}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum ticket encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => {
                  const contact = contactsById.get(t.customer_id);
                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-secondary/60"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">#{t.number}</TableCell>
                      <TableCell className="font-medium text-foreground max-w-[250px] truncate">{t.subject}</TableCell>
                      <TableCell>
                        {contact ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{contact.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell>{t.sla_status ? <SLABadge status={t.sla_status} /> : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
