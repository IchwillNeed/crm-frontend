import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPurchase, getSuppliers } from '@/api/endpoints/purchases';
import { getProducts } from '@/api/endpoints/catalog';
import { getPaymentMethods } from '@/api/endpoints/sales';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { errorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineDraft {
  product: string;
  quantity: string;
  unit_cost: string;
}

export function NewPurchaseDialog(props: NewPurchaseDialogProps) {
  return props.open ? <NewPurchaseDialogBody {...props} /> : null;
}

function NewPurchaseDialogBody({ open, onOpenChange }: NewPurchaseDialogProps) {
  const { formatCurrency } = useCompanyFormatting();
  const queryClient = useQueryClient();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods });

  const [supplierId, setSupplierId] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ product: '', quantity: '1', unit_cost: '' }]);

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Compra registrada y stock actualizado');
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  };

  const handleProductSelect = (idx: number, productId: string) => {
    const prod = products?.find((p) => String(p.id) === productId);
    updateLine(idx, {
      product: productId,
      unit_cost: prod?.cost ?? '',
    });
  };

  const totalEstimated = lines.reduce((acc, line) => {
    const qty = Number(line.quantity) || 0;
    const cost = Number(line.unit_cost) || 0;
    return acc + qty * cost;
  }, 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validItems = lines
      .filter((l) => l.product && Number(l.quantity) > 0 && l.unit_cost !== '')
      .map((l) => ({
        product: Number(l.product),
        quantity: Number(l.quantity),
        unit_cost: l.unit_cost,
      }));

    if (validItems.length === 0) {
      toast.error('Agrega al menos un producto con cantidad y costo.');
      return;
    }

    mutation.mutate({
      supplier: supplierId ? Number(supplierId) : null,
      payment_method: paymentMethodId ? Number(paymentMethodId) : null,
      notes: notes.trim() || null,
      items: validItems,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar compra a proveedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-supplier">Proveedor (opcional)</Label>
              <select
                id="purchase-supplier"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sin proveedor específico</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-payment">Método de pago</Label>
              <select
                id="purchase-payment"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {paymentMethods?.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos comprados</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, { product: '', quantity: '1', unit_cost: '' }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Añadir línea
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <select
                      aria-label="Producto"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                      value={line.product}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      required
                    >
                      <option value="">Seleccionar producto…</option>
                      {products?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Cant."
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Costo unit."
                      value={line.unit_cost}
                      onChange={(e) => updateLine(idx, { unit_cost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-notes">Notas</Label>
            <Textarea id="purchase-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total compra:</span>
            <span className="text-lg font-bold">{formatCurrency(totalEstimated)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Registrando...' : 'Registrar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

