import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/components/shared/EmptyState';
import { exportCsv } from '@/lib/export-csv';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { Can } from '@/components/shared/Can';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { getCustomers } from '@/api/endpoints/customers';
import type { Sale } from '@/types/sale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';




export function SalesPage() {
  const { formatCurrency, formatDate } = useCompanyFormatting();
  const navigate = useNavigate();

  const { data: sales, isLoading, controls, searching, clearSearch } = usePagedList<Sale>('sales', '/sales/');
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });

  const customerName = (id: number | null) => {
    if (!id) return 'Sin cliente';
    const c = customers?.find((c) => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">Historial de ventas registradas</p>
        </div>
        <Can permission="sales.create"><Button onClick={() => navigate('/sales/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva venta
        </Button></Can>
      </div>

      <div className="rounded-md border bg-background">
        <Button className="m-3" variant="outline" disabled={!sales?.length} onClick={() => exportCsv("sales.csv", ['ID', 'Fecha', 'Total', 'Estado'], sales?.map(r => [r.id, r.sale_date, r.total, r.status]) ?? [])}>Exportar página CSV</Button>
        {controls}
        <Table mobileCards>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <EmptyState title="Aún no registraste ventas" description="Cuando registres una venta, podrás consultar aquí sus productos, importe y estado." searching={searching} clearSearch={clearSearch}><Can permission="sales.create"><Button onClick={() => navigate('/sales/new')}>Registrar primera venta</Button></Can></EmptyState>
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell data-label="Fecha">{formatDate(sale.sale_date)}</TableCell>
                  <TableCell data-label="Cliente">{customerName(sale.customer)}</TableCell>
                  <TableCell data-label="Total" className="font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell data-label="Estado">
                    <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>
                      {sale.status === 'Completed' ? 'Completada' : 'Cancelada'}
                    </Badge>
                  </TableCell>
                  <TableCell data-label="Acciones" className="text-right">
                      <Button aria-label="Ver detalle" variant="ghost" size="icon" onClick={() => navigate(`/sales/${sale.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>

                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


    </div>
  );
}
