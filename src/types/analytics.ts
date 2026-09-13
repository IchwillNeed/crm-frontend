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
  low_stock: { product_id: number; name: string; stock: number }[];
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