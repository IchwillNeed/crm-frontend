import { apiClient } from '../client';
import type { Company, CompanySettings } from '@/types/company';

export const getMyCompany = async (): Promise<Company> => {
  const response = await apiClient.get<Company>('/company/me/');
  return response.data;
};

export const updateMyCompany = async (data: Partial<Company>): Promise<Company> => {
  const response = await apiClient.patch<Company>('/company/me/', data);
  return response.data;
};

export const updateMyCompanySettings = async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
  const response = await apiClient.patch<CompanySettings>('/company/settings/', data);
  return response.data;
};