import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export const login = async (credentials: LoginCredentials): Promise<TokenResponse> => {
  const response = await axios.post<TokenResponse>(`${API_BASE_URL}/token/`, credentials);
  return response.data;
};