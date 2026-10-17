export interface CompanyUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: number | null;
  role_name: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface UserFormData {
  is_active?: boolean;
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: number | null;
}