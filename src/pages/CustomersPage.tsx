import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';
import { errorMessage } from '@/lib/errors';
import { usePagedList } from '@/lib/use-paged-list';
import { Can } from '@/components/shared/Can';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { deleteCustomer } from '@/api/endpoints/customers';
import type { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog';

export function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const { data: customers, isLoading, controls, searching, clearSearch } = usePagedList<Customer>('customers', '/customers/');

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeletingCustomer(null);
    },
  });

  const handleCreate = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes de tu negocio</p>
        </div>
        <Can permission="customers.write"><Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo cliente
        </Button></Can>
      </div>

      <div className="rounded-md border bg-background">
        {controls}
        <Table mobileCards>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  <EmptyState title="Aún no tienes clientes" description="Registra tu primer cliente para asociar sus compras y consultar su historial." searching={searching} clearSearch={clearSearch}><Can permission="customers.write"><Button onClick={handleCreate}>Crear primer cliente</Button></Can></EmptyState>
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell data-label="Nombre" className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </TableCell>
                  <TableCell data-label="Email">{customer.email || '—'}</TableCell>
                  <TableCell data-label="Teléfono">{customer.phone || '—'}</TableCell>
                  <TableCell data-label="Ciudad">{customer.city || '—'}</TableCell>
                  <TableCell data-label="Acciones" className="text-right">
                    <Button aria-label="Ver detalle" variant="ghost" size="icon" onClick={() => navigate(`/customers/${customer.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Can permission="customers.write"><Button aria-label="Editar" variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                      <Pencil className="h-4 w-4" />
                    </Button></Can>
                    <Can permission="delete"><Button aria-label="Eliminar" variant="ghost" size="icon" onClick={() => setDeletingCustomer(customer)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button></Can>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
      />

      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a {deletingCustomer?.first_name} {deletingCustomer?.last_name}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
