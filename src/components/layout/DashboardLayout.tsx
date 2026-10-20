import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export function DashboardLayout() {
  const { user } = useAuth();
  const client = useQueryClient();
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/30 p-6">
        {user?.access && user.access.state !== 'active' && !user.is_superuser && <div role="status" className="mb-4 rounded border border-amber-500 p-3">
          <p>{user.access.reason} {user.access.grace_until && `Hasta ${new Date(user.access.grace_until).toLocaleString()}.`}</p>
          <Button variant="outline" onClick={() => { void client.invalidateQueries({ queryKey: ['me'] }); void client.invalidateQueries({ queryKey: ['my-subscription'] }); }}>Actualizar estado del plan</Button>
        </div>}
        <Outlet />
      </main>
    </div>
  );
}
