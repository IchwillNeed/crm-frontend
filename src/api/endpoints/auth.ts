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

export interface SignupData {
  company_name: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface SignupResponse {
  access: string;
  refresh: string;
  company: { id: number; name: string };
  user: { id: number; username: string; first_name: string; last_name: string };
}

export const signup = async (data: SignupData): Promise<SignupResponse> => {
  const response = await axios.post<SignupResponse>(`${API_BASE_URL}/signup/`, data);
  return response.data;
};