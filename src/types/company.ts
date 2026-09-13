export interface CompanySettings {
  currency: string;
  timezone: string;
  language: string;
  enable_recommendations: boolean;
  enable_expenses: boolean;
  enable_inventory: boolean;
}

export interface Company {
  id: number;
  name: string;
  business_name: string | null;
  description: string | null;
  industry: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  is_active: boolean;
  settings: CompanySettings;
}