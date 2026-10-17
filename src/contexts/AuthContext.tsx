import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { login as loginApi, signup as signupApi, type TokenResponse, type LoginCredentials, type SignupData } from '@/api/endpoints/auth';
import { apiClient, startSession, clearSession } from '@/api/client';
import { AuthContext, type CurrentUser } from '@/lib/auth-context';

const getMe = async () => (await apiClient.get<CurrentUser>('/me/')).data;
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('access_token'));
  const profile = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: hasToken, retry: false });
  async function accept(tokens: TokenResponse) {
    client.clear();
    startSession(tokens);
    try {
      await client.fetchQuery({ queryKey: ['me'], queryFn: getMe, retry: false });
      setHasToken(true);
    } catch (error) {
      clearSession();
      setHasToken(false);
      throw error;
    }
  }
  const login = async (data: LoginCredentials) => accept(await loginApi(data));
  const signup = async (data: SignupData) => accept(await signupApi(data));
  const logout = () => {
    clearSession();
    client.clear();
    setHasToken(false);
  };
  return <AuthContext.Provider value={{ user: profile.data, isAuthenticated: hasToken, isLoading: hasToken && profile.isPending, error: profile.error, login, signup, logout }}>{children}</AuthContext.Provider>;
}
