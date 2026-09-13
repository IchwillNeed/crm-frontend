import { apiClient } from '../client';
import type { DashboardOverview } from '@/types/dashboard';

export const getDashboardOverview = async (period: string = 'month'): Promise<DashboardOverview> => {
  const response = await apiClient.get<DashboardOverview>('/dashboard/overview/', {
    params: { period },
  });
  return response.data;
};