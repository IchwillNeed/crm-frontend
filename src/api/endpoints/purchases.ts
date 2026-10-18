import { apiClient } from '../client';
import type { Supplier, Purchase, CreatePurchasePayload } from '@/types/purchase';

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await apiClient.get<Supplier[]>('/suppliers/');
  return response.data;
};

export const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
  const response = await apiClient.post<Supplier>('/suppliers/', data);
  return response.data;
};

export const updateSupplier = async ({ id, data }: { id: number; data: Partial<Supplier> }): Promise<Supplier> => {
  const response = await apiClient.patch<Supplier>(`/suppliers/${id}/`, data);
  return response.data;
};

export const deleteSupplier = async (id: number): Promise<void> => {
  await apiClient.delete(`/suppliers/${id}/`);
};

export const createPurchase = async (data: CreatePurchasePayload): Promise<Purchase> => {
  const response = await apiClient.post<Purchase>('/purchases/', data);
  return response.data;
};

export const deletePurchase = async (id: number): Promise<void> => {
  await apiClient.delete(`/purchases/${id}/`);
};

