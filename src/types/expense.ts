export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Expense {
  id: number;
  category: number;
  user: number;
  payment_method: number | null;
  description: string;
  amount: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}