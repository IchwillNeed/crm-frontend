import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye } from 'lucide-react';
import { getSales, deleteSale } from '@/api/endpoints/sales';
import { getCustomers } from '@/api/endpoints/customers';
import type { Sale } from '@/types/sale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function formatCurrency(value: string) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SalesPage() {
  const navigate = useNavigate();
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const queryClient = useQueryClient();

  const { data: sales, isLoading } = useQuery({ queryKey: ['sales'], queryFn: getSales });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });

  const deleteMutation = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setDeletingSale(null);
    },
  });

  const customerName = (id: number | null) => {
    if (!id) return 'Sin cliente';
    const c = customers?.find((c) => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">Historial de ventas registradas</p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva venta
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
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
                  No hay ventas registradas todavía.
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.sale_date)}</TableCell>
                  <TableCell>{customerName(sale.customer)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>
                      {sale.status === 'Completed' ? 'Completada' : 'Cancelada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/sales/${sale.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingSale(sale)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deletingSale} onOpenChange={() => setDeletingSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la venta y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSale && deleteMutation.mutate(deletingSale.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}