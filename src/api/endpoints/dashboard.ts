import { apiClient } from '../client';
import type { DashboardOverview } from '@/types/dashboard';
import type { AnalyticsFilters } from '@/types/analytics-filters';

export const getDashboardOverview = async (filters: AnalyticsFilters = {}): Promise<DashboardOverview> => {
  const response = await apiClient.get<DashboardOverview>('/dashboard/overview/', {
    params: filters,
  });
  return response.data;
};
