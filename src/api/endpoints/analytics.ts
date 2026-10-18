import { apiClient } from '../client';
import type { AnalyticsFilters } from '@/types/analytics-filters';
import type {
  SalesAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  ExpenseAnalytics,
  DashboardInsights,
  PromotionPreset,
} from '@/types/analytics';

export const getSalesAnalytics = async (filters: AnalyticsFilters = {}): Promise<SalesAnalytics> => {
  const response = await apiClient.get<SalesAnalytics>('/dashboard/sales/', { params: filters });
  return response.data;
};

export const getCustomerAnalytics = async (filters: AnalyticsFilters = {}): Promise<CustomerAnalytics> => {
  const response = await apiClient.get<CustomerAnalytics>('/dashboard/customers/', { params: filters });
  return response.data;
};

export const getProductAnalytics = async (filters: AnalyticsFilters = {}): Promise<ProductAnalytics> => {
  const response = await apiClient.get<ProductAnalytics>('/dashboard/products/', { params: filters });
  return response.data;
};

export const getExpenseAnalytics = async (filters: AnalyticsFilters = {}): Promise<ExpenseAnalytics> => {
  const response = await apiClient.get<ExpenseAnalytics>('/dashboard/expenses/', { params: filters });
  return response.data;
};

export const getDashboardInsights = async (filters: AnalyticsFilters = {}): Promise<DashboardInsights> => {
  const response = await apiClient.get<DashboardInsights>('/dashboard/insights/', { params: filters });
  return response.data;
};

export const sendInsightsEmail = async (
  filters: AnalyticsFilters = {},
): Promise<{ sent_count: number; recipients: string[]; detail: string }> => {
  const response = await apiClient.post<{ sent_count: number; recipients: string[]; detail: string }>(
    '/dashboard/insights/send-email/',
    {},
    { params: filters },
  );
  return response.data;
};

export const sendCustomerPromotion = async (
  payload: PromotionPreset,
): Promise<{ sent_count: number; recipients: string[]; detail: string }> => {
  const response = await apiClient.post<{ sent_count: number; recipients: string[]; detail: string }>(
    '/dashboard/insights/send-promotion/',
    payload,
  );
  return response.data;
};


