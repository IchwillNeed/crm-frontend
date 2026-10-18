export type SubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired';

export interface SubscriptionSummary {
  subscription: {
    id: number;
    status: SubscriptionStatus;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
  } | null;
  plan: {
    id: number;
    name: string;
    description: string | null;
    price: string;
    billing_period: string;
  } | null;
  limits: { users: number | null; products: number | null };
  usage: { users: number; products: number };
}

