import { apiClient } from '../client';
import type { AnalyticsFilters } from '@/types/analytics-filters';
import type {
  SalesAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  ExpenseAnalytics,
  DashboardInsights,
  PromotionPreset,
  CampaignPreview,
  CampaignExecutionResult,
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

export const previewRecommendationCampaign = async (
  payload: { product_a_id: number; product_b_id: number; subject: string; message: string; selected_customer_ids?: number[]; image_data?: string | null; image_name?: string | null },
  filters: AnalyticsFilters = {},
): Promise<CampaignPreview> => {
  const response = await apiClient.post<CampaignPreview>(
    '/dashboard/insights/campaign-preview/',
    payload,
    { params: filters },
  );
  return response.data;
};

export const sendRecommendationCampaign = async (
  payload: {
    product_a_id: number;
    product_b_id: number;
    subject: string;
    message: string;
    confirmed: boolean;
    preview_token: string;
    selected_customer_ids: number[];
    image_data?: string | null;
    image_name?: string | null;
    campaign_id?: number;
  },
  filters: AnalyticsFilters = {},
): Promise<CampaignExecutionResult> => {
  const response = await apiClient.post<CampaignExecutionResult>(
    '/dashboard/insights/campaigns/',
    payload,
    { params: filters },
  );
  return response.data;
};

export const retryRecommendationCampaign = async (
  campaignId: number,
  payload: { subject?: string; message?: string; image_data?: string | null; image_name?: string | null } = {},
): Promise<CampaignExecutionResult> => {
  const response = await apiClient.post<CampaignExecutionResult>(
    `/dashboard/insights/campaigns/${campaignId}/retry/`,
    payload,
  );
  return response.data;
};

export const sendCustomerPromotion = async (
  payload: PromotionPreset & { confirmed?: boolean; campaign_id?: number },
  filters: AnalyticsFilters = {},
): Promise<{ sent_count: number; recipients: string[]; detail: string }> => {
  const response = await apiClient.post<{ sent_count: number; recipients: string[]; detail: string }>(
    '/dashboard/insights/send-promotion/',
    payload,
    { params: filters },
  );
  return response.data;
};

export const getCampaignHistory = async (page = 1): Promise<{results: CampaignExecutionResult[]; page: number; pages: number; count: number}> => {
  const response = await apiClient.get('/dashboard/insights/campaigns/', {params: {page}});
  return response.data;
};
