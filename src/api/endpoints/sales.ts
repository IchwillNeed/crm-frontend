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
  items: { product: number; quantity: number; unit_price?: number }[];
  customer?: number | null;
  payment_method?: number | null;
  notes?: string;
}): Promise<Sale> => {
  const response = await apiClient.post<Sale>('/sales/', data);
  return response.data;
};

export const deleteSale = async (id: number): Promise<void> => {
  await apiClient.delete(`/sales/${id}/`);
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await apiClient.get<PaymentMethod[]>('/payment-methods/');
  return response.data;
};
export const getCustomerSales = async (id: number): Promise<Sale[]> => (await apiClient.get<Sale[]>('/sales/', { params: { customer: id } })).data;
export const updateSaleStatus = async (id: number, status: 'Completed' | 'Cancelled'): Promise<Sale> => (await apiClient.patch<Sale>(`/sales/${id}/`, { status })).data;
export const partialReturnSale = async (
  id: number,
  data: { sale_item: number; quantity: number; reason?: string }
): Promise<Sale> => (await apiClient.post<Sale>(`/sales/${id}/partial_return/`, data)).data;

