import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/30 p-6">
        <Outlet />
      </main>
    </div>
  );
}