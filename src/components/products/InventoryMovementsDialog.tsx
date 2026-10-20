import { useQuery } from '@tanstack/react-query';
import { getInventoryMovements } from '@/api/endpoints/catalog';
import type { InventoryMovementType, Product } from '@/types/catalog';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { exportCsv } from '@/lib/export-csv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  sale: 'Venta',
  purchase_cancel: 'Anulación de compra',
  sale_cancel: 'Anulación de venta',
  sale_reactivate: 'Reactivación de venta',
  purchase: 'Compra',
  restock: 'Reposición',
  return: 'Devolución',
  adjustment_in: 'Ajuste (+)',
  adjustment_out: 'Ajuste (-)',
  damage: 'Dañado',
  loss: 'Pérdida / Merma',
};

interface InventoryMovementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function InventoryMovementsDialog({
  open,
  onOpenChange,
  product,
}: InventoryMovementsDialogProps) {
  const { formatDate } = useCompanyFormatting();

  const { data: movements, isLoading } = useQuery({
    queryKey: ['inventory-movements', product?.id ?? 'all'],
    queryFn: () => getInventoryMovements(product ? { product: product.id } : undefined),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle>
                {product ? `Kardex de movimientos: ${product.name}` : 'Historial general de movimientos de inventario'}
              </DialogTitle>
              <DialogDescription>
                Entradas, salidas, compras, ventas, devoluciones y ajustes manuales registrados.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!movements?.length}
              onClick={() =>
                exportCsv(
                  product ? `kardex_${product.id}.csv` : 'kardex_inventario.csv',
                  ['Fecha', 'Producto', 'Tipo', 'Variación', 'Stock resultante', 'Referencia', 'Notas', 'Usuario'],
                  movements?.map((m) => [
                    formatDate(m.created_at),
                    m.product_name,
                    MOVEMENT_LABELS[m.movement_type] ?? m.movement_type,
                    m.quantity_change,
                    m.stock_after,
                    m.reference ?? '',
                    m.notes ?? '',
                    m.username ?? '',
                  ]) ?? [],
                )
              }
            >
              Exportar Kardex CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                {!product && <TableHead>Producto</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Variación</TableHead>
                <TableHead className="text-right">Stock final</TableHead>
                <TableHead>Referencia / Motivo</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={product ? 6 : 7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !movements?.length ? (
                <TableRow>
                  <TableCell colSpan={product ? 6 : 7} className="text-center text-muted-foreground">
                    No hay movimientos de inventario registrados todavía.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(m.created_at)}</TableCell>
                    {!product && <TableCell className="font-medium">{m.product_name}</TableCell>}
                    <TableCell>
                      <Badge variant={m.quantity_change > 0 ? 'secondary' : 'outline'}>
                        {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.stock_after}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[m.reference, m.notes].filter(Boolean).join(' — ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{m.username ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

