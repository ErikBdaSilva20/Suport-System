import { db } from './client';
import type { Database } from './types.gen';

export type Customer = Database['public']['Tables']['customers']['Row'];

export const listCustomers = () => db.table<Customer>('customers').list();

export const createCustomer = (input: {
  name: string;
  phone_e164: string;
  email?: string | null;
  notes?: string | null;
}) => db.table<Customer>('customers').create(input);

export const updateCustomer = (
  id: string,
  patch: Partial<Pick<Customer, 'name' | 'phone_e164' | 'email' | 'notes'>>
) => db.table<Customer>('customers').update(id, patch);

export const deleteCustomer = (id: string) => db.table<Customer>('customers').remove(id);
