export type SubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired';

export interface SubscriptionSummary {
  access: SubscriptionAccess;
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

export interface SubscriptionAccess {
  can_write: boolean;
  state: 'active' | 'grace' | 'read_only' | 'unassigned';
  grace_until: string | null;
  reason: string;
}

