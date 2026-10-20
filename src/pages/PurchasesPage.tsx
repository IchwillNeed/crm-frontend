import { toast } from 'sonner';
import { errorMessage } from '@/lib/errors';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePagedList } from '@/lib/use-paged-list';
import { exportCsv } from '@/lib/export-csv';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { usePermissions } from '@/lib/permissions';
import { cancelPurchase, deleteSupplier, getSuppliers } from '@/api/endpoints/purchases';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Purchase, Supplier } from '@/types/purchase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SupplierFormDialog } from '@/components/purchases/SupplierFormDialog';
import { NewPurchaseDialog } from '@/components/purchases/NewPurchaseDialog';

export function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compras y Proveedores</h1>
        <p className="text-muted-foreground">
          Registra compras de mercadería para abastecer inventario y actualizar costos promedio
        </p>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <PurchasesTab />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PurchasesTab() {
  const { formatCurrency, formatDate } = useCompanyFormatting();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const cancellation = useMutation({
    mutationFn: cancelPurchase,
    onError: error => toast.error(errorMessage(error)),
    onSuccess: purchase => {
      setSelected(purchase);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Compra anulada. Registra una nueva compra con los datos correctos.');
    },
  });

  const { data: purchases, isLoading, controls } = usePagedList<Purchase>('purchases', '/purchases/');
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });

  const supplierName = (id: number | null) =>
    id ? (suppliers?.find((s) => s.id === id)?.name ?? `#${id}`) : '—';

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva compra
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Button
          className="m-3"
          variant="outline"
          disabled={!purchases?.length}
          onClick={() =>
            exportCsv(
              'purchases.csv',
              ['ID', 'Fecha', 'Proveedor', 'Artículos', 'Total original', 'Estado'],
              purchases?.map((p) => [
                p.id,
                p.purchase_date,
                supplierName(p.supplier),
                p.items.length,
                p.total,
                p.cancelled_at ? 'Anulada' : 'Recibida',
              ]) ?? []
            )
          }
        >
          Exportar página CSV
        </Button>
        {controls}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Líneas</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado / detalle</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : purchases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay compras registradas todavía.
                </TableCell>
              </TableRow>
            ) : (
              purchases?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">#{p.id}</TableCell>
                  <TableCell>{formatDate(p.purchase_date)}</TableCell>
                  <TableCell>{supplierName(p.supplier)}</TableCell>
                  <TableCell>{p.items.length}</TableCell>
                  <TableCell>{p.notes || '—'}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.total)}</TableCell>
                  <TableCell><Button variant="outline" onClick={() => { setSelected(p); setReason(''); }}>{p.cancelled_at ? 'Anulada' : 'Ver compra'}</Button></TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewPurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <Dialog open={!!selected} onOpenChange={open => { if (!open && !cancellation.isPending) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compra #{selected?.id}</DialogTitle>
            <DialogDescription>Anular retira del inventario todas las unidades recibidas y conserva el documento. Después registra la compra correcta. No modifica costos históricos de ventas ya realizadas ni registra reembolsos.</DialogDescription>
          </DialogHeader>
          {selected?.items.map(item => <p key={item.id}>Producto #{item.product}: {item.quantity} × {formatCurrency(item.unit_cost)} = {formatCurrency(item.subtotal)}</p>)}
          {selected?.cancelled_at ? <p>Anulada: {selected.cancellation_reason}</p> : <>
            <label>Motivo de anulación<Textarea aria-label="Motivo de anulación" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
            <Button variant="destructive" disabled={!reason.trim() || cancellation.isPending} onClick={() => selected && cancellation.mutate({ id: selected.id, reason: reason.trim() })}>Confirmar anulación de compra</Button>
          </>}
        </DialogContent>
      </Dialog>


    </div>
  );
}

function SuppliersTab() {
  const { can } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading, controls } = usePagedList<Supplier>('suppliers', '/suppliers/');

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleting(null);
    },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo proveedor
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {controls}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
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
            ) : suppliers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay proveedores registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              suppliers?.map((sup) => (
                <TableRow key={sup.id}>
                  <TableCell className="font-medium">{sup.name}</TableCell>
                  <TableCell>{sup.contact_name || '—'}</TableCell>
                  <TableCell>{sup.phone || '—'}</TableCell>
                  <TableCell>{sup.email || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(sup);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {can('delete') && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(sup)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

