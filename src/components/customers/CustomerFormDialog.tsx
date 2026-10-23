import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer, updateCustomer } from '@/api/endpoints/customers';
import { errorMessage } from '@/lib/errors';
import type { Customer, CustomerFormData } from '@/types/customer';
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

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onCreated?: (customer: Customer) => void;
}

const emptyForm: Partial<CustomerFormData> = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  notes: '',
  accepts_marketing: false,
};

export function CustomerFormDialog(props: CustomerFormDialogProps) {
  return props.open ? <CustomerFormDialogBody key={props.customer?.id ?? "new"} {...props} /> : null;
}

function CustomerFormDialogBody({ open, onOpenChange, customer, onCreated }: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<Partial<CustomerFormData>>(customer ? { first_name: customer.first_name, last_name: customer.last_name, email: customer.email ?? '', phone: customer.phone ?? '', address: customer.address ?? '', city: customer.city ?? '', notes: customer.notes ?? '', accepts_marketing: customer.accepts_marketing ?? false } : emptyForm);
  const queryClient = useQueryClient();
  const isEditing = !!customer;


  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (createdCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['remote-select', '/customers/'] });
      onCreated?.(createdCustomer);
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerFormData>) => updateCustomer(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!isSubmitting) onOpenChange(nextOpen); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone ?? ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city ?? ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address ?? ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              id="accepts_marketing"
              type="checkbox"
              checked={Boolean(formData.accepts_marketing)}
              onChange={(e) => setFormData((prev) => ({ ...prev, accepts_marketing: e.target.checked }))}
              className="h-4 w-4 rounded border"
            />
            <span>Autorización de promociones registrada</span>
          </label>

          <p className="text-xs text-muted-foreground">
            Activa esta casilla solo tras obtener autorización. Registra fecha, medio y referencia del respaldo en Notas. La casilla no demuestra cómo se obtuvo.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
          {(createMutation.isError || updateMutation.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(createMutation.error ?? updateMutation.error)}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
