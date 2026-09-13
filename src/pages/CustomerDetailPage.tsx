import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { getCustomer, updateCustomer } from '@/api/endpoints/customers';
import { getSales } from '@/api/endpoints/sales';
import type { CustomerFormData } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function formatCurrency(value: string) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value));
}

function InfoRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomerFormData>>({});

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    enabled: !!customerId,
  });

  const { data: allSales, isLoading: loadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: getSales,
  });

  const customerSales = allSales?.filter((s) => s.customer === customerId) ?? [];
  const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.total), 0);

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        notes: customer.notes ?? '',
      });
    }
  }, [customer]);

  const mutation = useMutation({
    mutationFn: (data: Partial<CustomerFormData>) => updateCustomer(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente actualizado correctamente');
      setIsEditing(false);
    },
  });

  const handleChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        notes: customer.notes ?? '',
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-destructive">Cliente no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-muted-foreground">Cliente desde {formatDate(customer.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!isEditing ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Información</CardTitle>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <InfoRow label="Nombre" value={customer.first_name} />
                <InfoRow label="Apellido" value={customer.last_name} />
                <InfoRow label="Email" value={customer.email} />
                <InfoRow label="Teléfono" value={customer.phone} />
                <InfoRow label="Ciudad" value={customer.city} />
                <InfoRow label="Dirección" value={customer.address} full />
                <InfoRow label="Notas" value={customer.notes} full />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Editar información</CardTitle>
              </CardHeader>
              <CardContent>
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
                  <div className="flex gap-3">
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Historial de compras</CardTitle>
              <CardDescription>Ventas registradas para este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Este cliente aún no tiene compras registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                          <TableCell>
                            <Badge variant={sale.status === 'Completed' ? 'default' : 'destructive'}>
                              {sale.status === 'Completed' ? 'Completada' : 'Cancelada'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de compras</span>
              <span className="font-medium">{customerSales.length}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total gastado</span>
                <span>{formatCurrency(totalSpent.toString())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}