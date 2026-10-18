import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustProductStock } from '@/api/endpoints/catalog';
import type { Product, StockAdjustmentType } from '@/types/catalog';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function AdjustStockDialog({ open, onOpenChange, product }: AdjustStockDialogProps) {
  const [movementType, setMovementType] = useState<StockAdjustmentType>('adjustment_out');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adjustProductStock(product!.id, {
        movement_type: movementType,
        quantity: Number(quantity),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      setQuantity('1');
      setNotes('');
      setError('');
      onOpenChange(false);
    },
    onError: (err) => {
      setError(errorMessage(err));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock: {product?.name}</DialogTitle>
          <DialogDescription>
            Stock actual: {product?.stock} unidades. Registra ajustes manuales, pérdidas o unidades dañadas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movement_type">Tipo de movimiento</Label>
            <select
              id="movement_type"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as StockAdjustmentType)}
              className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="adjustment_in">Ajuste positivo (+ entrada)</option>
              <option value="adjustment_out">Ajuste negativo (- salida)</option>
              <option value="damage">Producto dañado (- salida)</option>
              <option value="loss">Pérdida / Merma (- salida)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust_quantity">Cantidad de unidades</Label>
            <Input
              id="adjust_quantity"
              type="number"
              min="1"
              max={movementType === 'adjustment_in' ? undefined : Math.max(product?.stock ?? 1, 1)}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust_notes">Motivo / Observación</Label>
            <Input
              id="adjust_notes"
              placeholder="Ej. Conteo físico mensual, empaque roto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Confirmar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

