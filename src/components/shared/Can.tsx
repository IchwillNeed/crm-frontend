import type { ReactNode } from 'react';
import { usePermissions, type Permission } from '@/lib/permissions';

export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = usePermissions();
  return can(permission) ? children : null;
}
