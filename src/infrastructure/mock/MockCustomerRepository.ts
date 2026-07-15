import type { ICustomerRepository } from '@/domain/customer-portal/repositories/ICustomerRepository';
import { Customer, type CustomerProps } from '@/domain/customer-portal/entities/Customer';
import { mockCustomers } from '@/data/mockData';

function toLegacy(c: typeof mockCustomers[number]): CustomerProps {
  return {
    id: c.id,
    email: c.email,
    fullName: c.name,
    phone: c.phone ?? null,
    company: c.company ?? null,
    notes: null,
    createdAt: new Date(c.created_at),
  };
}

export class MockCustomerRepository implements ICustomerRepository {
  private customers: CustomerProps[];

  constructor() {
    this.customers = mockCustomers.map(toLegacy);
  }

  async findById(id: string): Promise<Customer | null> {
    const c = this.customers.find(c => c.id === id);
    return c ? Customer.create(c) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const c = this.customers.find(c => c.email === email);
    return c ? Customer.create(c) : null;
  }

  async findByCompany(company: string): Promise<Customer[]> {
    return this.customers.filter(c => c.company === company).map(c => Customer.create(c));
  }

  async list(filters?: { search?: string; page?: number; pageSize?: number }): Promise<{ customers: Customer[]; total: number }> {
    let result = [...this.customers];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(c => c.fullName.toLowerCase().includes(s) || c.company?.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
    }
    const total = result.length;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    result = result.slice((page - 1) * pageSize, page * pageSize);
    return { customers: result.map(c => Customer.create(c)), total };
  }

  async create(props: Omit<CustomerProps, 'id' | 'createdAt'>): Promise<Customer> {
    const c: CustomerProps = { ...props, id: `cust-${Date.now()}`, createdAt: new Date() };
    this.customers.push(c);
    return Customer.create(c);
  }

  async update(id: string, changes: Partial<CustomerProps>): Promise<Customer> {
    const idx = this.customers.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`Customer ${id} not found`);
    this.customers[idx] = { ...this.customers[idx], ...changes };
    return Customer.create(this.customers[idx]);
  }
}
