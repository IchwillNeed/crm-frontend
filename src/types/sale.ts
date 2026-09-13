export interface SaleItem {
  id: number;
  sale: number;
  product: number;
  quantity: number;
  unit_price: string;
  unit_cost: string | null;
  subtotal: string;
}

export interface Sale {
  id: number;
  customer: number | null;
  user: number;
  payment_method: number | null;
  sale_date: string;
  total: string;
  status: 'Completed' | 'Cancelled';
  notes: string | null;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}