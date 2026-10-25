type Choice = [string, string];
export interface ListFilterConfig {
  monthLabel: string;
  sort: Choice[];
  fields: { key: string; label: string; choices: Choice[] }[];
}
const recent: Choice[] = [['recent', 'Más recientes'], ['oldest', 'Más antiguos']];
const names: Choice[] = [['name_asc', 'Nombre: A–Z'], ['name_desc', 'Nombre: Z–A']];
const active: Choice[] = [['active', 'Activos'], ['inactive', 'Inactivos']];
export const listFilterConfig: Record<string, ListFilterConfig> = {
  products: { monthLabel: 'Mes de registro', sort: [...recent, ...names, ['price_asc', 'Menor precio'], ['price_desc', 'Mayor precio'], ['stock_asc', 'Menor stock'], ['stock_desc', 'Mayor stock']], fields: [
    { key: 'status', label: 'Estado', choices: active },
    { key: 'stock', label: 'Inventario', choices: [['available', 'Con stock'], ['low', 'Stock bajo (incluye agotados)'], ['empty', 'Sin stock']] },
  ] },
  customers: { monthLabel: 'Mes de registro', sort: [...recent, ...names], fields: [
    { key: 'status', label: 'Estado', choices: active },
    { key: 'marketing', label: 'Autorización de promociones', choices: [['yes', 'Marcada'], ['no', 'Sin marcar']] },
  ] },
  suppliers: { monthLabel: 'Mes de registro', sort: [...recent, ...names], fields: [{ key: 'status', label: 'Estado', choices: active }] },
  sales: { monthLabel: 'Mes de venta', sort: [...recent, ['total_asc', 'Menor total'], ['total_desc', 'Mayor total']], fields: [
    { key: 'status', label: 'Estado', choices: [['Completed', 'Completadas'], ['Cancelled', 'Canceladas']] },
  ] },
  purchases: { monthLabel: 'Mes de compra', sort: [...recent, ['total_asc', 'Menor total'], ['total_desc', 'Mayor total']], fields: [
    { key: 'status', label: 'Estado', choices: [['active', 'Vigentes'], ['cancelled', 'Anuladas']] },
  ] },
  expenses: { monthLabel: 'Mes del gasto', sort: [...recent, ['amount_asc', 'Menor importe'], ['amount_desc', 'Mayor importe']], fields: [] },
};
