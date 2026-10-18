export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase: number;
  product: number;
  quantity: number;
  unit_cost: string;
  subtotal: string;
}

export interface Purchase {
  id: number;
  supplier: number | null;
  user: number;
  payment_method: number | null;
  purchase_date: string;
  total: string;
  notes: string | null;
  items: PurchaseItem[];
  created_at: string;
  updated_at: string;
}

export interface CreatePurchasePayload {
  supplier?: number | null;
  payment_method?: number | null;
  purchase_date?: string;
  notes?: string | null;
  items: {
    product: number;
    quantity: number;
    unit_cost: string;
  }[];
}

