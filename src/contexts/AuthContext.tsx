import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { login as loginApi, signup as signupApi, type TokenResponse, type LoginCredentials, type SignupData } from '@/api/endpoints/auth';
import { apiClient, startSession, clearSession } from '@/api/client';
import { AuthContext, type CurrentUser } from '@/lib/auth-context';
import { toast } from 'sonner';

const getMe = async () => (await apiClient.get<CurrentUser>('/me/')).data;
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('access_token'));
  const profile = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: hasToken, retry: false, refetchInterval: 60000 });
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
  const logout = async () => {
    try {
      await apiClient.post('/logout/');
    } catch {
      toast.error('Se cerró la sesión local, pero no se pudo confirmar la revocación en el servidor.');
    } finally {
      clearSession();
      client.clear();
      setHasToken(false);
    }
  };
  return <AuthContext.Provider value={{ user: profile.data, isAuthenticated: hasToken, isLoading: hasToken && profile.isPending, error: profile.error, retryProfile: () => { void profile.refetch(); }, login, signup, logout }}>{children}</AuthContext.Provider>;
}
