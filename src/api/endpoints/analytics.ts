import { apiClient } from '../client';
import type { SalesAnalytics, CustomerAnalytics, ProductAnalytics, ExpenseAnalytics } from '@/types/analytics';

export const getSalesAnalytics = async (period: string = 'month'): Promise<SalesAnalytics> => {
  const response = await apiClient.get<SalesAnalytics>('/dashboard/sales/', { params: { period } });
  return response.data;
};

export const getCustomerAnalytics = async (period: string = 'month'): Promise<CustomerAnalytics> => {
  const response = await apiClient.get<CustomerAnalytics>('/dashboard/customers/', { params: { period } });
  return response.data;
};

export const getProductAnalytics = async (period: string = 'month'): Promise<ProductAnalytics> => {
  const response = await apiClient.get<ProductAnalytics>('/dashboard/products/', { params: { period } });
  return response.data;
};

export const getExpenseAnalytics = async (period: string = 'month'): Promise<ExpenseAnalytics> => {
  const response = await apiClient.get<ExpenseAnalytics>('/dashboard/expenses/', { params: { period } });
  return response.data;
};