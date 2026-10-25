import { useFormFeedback } from '@/lib/use-form-feedback';
import { FieldError } from '@/components/shared/FieldError';
import { useState, type FormEvent } from 'react';
import { LoadingStatus } from '@/components/shared/LoadingState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, updateProduct } from '@/api/endpoints/catalog';
import type { Product } from '@/types/catalog';
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
import { CategorySelector } from './CategorySelector';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog(props: ProductFormDialogProps) {
  return props.open ? <ProductFormDialogBody key={props.product?.id ?? "new"} {...props} /> : null;
}

function ProductFormDialogBody({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEditing = !!product;
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const queryClient = useQueryClient();
  const feedback = useFormFeedback(["name", "description", "price", "cost", "stock", "min_stock"]);

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [cost, setCost] = useState(product?.cost ?? '');
  const [stock, setStock] = useState(product?.stock.toString() ?? '0');
  const [minStock, setMinStock] = useState((product?.min_stock ?? 5).toString());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [productTypeId, setProductTypeId] = useState<number | null>(product?.product_type ?? null);


  const createMutation = useMutation({
    meta: { inlineErrors: true },
    mutationFn: createProduct,
    onError: feedback.serverError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    meta: { inlineErrors: true },
    onError: feedback.serverError,
    mutationFn: (data: Partial<Product>) => updateProduct(product!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !feedback.validate(e.currentTarget as HTMLFormElement)) return;

    if (isEditing) {
      // Al editar, no se manda stock/cost (bloqueado por backend, ver restock)
      updateMutation.mutate({
        name,
        description,
        price,
        min_stock: Number(minStock),
        product_type: productTypeId,
        is_active: isActive,
      });
    } else {
      createMutation.mutate({
        name,
        description,
        price,
        cost: cost || null,
        stock: Number(stock),
        min_stock: Number(minStock),
        product_type: productTypeId,
        is_active: isActive,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!isSubmitting) onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} onChange={event => { if (event.target instanceof HTMLElement) feedback.clear(event.target.id); }} className="space-y-4">
          <CategorySelector
            categoryId={categoryId}
            subcategoryId={subcategoryId}
            productTypeId={productTypeId}
            onCategoryChange={setCategoryId}
            onSubcategoryChange={setSubcategoryId}
            onProductTypeChange={setProductTypeId}
          />

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...feedback.props("name")} value={name} onChange={(e) => setName(e.target.value)} required />
              <FieldError id={feedback.errorId("name")} message={feedback.errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description" {...feedback.props("description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
              <FieldError id={feedback.errorId("description")} message={feedback.errors.description} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price" min="0" {...feedback.props("price")}
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <FieldError id={feedback.errorId("price")} message={feedback.errors.price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Stock mínimo (alerta)</Label>
              <Input
                id="min_stock" {...feedback.props("min_stock")}
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                required
              />
              <FieldError id={feedback.errorId("min_stock")} message={feedback.errors.min_stock} />
            </div>
            {!isEditing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo inicial</Label>
                  <Input
                    id="cost" min="0" {...feedback.props("cost")}
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
              <FieldError id={feedback.errorId("cost")} message={feedback.errors.cost} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock inicial</Label>
                  <Input
                    id="stock" min="0" {...feedback.props("stock")}
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
              <FieldError id={feedback.errorId("stock")} message={feedback.errors.stock} />
                </div>
              </>
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-muted-foreground">
              El stock y costo se gestionan desde la acción "Reabastecer" en la tabla.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />Producto activo (disponible para nuevas ventas)</label>
          <FieldError id={feedback.errorId("form")} message={feedback.summary} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoadingStatus label="Guardando…" slowMessage={false} /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
