import { usePermissions } from '@/lib/permissions';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingCart, Receipt, Settings, LogOut, Tags, Truck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/catalog', label: 'Catálogo', icon: Tags },
  { to: '/sales', label: 'Ventas', icon: ShoppingCart },
  { to: '/purchases', label: 'Compras', icon: Truck },
  { to: '/expenses', label: 'Gastos', icon: Receipt },
  { to: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const { logout, user } = useAuth();
  const { can } = usePermissions();

  return (
    <aside className="flex w-full flex-col border-b bg-background md:h-screen md:w-64 md:shrink-0 md:border-r">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="h-6 w-6 rounded-full bg-primary" />
        <span className="text-lg font-bold">KANTU</span>
      </div>

      <nav className="flex flex-wrap gap-1 p-3 md:block md:flex-1 md:space-y-1">
        {navItems.filter(item => item.to !== '/dashboard' || can('dashboard')).filter(item => (item.to !== '/expenses' && item.to !== '/purchases') || can('expenses')).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3"><p className="px-3 text-xs text-muted-foreground">{user?.username} · {user?.role_name}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}