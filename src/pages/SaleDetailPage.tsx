import { useState, type FormEvent } from 'react';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/lib/permissions';
import { Can } from '@/components/shared/Can';
import { getSale, getPaymentMethods, updateSaleStatus, partialReturnSale } from '@/api/endpoints/sales';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { getCustomers } from '@/api/endpoints/customers';
import { getProducts } from '@/api/endpoints/catalog';
import { errorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import type { SaleItem } from '@/types/sale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export function SaleDetailPage() {
  const { can } = usePermissions();
  const showCosts = can('costs.read');
  const { formatCurrency, formatDate } = useCompanyFormatting();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saleId = Number(id);

  const [returningItem, setReturningItem] = useState<SaleItem | null>(null);
  const [returnQty, setReturnQty] = useState('1');
  const [returnReason, setReturnReason] = useState('');
  const [restockConfirmed, setRestockConfirmed] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: 'Completed' | 'Cancelled') => updateSaleStatus(saleId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const returnMutation = useMutation({
    mutationFn: (payload: { sale_item: number; quantity: number; reason?: string; restock_confirmed: boolean }) =>
      partialReturnSale(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Devolución registrada y stock actualizado');
      setReturningItem(null);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSale(saleId),
    enabled: !!saleId,
  });

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods });

  const customerName = (customerId: number | null) => {
    if (!customerId) return 'Sin cliente';
    const c = customers?.find((c) => c.id === customerId);
    return c ? `${c.first_name} ${c.last_name}` : '—';
  };

  const productName = (productId: number) => {
    return products?.find((p) => p.id === productId)?.name ?? `Producto #${productId}`;
  };

  const paymentMethodName = (pmId: number | null) => {
    if (!pmId) return 'Sin especificar';
    return paymentMethods?.find((pm) => pm.id === pmId)?.name ?? '—';
  };

  const openReturnDialog = (item: SaleItem) => {
    setReturningItem(item);
    setReturnQty('1');
    setReturnReason('');
    setRestockConfirmed(false);
  };

  const handleReturnSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!returningItem || !restockConfirmed) return;
    returnMutation.mutate({
      sale_item: returningItem.id,
      restock_confirmed: restockConfirmed,
      quantity: Number(returnQty),
      reason: returnReason.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!sale) {
    return <p className="text-destructive">Venta no encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Venta #{sale.id}</h1>
          <p className="text-muted-foreground">{formatDate(sale.sale_date)}</p>
        </div>
        <Badge
          variant={sale.status === 'Completed' ? 'default' : 'destructive'}
          className="ml-auto"
        >
          {sale.status === 'Completed' ? 'Completada' : 'Cancelada'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>Imprimir comprobante</Button>
        <Can permission="sales.update">
          <Button
            variant="outline"
            disabled={statusMutation.isPending}
            onClick={() => {
              const cancelling = sale.status === 'Completed';
              if (
                window.confirm(
                  cancelling
                    ? '¿Cancelar esta venta? Se devolverán las unidades al inventario.'
                    : '¿Reactivar esta venta? Se descontarán las unidades del inventario.'
                )
              ) {
                statusMutation.mutate(cancelling ? 'Cancelled' : 'Completed');
              }
            }}
          >
            {sale.status === 'Completed' ? 'Cancelar venta' : 'Reactivar venta'}
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio unit.</TableHead>
                  {showCosts && <TableHead className="print:hidden">Costo unit.</TableHead>}
                  <TableHead className="text-right">Subtotal</TableHead>
                  {sale.status === 'Completed' && (
                    <Can permission="sales.update">
                      <TableHead className="text-right print:hidden">Devolución</TableHead>
                    </Can>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Esta venta no tiene productos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{productName(item.product)}</TableCell>
                      <TableCell>
                        <span>{item.quantity}</span>
                        {(item.returned_quantity ?? 0) > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Devueltas: {item.returned_quantity})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      {showCosts && <TableCell className="print:hidden">
                        {item.unit_cost != null ? formatCurrency(item.unit_cost) : 'N/D'}
                      </TableCell>}
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      {sale.status === 'Completed' && (
                        <Can permission="sales.update">
                          <TableCell className="text-right print:hidden">
                            {item.quantity > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReturnDialog(item)}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Devolver
                              </Button>
                            )}
                          </TableCell>
                        </Can>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{customerName(sale.customer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método de pago</span>
              <span className="font-medium">{paymentMethodName(sale.payment_method)}</span>
            </div>
            {sale.notes && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Notas</span>
                <p className="font-medium">{sale.notes}</p>
              </div>
            )}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(sale.returns?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad devuelta</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Reembolso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.returns!.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell>{formatDate(ret.created_at)}</TableCell>
                    <TableCell className="font-medium">{productName(ret.product)}</TableCell>
                    <TableCell>{ret.quantity}</TableCell>
                    <TableCell>{ret.reason || '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(ret.refund_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!returningItem} onOpenChange={(open) => !open && setReturningItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Devolver {returningItem ? productName(returningItem.product) : 'producto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-qty">
                Cantidad a devolver (máx. {returningItem?.quantity ?? 1})
              </Label>
              <Input
                id="return-qty"
                type="number"
                min={1}
                max={returningItem?.quantity ?? 1}
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-reason">Motivo (opcional)</Label>
              <Input
                id="return-reason"
                placeholder="Ej. Cambio de opinión; producto en buen estado"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={restockConfirmed} onChange={e => setRestockConfirmed(e.target.checked)} required />
              Confirmo que todas las unidades están aptas para volver a vender. Este flujo no admite productos dañados.
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturningItem(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={returnMutation.isPending || !restockConfirmed}>
                {returnMutation.isPending ? 'Procesando...' : 'Confirmar devolución'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

