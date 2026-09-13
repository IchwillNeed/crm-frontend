import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getSale, getPaymentMethods } from '@/api/endpoints/sales';
import { getCustomers } from '@/api/endpoints/customers';
import { getProducts } from '@/api/endpoints/catalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function formatCurrency(value: string) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const saleId = Number(id);

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
                  <TableHead>Costo unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Esta venta no tiene productos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{productName(item.product)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>
                        {item.unit_cost !== null ? formatCurrency(item.unit_cost) : 'N/D'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
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
    </div>
  );
}