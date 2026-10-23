import { useCompanyFormatting } from '@/lib/company-formatting';
import { useState } from 'react';
import axios from 'axios';
import { PeriodFilters } from '@/components/dashboard/PeriodFilters';
import { AnalyticsDetails } from '@/components/dashboard/AnalyticsDetails';
import { InsightsSection } from '@/components/dashboard/InsightsSection';
import type { AnalyticsFilters } from '@/types/analytics-filters';
import { Button } from '@/components/ui/button';
import { useQuery, useIsFetching } from '@tanstack/react-query';
import { LoadingStatus, PageLoading } from '@/components/shared/LoadingState';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Users, Printer } from 'lucide-react';
import { getDashboardOverview } from '@/api/endpoints/dashboard';
import {
  getSalesAnalytics,
  getCustomerAnalytics,
  getProductAnalytics,
  getExpenseAnalytics,
  getDashboardInsights,
} from '@/api/endpoints/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';


function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}

interface KpiCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  percentageChange?: number;
  icon: React.ElementType;
  lowerIsBetter?: boolean;
}

function KpiCard({ title, value, trend, percentageChange, icon: Icon, lowerIsBetter = false }: KpiCardProps) {
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
            trend !== 'stable' && ((trend === 'down') === lowerIsBetter) && 'text-green-600',
            trend !== 'stable' && ((trend === 'down') !== lowerIsBetter) && 'text-red-600',
            trend === 'stable' && 'text-muted-foreground'
          )}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {Math.abs(percentageChange)}% vs. período comparado
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: 'month' });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Imprimir / Guardar PDF
      </Button>
    </div>
    <PeriodFilters onApply={setFilters} />
    <p className="text-sm text-muted-foreground">
      Las ventas se muestran netas de devoluciones según la fecha de la venta original.
      Una devolución posterior puede modificar un período anterior; estos importes no representan un cierre de caja.
    </p>
    <DashboardContent filters={filters} />
  </div>;
}

function DashboardContent({ filters }: { filters: AnalyticsFilters }) {
  const updating = useIsFetching({ predicate: query => ['dashboard-overview', 'sales-analytics', 'customer-analytics', 'product-analytics', 'expense-analytics', 'dashboard-insights'].includes(String(query.queryKey[0])) });
  const { formatCurrency } = useCompanyFormatting();
  const { data: overview, isLoading: loadingOverview, error: overviewError, refetch } = useQuery({
    queryKey: ['dashboard-overview', filters],
    queryFn: () => getDashboardOverview(filters),
  });

  const { data: salesAnalytics, isLoading: loadingSales, error: salesError } = useQuery({
    queryKey: ['sales-analytics', filters],
    queryFn: () => getSalesAnalytics(filters),
  });

  const { data: customerAnalytics, isLoading: loadingCustomers, error: customersError } = useQuery({
    queryKey: ['customer-analytics', filters],
    queryFn: () => getCustomerAnalytics(filters),
  });

  const products = useQuery({ queryKey: ['product-analytics', filters], queryFn: () => getProductAnalytics(filters) });
  const expenses = useQuery({ queryKey: ['expense-analytics', filters], queryFn: () => getExpenseAnalytics(filters) });
  const insights = useQuery({ queryKey: ['dashboard-insights', filters], queryFn: () => getDashboardInsights(filters) });
  if (overviewError) {
    return <div className="space-y-4">
      <p role="alert">{axios.isAxiosError(overviewError) && overviewError.response?.status === 403
        ? 'Tu rol no tiene permiso para consultar el dashboard.' : 'No se pudo cargar el resumen. Revisa el período o vuelve a intentarlo.'}</p>
      <Button onClick={() => void refetch()}>Reintentar</Button></div>;
  }
  if (loadingOverview || !overview) {
    return <PageLoading kind="dashboard" />;
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
      {updating > 0 && <LoadingStatus label="Actualizando resumen…" />}
      <div>
        <p className="text-muted-foreground">{overview.period.start.slice(0, 10)} — {overview.period.end.slice(0, 10)}</p>
      </div>

      {overview.comparison_period && <p className="text-sm text-muted-foreground">Comparado con {overview.comparison_period.start.slice(0, 10)} — {overview.comparison_period.end.slice(0, 10)}</p>}
      {(salesError || customersError || products.isError || expenses.isError) && <p role="alert" className="text-destructive">No se pudieron cargar algunos análisis. Vuelve a cargar la página para reintentar.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas"
          value={formatCurrency(overview.sales.current)}
          trend={overview.sales.trend}
          percentageChange={overview.sales.percentage_change}
          icon={DollarSign}
        />
        <KpiCard
          lowerIsBetter
          title="Gastos"
          value={formatCurrency(overview.expenses.current)}
          trend={overview.expenses.trend}
          percentageChange={overview.expenses.percentage_change}
          icon={Receipt}
        />
        <KpiCard
          title="Ventas menos gastos"
          value={formatCurrency(overview.estimated_result)}
          icon={Wallet}
        />
        <KpiCard
          title="Clientes"
          value={`${overview.customers.total}`}
          icon={Users}
        />
      </div>

      <InsightsSection insights={insights.data} loading={insights.isLoading} filters={filters} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {salesError ? <p role="alert">No se pudo cargar este análisis.</p> : loadingSales ? (
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
            {salesError ? <p role="alert">No se pudo cargar este análisis.</p> : loadingSales ? (
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

      <AnalyticsDetails sales={salesAnalytics} customers={customerAnalytics} products={products.data} expenses={expenses.data} loadingProducts={products.isLoading} loadingExpenses={expenses.isLoading} />
      <Card>
        <CardHeader>
          <CardTitle>Clientes destacados</CardTitle>
        </CardHeader>
        <CardContent>
          {customersError ? <p role="alert">No se pudo cargar este análisis.</p> : loadingCustomers ? (
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
