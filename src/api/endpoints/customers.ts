import { apiClient } from '../client';
import type { Customer, CustomerFormData } from '@/types/customer';

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await apiClient.get<Customer[]>('/customers/');
  return response.data;
};

export const getCustomer = async (id: number): Promise<Customer> => {
  const response = await apiClient.get<Customer>(`/customers/${id}/`);
  return response.data;
};

export const createCustomer = async (data: Partial<CustomerFormData>): Promise<Customer> => {
  const response = await apiClient.post<Customer>('/customers/', data);
  return response.data;
};

export const updateCustomer = async (id: number, data: Partial<CustomerFormData>): Promise<Customer> => {
  const response = await apiClient.patch<Customer>(`/customers/${id}/`, data);
  return response.data;
};

export const deleteCustomer = async (id: number): Promise<void> => {
  await apiClient.delete(`/customers/${id}/`);
};