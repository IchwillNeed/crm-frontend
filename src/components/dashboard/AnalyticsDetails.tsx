import { useCompanyFormatting } from '@/lib/company-formatting';
import { exportCsv } from '@/lib/export-csv';
import type { CustomerAnalytics, ExpenseAnalytics, ProductAnalytics, SalesAnalytics } from '@/types/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


function SummaryTable({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, '_')}.csv`;
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle>{title}</CardTitle>
    {rows.length > 0 && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs print:hidden"
        onClick={() => exportCsv(filename, columns, rows)}
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        CSV
      </Button>
    )}
  </CardHeader><CardContent className="overflow-x-auto">
    {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin registros para mostrar.</p> :
      <table className="w-full text-sm"><thead><tr>{columns.map(c => <th key={c} className="p-2 text-left font-medium">{c}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}</tr>)}</tbody></table>}
  </CardContent></Card>;
}

export function AnalyticsDetails({ sales, customers, products, expenses, loadingProducts, loadingExpenses }: {
  sales?: SalesAnalytics; customers?: CustomerAnalytics; products?: ProductAnalytics; expenses?: ExpenseAnalytics;
  loadingProducts: boolean; loadingExpenses: boolean;
}) {
  const { formatCurrency: money } = useCompanyFormatting();
  const dates = [...new Set([...(sales?.evolution.map(row => row.date) ?? []), ...(expenses?.evolution.map(row => row.date) ?? [])])].sort();
  const income = new Map(sales?.evolution.map(row => [row.date, row.sales]));
  const costs = new Map(expenses?.evolution.map(row => [row.date, row.expenses]));
  const evolution = dates.map(date => ({ date, Ventas: income.get(date) ?? 0, Gastos: costs.get(date) ?? 0 }));
  return <div className="space-y-6">
    <p className="text-xs text-muted-foreground">Ventas menos gastos no descuenta el costo de la mercadería; no representa utilidad neta. Los márgenes usan el costo guardado al vender.</p>
    {sales && <SummaryTable title="Actividad del período" columns={['Ventas realizadas', 'Ticket promedio', 'Unidades vendidas']} rows={[[sales.sales_count, money(sales.average_ticket), sales.quantity_sold]]} />}
    <div className="grid gap-6 lg:grid-cols-2">
      {sales && <>
        <SummaryTable title="Ventas por categoría" columns={['Categoría', 'Ingresos']} rows={sales.sales_by_category.map(r => [r.category_name ?? 'Sin categoría', money(r.revenue)])} />
        <SummaryTable title="Ventas por método de pago" columns={['Método', 'Total']} rows={sales.sales_by_payment_method.map(r => [r.payment_method_name ?? 'Sin método', money(r.total)])} />
        <SummaryTable title="Productos más vendidos" columns={['Producto', 'Unidades']} rows={sales.top_products_by_quantity.map(r => [r.name, r.quantity_sold])} />
      </>}
      {customers && <SummaryTable title="Clientes" columns={['Indicador', 'Cantidad']} rows={[
        ['Nuevos en el período', customers.new], ['Con compras en el período', customers.active],
        ['Recurrentes (histórico)', customers.recurring], [`Sin compras hace ${customers.inactivity_threshold_days} días (actual)`, customers.inactive],
      ]} />}
    </div>
    {loadingExpenses && <Skeleton className="h-48 w-full" />}
    {expenses && <div className="grid gap-6 lg:grid-cols-2">
      <SummaryTable title="Gastos por categoría" columns={['Categoría', 'Total']} rows={expenses.expenses_by_category.map(r => [r.category_name, money(r.total)])} />
      {sales && <Card><CardHeader><CardTitle>Ventas y gastos por día</CardTitle></CardHeader><CardContent>
        {evolution.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos en este período.</p> :
          <ResponsiveContainer width="100%" height={260}><BarChart data={evolution}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={12} />
            <Tooltip formatter={value => money(Number(value))} /><Bar dataKey="Ventas" fill="#16a34a" /><Bar dataKey="Gastos" fill="#dc2626" />
          </BarChart></ResponsiveContainer>}
      </CardContent></Card>}
    </div>}
    {loadingProducts && <Skeleton className="h-48 w-full" />}
    {products && <>
      <h2 className="text-lg font-semibold">Productos e inventario</h2>
      <p className="text-sm text-muted-foreground">{products.total_products} productos activos. El stock corresponde al estado actual; las ventas y márgenes corresponden al período seleccionado.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryTable title={`Stock bajo (hasta ${products.low_stock_threshold} unidades)`} columns={['Producto', 'Stock actual']} rows={products.low_stock.map(r => [r.name, r.stock])} />
        <SummaryTable title="Productos agotados" columns={['Producto', 'Stock actual']} rows={products.out_of_stock.map(r => [r.name, r.stock])} />
        <SummaryTable title="Productos menos vendidos" columns={['Producto', 'Unidades']} rows={products.least_sold_products.map(r => [r.name, r.quantity_sold])} />
        <SummaryTable title="Sin ventas en el período" columns={['Producto', 'Stock actual']} rows={products.never_sold_products.map(r => [r.name, r.stock])} />
        <SummaryTable title="Margen de ventas con costo conocido" columns={['Producto', 'Ingresos', 'Costo', 'Margen']} rows={products.products_by_margin.map(r => [r.name, money(r.revenue), money(r.estimated_cost), money(r.estimated_margin)])} />
        <SummaryTable title="Productos con ventas sin costo registrado (margen incompleto)" columns={['Producto']} rows={products.products_margin_not_available.map(r => [r.name])} />
      </div>
    </>}
  </div>;
}
