import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse } from './endpoints/auth';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
let generation = 0;
let renewal: { generation: number; promise: Promise<string> } | undefined;
type SessionRequest = InternalAxiosRequestConfig & { _retry?: boolean; sessionGeneration?: number; operationCacheKey?: string };

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
apiClient.interceptors.request.use(async config => {
  const request = config as SessionRequest;
  request.sessionGeneration = generation;
  const token = localStorage.getItem('access_token');
  if (token) request.headers.Authorization = `Bearer ${token}`;
  const stockWrite = request.method === 'post' && /^\/(sales|purchases)\/$|^\/(sales|products|purchases)\/\d+\/(partial_return|restock|adjust_stock|cancel)\/$/.test(request.url ?? '');
  const statusWrite = request.method === 'patch' && /^\/sales\/\d+\/$/.test(request.url ?? '');
  if (stockWrite || statusWrite) {
    if (!token) throw new Error('Inicia sesión antes de registrar una operación.');
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { user_id?: number };
    if (!claims.user_id) throw new Error('La sesión no identifica un usuario.');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([API_BASE_URL, claims.user_id, request.method, request.url, body])));
    const cacheKey = 'crm-operation-v2:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (request.sessionGeneration !== generation) throw new Error('La sesión cambió.');
    const getKey = () => {
      const key = localStorage.getItem(cacheKey) ?? crypto.randomUUID();
      localStorage.setItem(cacheKey, key);
      return key;
    };
    const key = navigator.locks ? await navigator.locks.request(cacheKey, getKey) : getKey();
    if (request.sessionGeneration !== generation) throw new Error('La sesión cambió.');
    request.operationCacheKey = cacheKey;
    request.headers['Idempotency-Key'] = key;
  }
  return request;
});
apiClient.interceptors.response.use(response => {
  if ((response.config as SessionRequest).sessionGeneration !== generation) return Promise.reject(new Error('La sesión cambió.'));
  const key = (response.config as SessionRequest).operationCacheKey;
  if (key) localStorage.removeItem(key);
  return response;
}, async error => {
  const request = error.config as SessionRequest | undefined;
  if (request?.operationCacheKey && request.sessionGeneration === generation && error.response?.status >= 400 && error.response.status < 500 && error.response.status !== 401) {
    localStorage.removeItem(request.operationCacheKey);
  }
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
