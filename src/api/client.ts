import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse } from './endpoints/auth';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
let generation = 0;
let renewal: { generation: number; promise: Promise<string> } | undefined;
type SessionRequest = InternalAxiosRequestConfig & { _retry?: boolean; sessionGeneration?: number };

export function clearSession() {
  generation++;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
export function startSession(tokens: TokenResponse) {
  clearSession();
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
}
apiClient.interceptors.request.use(config => {
  const request = config as SessionRequest;
  request.sessionGeneration = generation;
  const token = localStorage.getItem('access_token');
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});
apiClient.interceptors.response.use(response => {
  if ((response.config as SessionRequest).sessionGeneration !== generation) return Promise.reject(new Error('La sesión cambió.'));
  return response;
}, async error => {
  const request = error.config as SessionRequest | undefined;
  if (!request || error.response?.status !== 401 || request.sessionGeneration !== generation) return Promise.reject(error);
  const currentGeneration = generation;
  const refresh = localStorage.getItem('refresh_token');
  try {
    if (!refresh || request._retry) throw error;
    request._retry = true;
    if (!renewal || renewal.generation !== generation) {
      const promise = axios.post<TokenResponse>(`${API_BASE_URL}/token/refresh/`, { refresh }, { timeout: 30000 }).then(({ data }) => {
        if (generation !== currentGeneration || localStorage.getItem('refresh_token') !== refresh) throw new Error('La sesión cambió.');
        localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return data.access;
      }).finally(() => { if (renewal?.generation === currentGeneration) renewal = undefined; });
      renewal = { generation, promise };
    }
    const access = await renewal.promise;
    if (generation !== currentGeneration) throw new Error('La sesión cambió.');
    request.headers.Authorization = `Bearer ${access}`;
    return apiClient(request);
  } catch (failure) {
    if (generation === currentGeneration) {
      clearSession();
      window.location.assign('/login');
    }
    return Promise.reject(failure);
  }
});
