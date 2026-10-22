export interface SalesAnalytics {
  period: { start: string; end: string };
  total_sales: {
    current: number; previous: number; difference: number;
    percentage_change: number; trend: 'up' | 'down' | 'stable';
  };
  sales_count: number;
  average_ticket: number;
  quantity_sold: number;
  evolution: { date: string; sales: number }[];
  top_products_by_quantity: { product_id: number; name: string; quantity_sold: number }[];
  top_products_by_revenue: { product_id: number; name: string; revenue: number }[];
  sales_by_category: { category_id: number | null; category_name: string; revenue: number }[];
  sales_by_payment_method: { payment_method_id: number | null; payment_method_name: string; total: number }[];
}

export interface CustomerAnalytics {
  period: { start: string; end: string };
  total: number;
  new: number;
  active: number;
  recurring: number;
  inactive: number;
  inactivity_threshold_days: number;
  top_customers: { customer_id: number; name: string; total_spent: number; purchase_count: number }[];
}

export interface ProductAnalytics {
  period: { start: string; end: string };
  total_products: number;
  low_stock: { product_id: number; name: string; stock: number; min_stock?: number }[];
  low_stock_threshold: number;
  out_of_stock: { product_id: number; name: string; stock: number }[];
  products_by_margin: {
    product_id: number; name: string; quantity_sold: number;
    revenue: number; estimated_cost: number; estimated_margin: number;
  }[];
  products_margin_not_available: { product_id: number; name: string }[];
  least_sold_products: { product_id: number; name: string; quantity_sold: number }[];
  never_sold_products: { product_id: number; name: string; stock: number }[];
}

export interface ExpenseAnalytics {
  period: { start: string; end: string };
  total_expenses: {
    current: number; previous: number; difference: number;
    percentage_change: number; trend: 'up' | 'down' | 'stable';
  };
  expenses_by_category: { category_id: number; category_name: string; total: number }[];
  top_category: { category_id: number; category_name: string; total: number } | null;
  evolution: { date: string; expenses: number }[];
  income_vs_expenses: { total_sales: number; total_expenses: number; estimated_result: number };
}

export interface FrequentPair {
  product_a_id: number;
  product_a_name: string;
  product_b_id: number;
  product_b_name: string;
  times_bought_together: number;
  supporting_sales_count?: number;
  supporting_customers_count?: number;
  min_evidence_required?: number;
  period?: { start: string; end: string };
}

export interface CommercialRecommendation {
  rule: 'bought_a_not_b';
  rule_label: string;
  product_a_id: number;
  product_a_name: string;
  product_b_id: number;
  product_b_name: string;
  product_b_stock: number;
  period: { start: string; end: string };
  supporting_sales_count: number;
  supporting_customers_count: number;
  min_evidence_required: number;
  eligible_recipients_count: number;
  suggested_subject: string;
  suggested_message: string;
}

export interface RestockSuggestion {
  product_id: number;
  name: string;
  current_stock: number;
  quantity_sold_period: number;
  days_of_stock_left: number | null;
  suggested_restock: number;
}

export type PromotionAudience = 'bought_a_not_b' | 'all' | 'inactive' | 'related_buyers';

export interface PromotionPreset {
  audience: PromotionAudience;
  subject: string;
  message: string;
  product_ids?: number[];
  product_a_id?: number;
  product_a_name?: string;
  product_b_id?: number;
  product_b_name?: string;
  supporting_sales_count?: number;
  supporting_customers_count?: number;
  period?: { start: string; end: string };
}

export interface CampaignRecipientPreview {
  customer_id: number;
  name: string;
  email: string;
}

export interface CampaignPreview {
  sender: { from_email: string; signature: string; provider?: 'smtp' | 'brevo'; reply_to?: string; image_delivery?: 'inline' | 'attachment' };
  preview_token: string;
  selected_customer_ids: number[];
  selected_count: number;
  cooldown_days: number;
  cooldown_excluded_count: number;
  rule: 'bought_a_not_b';
  rule_label: string;
  period: { start: string; end: string };
  product_a: { id: number; name: string };
  product_b: { id: number; name: string; stock: number };
  supporting_sales_count: number;
  supporting_customers_count: number;
  min_evidence_required: number;
  recipient_count: number;
  recipients: CampaignRecipientPreview[];
  image?: { name: string; content_type: string; size: number; sha256: string } | null;
  empty_audience_message: string | null;
  suggested_subject: string;
  suggested_message: string;
}

export interface CampaignRecipientStatus {
  id: number;
  customer_id: number;
  name: string;
  email: string;
  status: 'pending' | 'sent' | 'failed' | 'unknown';
  error_message: string | null;
  sent_at: string | null;
}

export interface CampaignExecutionResult {
  subject: string;
  message: string;
  image: CampaignPreview['image'];
  sender: CampaignPreview['sender'] | null;
  campaign_id: number;
  status: 'pending' | 'sent' | 'partial_error' | 'failed' | 'empty';
  rule: string;
  rule_label: string;
  period: { start: string; end: string };
  product_a: { id: number; name: string };
  product_b: { id: number; name: string };
  recipient_count: number;
  sent_count: number;
  newly_sent_count: number;
  already_sent_count: number;
  failed_count: number;
  unknown_count: number;
  retryable_count: number;
  recipients: string[];
  recipient_statuses: CampaignRecipientStatus[];
  detail: string;
}

export interface InsightItem {
  id: string;
  type: 'info' | 'warning' | 'success';
  category: 'inventory' | 'sales' | 'margin' | 'customers' | 'finance';
  title: string;
  description: string;
  action_label?: string;
  action_path?: string;
  promotion_preset?: PromotionPreset;
}

export interface DashboardInsights {
  enabled: boolean;
  period: { start: string; end: string };
  min_evidence_required?: number;
  frequent_pairs: FrequentPair[];
  recommendations?: CommercialRecommendation[];
  restock_suggestions: RestockSuggestion[];
  insights: InsightItem[];
}