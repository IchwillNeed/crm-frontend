import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Users } from 'lucide-react';
import { getDashboardOverview } from '@/api/endpoints/dashboard';
import { getSalesAnalytics, getCustomerAnalytics } from '@/api/endpoints/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value));
}

interface KpiCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  percentageChange?: number;
  icon: React.ElementType;
}

function KpiCard({ title, value, trend, percentageChange, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && percentageChange !== undefined && (
          <p className={cn(
            'flex items-center gap-1 text-xs',
            trend === 'up' && 'text-green-600',
            trend === 'down' && 'text-red-600',
            trend === 'stable' && 'text-muted-foreground'
          )}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {Math.abs(percentageChange)}% vs. período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => getDashboardOverview('month'),
  });

  const { data: salesAnalytics, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-analytics'],
    queryFn: () => getSalesAnalytics('month'),
  });

  const { data: customerAnalytics, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: () => getCustomerAnalytics('month'),
  });

  if (loadingOverview || !overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const evolutionData = salesAnalytics?.evolution.map((d) => ({
    date: formatShortDate(d.date),
    Ventas: d.sales,
  })) ?? [];

  const topProductsData = salesAnalytics?.top_products_by_revenue.slice(0, 5).map((p) => ({
    name: p.name,
    Ingresos: p.revenue,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del mes actual</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas"
          value={formatCurrency(overview.sales.current)}
          trend={overview.sales.trend}
          percentageChange={overview.sales.percentage_change}
          icon={DollarSign}
        />
        <KpiCard
          title="Gastos"
          value={formatCurrency(overview.expenses.current)}
          trend={overview.expenses.trend}
          percentageChange={overview.expenses.percentage_change}
          icon={Receipt}
        />
        <KpiCard
          title="Resultado estimado"
          value={formatCurrency(overview.estimated_result)}
          icon={Wallet}
        />
        <KpiCard
          title="Clientes"
          value={`${overview.customers.total}`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <Skeleton className="h-64 w-full" />
            ) : evolutionData.length === 0 ? (
              <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay ventas registradas en este período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="Ventas" stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top productos por ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <Skeleton className="h-64 w-full" />
            ) : topProductsData.length === 0 ? (
              <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay ventas registradas en este período.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="Ingresos" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes destacados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCustomers ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead className="text-right">Total gastado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerAnalytics?.top_customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay compras de clientes registradas en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  customerAnalytics?.top_customers.map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.purchase_count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total_spent)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}