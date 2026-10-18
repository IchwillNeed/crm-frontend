import { usePagedList } from '@/lib/use-paged-list';
import { exportCsv } from '@/lib/export-csv';
import { useCompanyFormatting } from '@/lib/company-formatting';
import { Can } from '@/components/shared/Can';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, PackagePlus, SlidersHorizontal, History } from 'lucide-react';
import { deleteProduct } from '@/api/endpoints/catalog';
import type { Product } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { RestockDialog } from '@/components/products/RestockDialog';
import { AdjustStockDialog } from '@/components/products/AdjustStockDialog';
import { InventoryMovementsDialog } from '@/components/products/InventoryMovementsDialog';


const LOW_STOCK_THRESHOLD = 5;

export function ProductsPage() {
  const { formatCurrency } = useCompanyFormatting();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
  const [kardexOpen, setKardexOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: products, isLoading, controls } = usePagedList<Product>('products', '/products/');

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeletingProduct(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de productos y movimientos de inventario</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setKardexProduct(null);
              setKardexOpen(true);
            }}
          >
            <History className="mr-2 h-4 w-4" />
            Historial Kardex
          </Button>
          <Can permission="catalog.write"><Button
            onClick={() => {
              setEditingProduct(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button></Can>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        <Button className="m-3" variant="outline" disabled={!products?.length} onClick={() => exportCsv("products.csv", ['ID', 'Producto', 'Precio', 'Costo', 'Stock'], products?.map(r => [r.id, r.name, r.price, r.cost, r.stock]) ?? [])}>Exportar página CSV</Button>
        {controls}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Stock</TableHead>
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
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay productos registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>{formatCurrency(product.cost)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{product.stock}</span>
                      <span className="text-xs text-muted-foreground" title="Stock mínimo configurado">
                        (mín. {product.min_stock ?? LOW_STOCK_THRESHOLD})
                      </span>
                      {product.stock <= (product.min_stock ?? LOW_STOCK_THRESHOLD) && (
                        <Badge variant="destructive">Bajo stock</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      aria-label="Ver Kardex"
                      variant="ghost"
                      size="icon"
                      title="Ver Kardex del producto"
                      onClick={() => {
                        setKardexProduct(product);
                        setKardexOpen(true);
                      }}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Can permission="catalog.write"><Button aria-label="Reabastecer"
                      variant="ghost"
                      size="icon"
                      title="Reabastecer"
                      onClick={() => setRestockingProduct(product)}
                    >
                      <PackagePlus className="h-4 w-4" />
                    </Button></Can>
                    <Can permission="catalog.write"><Button aria-label="Ajustar stock"
                      variant="ghost"
                      size="icon"
                      title="Ajustar stock / Registrar merma"
                      onClick={() => setAdjustingProduct(product)}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button></Can>
                    <Can permission="catalog.write"><Button aria-label="Editar"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingProduct(product);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button></Can>
                    <Can permission="delete"><Button aria-label="Eliminar" variant="ghost" size="icon" onClick={() => setDeletingProduct(product)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button></Can>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} />

      <RestockDialog
        open={!!restockingProduct}
        onOpenChange={() => setRestockingProduct(null)}
        product={restockingProduct}
      />

      <AdjustStockDialog
        open={!!adjustingProduct}
        onOpenChange={() => setAdjustingProduct(null)}
        product={adjustingProduct}
      />

      <InventoryMovementsDialog
        open={kardexOpen}
        onOpenChange={setKardexOpen}
        product={kardexProduct}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará "{deletingProduct?.name}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}