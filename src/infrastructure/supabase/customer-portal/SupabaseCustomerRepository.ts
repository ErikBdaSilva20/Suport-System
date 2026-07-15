import { supabase } from '@/integrations/supabase/client';
import type { ICustomerRepository } from '@/domain/customer-portal/repositories/ICustomerRepository';
import { Customer } from '@/domain/customer-portal/entities/Customer';
import type { CustomerProps } from '@/domain/customer-portal/entities/Customer';
import type { Database } from '@/integrations/supabase/types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

export class SupabaseCustomerRepository implements ICustomerRepository {
  private toEntity(row: CustomerRow): Customer {
    return Customer.create({
      id: row.id, authUserId: row.auth_user_id, email: row.email,
      fullName: row.full_name, phone: row.phone, company: row.company,
      notes: row.notes, createdAt: new Date(row.created_at),
    });
  }

  async findById(id: string): Promise<Customer | null> {
    const { data } = await supabase.from('customers').select('*').eq('id', id).single();
    return data ? this.toEntity(data) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const { data } = await supabase.from('customers').select('*').eq('email', email).single();
    return data ? this.toEntity(data) : null;
  }

  async findByCompany(company: string): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').eq('company', company).order('full_name');
    if (error) throw error;
    return (data ?? []).map(r => this.toEntity(r));
  }

  async list(filters?: { search?: string; page?: number; pageSize?: number }) {
    let query = supabase.from('customers').select('*', { count: 'exact' });
    if (filters?.search) query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    query = query.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return { customers: (data ?? []).map(r => this.toEntity(r)), total: count ?? 0 };
  }

  async create(props: Omit<CustomerProps, 'id' | 'createdAt'>): Promise<Customer> {
    const { data, error } = await supabase.from('customers').insert({
      email: props.email, full_name: props.fullName,
      phone: props.phone ?? null, company: props.company ?? null,
      notes: props.notes ?? null, auth_user_id: props.authUserId ?? null,
    }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return this.toEntity(data);
  }

  async update(id: string, changes: Partial<CustomerProps>): Promise<Customer> {
    const { data, error } = await supabase.from('customers').update({
      ...(changes.fullName !== undefined && { full_name: changes.fullName }),
      ...(changes.email !== undefined && { email: changes.email }),
      ...(changes.phone !== undefined && { phone: changes.phone }),
      ...(changes.company !== undefined && { company: changes.company }),
      ...(changes.notes !== undefined && { notes: changes.notes }),
    }).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return this.toEntity(data);
  }
}
