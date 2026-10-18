export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Subcategory {
  id: number;
  category: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ProductType {
  id: number;
  subcategory: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Product {
  id: number;
  product_type: number | null;
  name: string;
  description: string | null;
  price: string;
  cost: string | null;
  stock: number;
  min_stock: number;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StockAdjustmentType = 'adjustment_in' | 'adjustment_out' | 'damage' | 'loss';

export type InventoryMovementType =
  | 'sale'
  | 'purchase'
  | 'restock'
  | 'return'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'damage'
  | 'loss';

export interface InventoryMovement {
  id: number;
  product: number;
  product_name: string;
  user: number | null;
  username: string | null;
  movement_type: InventoryMovementType;
  quantity_change: number;
  stock_after: number;
  unit_cost: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}