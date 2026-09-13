import { apiClient } from '../client';
import type { Expense, ExpenseCategory } from '@/types/expense';

// Expense Categories
export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const response = await apiClient.get<ExpenseCategory[]>('/expense-categories/');
  return response.data;
};
export const createExpenseCategory = async (data: { name: string; description?: string }): Promise<ExpenseCategory> => {
  const response = await apiClient.post<ExpenseCategory>('/expense-categories/', data);
  return response.data;
};
export const updateExpenseCategory = async (id: number, data: { name: string; description?: string }): Promise<ExpenseCategory> => {
  const response = await apiClient.patch<ExpenseCategory>(`/expense-categories/${id}/`, data);
  return response.data;
};
export const deleteExpenseCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/expense-categories/${id}/`);
};

// Expenses
export const getExpenses = async (): Promise<Expense[]> => {
  const response = await apiClient.get<Expense[]>('/expenses/');
  return response.data;
};
export const createExpense = async (data: {
  category: number;
  payment_method?: number | null;
  description: string;
  amount: number;
  notes?: string;
}): Promise<Expense> => {
  const response = await apiClient.post<Expense>('/expenses/', data);
  return response.data;
};
export const updateExpense = async (id: number, data: Partial<Expense>): Promise<Expense> => {
  const response = await apiClient.patch<Expense>(`/expenses/${id}/`, data);
  return response.data;
};
export const deleteExpense = async (id: number): Promise<void> => {
  await apiClient.delete(`/expenses/${id}/`);
};