import { createContext, useContext } from 'react';
import type { LoginCredentials, SignupData } from '@/api/endpoints/auth';
import type { CompanyUser } from '@/types/user';
import type { SubscriptionAccess } from '@/types/subscription';

export interface CurrentUser extends CompanyUser { company: number | null; is_superuser: boolean; access: SubscriptionAccess | null }
export interface AuthState {
  user: CurrentUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (data: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
}
export const AuthContext = createContext<AuthState | undefined>(undefined);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
