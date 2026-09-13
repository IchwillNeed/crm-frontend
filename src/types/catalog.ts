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
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}