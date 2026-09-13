import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { getCustomers } from '@/api/endpoints/customers';
import { getProducts } from '@/api/endpoints/catalog';
import { getPaymentMethods, createSale, addSaleItem, getSale } from '@/api/endpoints/sales';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
   SearchableSelect, type SearchableSelectOption 
} from '@/components/shared/SearchableSelect';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface CartLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);
}

export function NewSalePage() {
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods });

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  
  const productOptions: SearchableSelectOption[] = (products ?? []).map((p) => ({
    value: p.id.toString(),
    label: `${p.name} — ${formatCurrency(Number(p.price))} (stock: ${p.stock})`,
  }));

  const customerOptions: SearchableSelectOption[] = (customers ?? []).map((c) => ({
    value: c.id.toString(),
    label: `${c.first_name} ${c.last_name}`,
  }));

  
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products?.find((p) => p.id === Number(selectedProductId));
    if (!product) return;

    const qty = Number(quantity);
    if (qty <= 0) return;

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

    setSelectedProductId('');
    setQuantity('1');
  };

  const handleRemoveLine = (productId: number) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const saleMutation = useMutation({
    mutationFn: createSale,
  });

  const handleSubmit = async () => {
    setError('');
    if (cart.length === 0) {
      setError('Agrega al menos un producto a la venta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sale = await saleMutation.mutateAsync({
        customer: customerId ? Number(customerId) : null,
        payment_method: paymentMethodId ? Number(paymentMethodId) : null,
        notes,
      });

      // Agregamos cada item secuencialmente
      for (const line of cart) {
        await addSaleItem({
          sale: sale.id,
          product: line.productId,
          quantity: line.quantity,
          unit_price: line.unitPrice,
        });
      }

      navigate('/sales');
    } catch (err) {
      setError('Ocurrió un error al registrar la venta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva venta</h1>
          <p className="text-muted-foreground">Registra una nueva venta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Producto</Label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  placeholder="Buscar producto..."
                  emptyText="No se encontraron productos."
                />
              </div>
              <div className="w-24 space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <Button type="button" onClick={handleAddToCart}>
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

        <Card>
          <CardHeader>
            <CardTitle>Detalles de la venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Buscar cliente..."
                emptyText="No se encontraron clientes."
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago (opcional)</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id.toString()}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
              {isSubmitting ? 'Registrando...' : 'Registrar venta'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}