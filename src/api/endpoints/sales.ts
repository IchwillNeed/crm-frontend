import { apiClient } from '../client';
import type { Sale, PaymentMethod } from '@/types/sale';

export const getSales = async (): Promise<Sale[]> => {
  const response = await apiClient.get<Sale[]>('/sales/');
  return response.data;
};

export const getSale = async (id: number): Promise<Sale> => {
  const response = await apiClient.get<Sale>(`/sales/${id}/`);
  return response.data;
};

export const createSale = async (data: {
  customer?: number | null;
  payment_method?: number | null;
  notes?: string;
}): Promise<Sale> => {
  const response = await apiClient.post<Sale>('/sales/', data);
  return response.data;
};

export const addSaleItem = async (data: {
  sale: number;
  product: number;
  quantity: number;
  unit_price: number;
}): Promise<void> => {
  await apiClient.post('/sale-items/', data);
};

export const deleteSale = async (id: number): Promise<void> => {
  await apiClient.delete(`/sales/${id}/`);
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await apiClient.get<PaymentMethod[]>('/payment-methods/');
  return response.data;
};