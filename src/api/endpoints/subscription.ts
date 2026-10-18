import { apiClient } from '../client';
import type { SubscriptionSummary } from '@/types/subscription';

export const getMySubscription = async (): Promise<SubscriptionSummary> => {
  const response = await apiClient.get<SubscriptionSummary>('/subscription/me/');
  return response.data;
};

