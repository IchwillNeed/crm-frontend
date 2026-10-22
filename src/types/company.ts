export interface CompanySettings {
  currency: string;
  timezone: string;
  language: string;
  enable_recommendations: boolean;
  campaign_cooldown_days: number;
  email_provider?: 'smtp' | 'brevo';
  brevo_sender_name?: string;
  brevo_sender_email?: string;
  brevo_api_key?: string;
  clear_brevo_api_key?: boolean;
  brevo_configured?: boolean;
  brevo_delivery_enabled?: boolean;
  smtp_sender_name?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_user?: string;
  smtp_password?: string;
  clear_smtp_password?: boolean;
  smtp_configured?: boolean;
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
