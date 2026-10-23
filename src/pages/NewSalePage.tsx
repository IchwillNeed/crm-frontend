import { errorMessage } from '@/lib/errors';
import { LoadingStatus } from '@/components/shared/LoadingState';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { Customer } from '@/types/customer';
import type { Product } from '@/types/catalog';
import { getPaymentMethods, createSale, } from '@/api/endpoints/sales';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RemoteSelect } from '@/components/shared/RemoteSelect';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';
import { usePermissions } from '@/lib/permissions';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface CartLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}


export function NewSalePage() {
  const { formatCurrency } = useCompanyFormatting();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const paymentQuery = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods });
  const paymentMethods = paymentQuery.data;

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  
  const handleAddToCart = () => {
    const product = selectedProduct;
    if (!product) return;

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) { setError('La cantidad debe ser un entero mayor a cero.'); return; }
    const inCart = cart.find(line => line.productId === product.id)?.quantity ?? 0;
    if (inCart + qty > product.stock) { setError('La cantidad supera el stock disponible.'); return; }
    setError('');

    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + qty } : line
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: Number(product.price),
        },
      ];
    });

    setSelectedProduct(null);
    setQuantity('1');
  };

  const handleRemoveLine = (productId: number) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const saleMutation = useMutation({
    mutationFn: createSale,
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError('');
    if (cart.length === 0) {
      setError('Agrega al menos un producto a la venta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sale = await saleMutation.mutateAsync({
        items: cart.map(line => ({ product: line.productId, quantity: line.quantity, unit_price: line.unitPrice })),
        customer: customer?.id ?? null,
        payment_method: paymentMethodId ? Number(paymentMethodId) : null,
        notes,
      });

      navigate(`/sales/${sale.id}`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" disabled={isSubmitting} onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva venta</h1>
          <p className="text-muted-foreground">Registra una nueva venta</p>
        </div>
      </div>

      <fieldset disabled={isSubmitting} aria-busy={isSubmitting} className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" style={{ overflow: 'visible' }}>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 basis-full space-y-2 sm:flex-1 sm:basis-0">
                <Label>Producto</Label>
                <RemoteSelect<Product>
                  path="/products/" params={{ active_only: 'true', in_stock: 'true' }}
                  label={p => `${p.name} — ${formatCurrency(Number(p.price))} (stock: ${p.stock})`}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  placeholder="Buscar producto..."
                />
              </div>
              <div className="w-24 space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <Button aria-label="Agregar producto" type="button" onClick={handleAddToCart}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio unit.</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Agrega productos a la venta
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((line) => (
                    <TableRow key={line.productId}>
                      <TableCell>{line.productName}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell>{formatCurrency(line.unitPrice)}</TableCell>
                      <TableCell>{formatCurrency(line.quantity * line.unitPrice)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(line.productId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card style={{ overflow: 'visible' }}>
          <CardHeader>
            <CardTitle>Detalles de la venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <RemoteSelect<Customer>
                path="/customers/" params={{ active_only: 'true' }}
                label={c => `${c.first_name} ${c.last_name}`}
                value={customer}
                onChange={setCustomer}
                placeholder="Buscar cliente..."
              />
              {can('customers.write') && (
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setCustomerDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Método de pago (opcional)</Label>
              <Select disabled={isSubmitting || paymentQuery.isPending || !paymentMethods} value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder={paymentQuery.isPending ? 'Cargando métodos…' : 'Sin especificar'} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods?.filter(pm => pm.is_active).map((pm) => (
                    <SelectItem key={pm.id} value={pm.id.toString()}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentQuery.isFetching && <LoadingStatus label="Cargando métodos de pago…" />}
              {paymentQuery.isError && <p role="alert" className="text-sm text-destructive">No se pudieron cargar los métodos de pago. <Button type="button" variant="outline" onClick={() => void paymentQuery.refetch()}>Reintentar</Button></p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-notes">Notas</Label>
              <Input id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? <LoadingStatus label="Registrando…" slowMessage={false} /> : 'Registrar venta'}
            </Button>
            {isSubmitting && <LoadingStatus label="Estamos guardando la venta. Espera antes de salir." slowMessage="Está tardando más de lo habitual. No vuelvas a enviar la venta; espera la confirmación." />}
          </CardContent>
        </Card>
      </fieldset>
      <CustomerFormDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} onCreated={setCustomer} />
    </div>
  );
}
