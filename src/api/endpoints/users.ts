import { apiClient } from '../client';
import type { CompanyUser, UserFormData } from '@/types/user';

export const getCompanyUsers = async (): Promise<CompanyUser[]> => {
  const response = await apiClient.get<CompanyUser[]>('/users/');
  return response.data;
};

export const createCompanyUser = async (data: UserFormData): Promise<CompanyUser> => {
  const response = await apiClient.post<CompanyUser>('/users/', data);
  return response.data;
};

export const updateCompanyUser = async (id: number, data: Partial<UserFormData>): Promise<CompanyUser> => {
  const response = await apiClient.patch<CompanyUser>(`/users/${id}/`, data);
  return response.data;
};

export const deactivateCompanyUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}/`);
};