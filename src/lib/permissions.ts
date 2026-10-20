import { useAuth } from './auth-context';

export type Permission = 'plan.read' | 'costs.read' | 'dashboard' | 'customers.write' | 'catalog.write' | 'sales.create' | 'sales.update' | 'delete' | 'expenses' | 'settings';
const roles: Record<Permission, string[]> = {
  'plan.read': ['Administrador', 'Gerente'],
  'costs.read': ['Administrador', 'Gerente'],
  dashboard: ['Administrador', 'Gerente'],
  'customers.write': ['Administrador', 'Gerente', 'Vendedor'],
  'catalog.write': ['Administrador', 'Gerente'],
  'sales.create': ['Administrador', 'Gerente', 'Vendedor'],
  'sales.update': ['Administrador', 'Gerente'],
  delete: ['Administrador'],
  expenses: ['Administrador', 'Gerente'],
  settings: ['Administrador'],
};
export function usePermissions() {
  const { user } = useAuth();
  const can = (permission: Permission) => !!user && (user.is_superuser || roles[permission].includes(user.role_name ?? ''));
  return { can, home: can('dashboard') ? '/dashboard' : '/sales' };
}
