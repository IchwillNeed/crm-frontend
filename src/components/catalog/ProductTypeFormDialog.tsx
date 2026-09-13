import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSubcategories, createProductType, updateProductType } from '@/api/endpoints/catalog';
import type { ProductType } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType?: ProductType | null;
}

export function ProductTypeFormDialog({ open, onOpenChange, productType }: Props) {
  const [name, setName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const isEditing = !!productType;

  const { data: subcategories } = useQuery({ queryKey: ['subcategories'], queryFn: getSubcategories });

  useEffect(() => {
    setName(productType?.name ?? '');
    setSubcategoryId(productType?.subcategory ?? null);
  }, [productType, open]);

  const createMutation = useMutation({
    mutationFn: createProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { subcategory: number; name: string }) => updateProductType(productType!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      onOpenChange(false);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subcategoryId) return;
    const data = { subcategory: subcategoryId, name };
    isEditing ? updateMutation.mutate(data) : createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tipo de producto' : 'Nuevo tipo de producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Subcategoría</Label>
            <Select
              value={subcategoryId?.toString() ?? ''}
              onValueChange={(val) => setSubcategoryId(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {subcategories?.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id.toString()}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !subcategoryId}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}