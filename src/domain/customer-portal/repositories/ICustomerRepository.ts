import type { Customer, CustomerProps } from '../entities/Customer';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findByCompany(company: string): Promise<Customer[]>;
  list(filters?: { search?: string; page?: number; pageSize?: number }): Promise<{ customers: Customer[]; total: number }>;
  create(props: Omit<CustomerProps, 'id' | 'createdAt'>): Promise<Customer>;
  update(id: string, changes: Partial<CustomerProps>): Promise<Customer>;
}
