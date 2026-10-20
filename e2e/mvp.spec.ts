import { assignInternalPlan } from './plan';
import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:8001/api';
const password = 'Acceptance-Strong-9185!';

test('plan asignado en Admin, anulación trazable de compra y cierre de sesiones', async ({ page, request }) => {
  const username = `limits_${Date.now()}`;
  const signup = await request.post(`${api}/signup/`, { data: { company_name: 'Límites', username, email: `${username}@example.test`, password, first_name: 'Ana', last_name: 'Rojas' } });
  expect(signup.status()).toBe(201);
  const account = await signup.json();
  const headers = { Authorization: `Bearer ${account.access}` };
  expect((await request.post(`${api}/products/`, { headers, data: { name: 'Bloqueado', price: 20 } })).status()).toBe(403);
  await login(page, username);
  await expect(page.getByText('Solo consulta: el administrador de la plataforma debe asignar un plan vigente.')).toBeVisible();
  await assignInternalPlan(account.company.id);
  await page.getByRole('button', { name: 'Actualizar estado del plan' }).click();
  await expect(page.getByText('Solo consulta: el administrador de la plataforma debe asignar un plan vigente.')).not.toBeVisible();
  const productResponse = await request.post(`${api}/products/`, { headers, data: { name: 'Rectificación', price: '30', cost: '10', stock: 10 } });
  expect(productResponse.status()).toBe(201);
  const product = await productResponse.json();
  const purchaseResponse = await request.post(`${api}/purchases/`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { items: [{ product: product.id, quantity: 2, unit_cost: '20' }] } });
  expect(purchaseResponse.status()).toBe(201);
  await page.goto('/purchases');
  await page.getByRole('button', { name: 'Ver compra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Confirmar anulación de compra' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Motivo de anulación').fill('Compra duplicada');
  await confirm.click();
  await expect(dialog.getByText('Anulada: Compra duplicada')).toBeVisible();
  const restored = await (await request.get(`${api}/products/${product.id}/`, { headers })).json();
  expect(restored.stock).toBe(10);
  expect(restored.cost).toBe('10.00');
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Historial', exact: true }).click();
  await expect(page.locator('article').filter({ hasText: 'cancelled_at' }).getByText(/update · purchase #/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
  expect((await request.get(`${api}/me/`, { headers })).status()).toBe(401);
  expect((await request.post(`${api}/token/refresh/`, { data: { refresh: account.refresh } })).status()).toBe(401);
});
async function owner(request: APIRequestContext) {
  const username = `owner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const response = await request.post(`${api}/signup/`, { data: { company_name: 'Prueba aislada', username, email: `${username}@example.test`, password, first_name: 'Ana', last_name: 'Rojas' } });
  expect(response.status()).toBe(201);
  const tokens = await response.json();
  await assignInternalPlan(tokens.company.id);
  return { username, headers: { Authorization: `Bearer ${tokens.access}` } };
}
async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

test('registro, producto, venta atómica, cancelación y dashboard', async ({ page, request }) => {
  const username = `signup_${Date.now()}`;
  await page.goto('/signup');
  await page.getByLabel('Nombre de tu empresa').fill('Tienda de prueba');
  await page.getByLabel('Nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Apellido', { exact: true }).fill('Rojas');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const companyId = await page.evaluate(async () => {
    const response = await fetch('http://127.0.0.1:8001/api/me/', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
    return (await response.json()).company;
  });
  await assignInternalPlan(companyId);
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Café prueba');
  await dialog.locator('#price').fill('25');
  await dialog.locator('#cost').fill('10');
  await dialog.locator('#stock').fill('10');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Café prueba', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ventas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva venta', exact: true }).click();
  await page.getByPlaceholder('Buscar producto...').fill('Café');
  await page.getByRole('option', { name: /Café prueba/ }).click();
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Venta #/ })).toBeVisible();
  const access = await page.evaluate(() => localStorage.getItem('access_token'));
  const headers = { Authorization: `Bearer ${access}` };
  let products = await (await request.get(`${api}/products/`, { headers })).json();
  expect(products[0].stock).toBe(8);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar venta', exact: true }).click();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  products = await (await request.get(`${api}/products/`, { headers })).json();
  expect(products[0].stock).toBe(10);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByLabel('Período', { exact: true }).selectOption('month');
  await page.getByLabel('Mes', { exact: true }).fill('2026-10');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(page.getByText('2026-10-01 — 2026-10-31', { exact: true })).toBeVisible();
  await expect(page.getByText('Productos e inventario', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
});

test('Gerente consulta el plan y proveedores pero no borra gastos', async ({ page, request }) => {
  const admin = await owner(request);
  const roles: { id: number; name: string }[] = await (await request.get(`${api}/roles/`, { headers: admin.headers })).json();
  const username = `manager_${Date.now()}`;
  expect((await request.post(`${api}/users/`, { headers: admin.headers, data: { username, password, email: `${username}@example.test`, role: roles.find(r => r.name === 'Gerente')!.id } })).status()).toBe(201);
  const category = await (await request.post(`${api}/expense-categories/`, { headers: admin.headers, data: { name: 'Servicios' } })).json();
  expect((await request.post(`${api}/expenses/`, { headers: admin.headers, data: { category: category.id, description: 'Alquiler', amount: '50' } })).status()).toBe(201);
  await login(page, username);
  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Plan', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Plan', exact: true })).toContainText('Interno gratuito');
  await expect(page.getByRole('tab', { name: 'Historial', exact: true })).not.toBeVisible();
  await page.goto('/expenses');
  await expect(page.getByRole('cell', { name: 'Alquiler', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eliminar gasto', exact: true })).not.toBeVisible();
  await page.goto('/purchases');
  await page.getByRole('tab', { name: 'Proveedores', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nuevo proveedor', exact: true })).toBeVisible();
});

for (const role of ['Vendedor', 'Empleado']) {
  test(`permisos y navegación móvil: ${role}`, async ({ page, request }) => {
    const admin = await owner(request);
    const roles: { id: number; name: string }[] = await (await request.get(`${api}/roles/`, { headers: admin.headers })).json();
    const username = `member_${Date.now()}`;
    const response = await request.post(`${api}/users/`, { headers: { ...admin.headers, 'Idempotency-Key': randomUUID() }, data: { username, password, email: `${username}@example.test`, role: roles.find(r => r.name === role)!.id } });
    expect(response.status()).toBe(201);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, username);
    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Gastos', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Productos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Nuevo producto' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Costo', exact: true })).toHaveCount(0);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByRole('button', { name: 'Nueva venta', exact: true })).toHaveCount(role === 'Vendedor' ? 1 : 0);
    await page.getByRole('link', { name: 'Configuración', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Usuarios', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cambiar contraseña' })).toBeVisible();
    await page.screenshot({ path: `test-results/mobile-${role}.png`, fullPage: true });
  });
}

test('preferencias y cambio de empresa no reutilizan datos de la sesión anterior', async ({ page, request }) => {
  const first = await owner(request);
  const second = await owner(request);
  await request.post(`${api}/products/`, { headers: first.headers, data: { name: 'Solo empresa A', price: '20', stock: 3 } });
  await login(page, first.username);
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Solo empresa A', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Configuración', exact: true }).click();
  await page.getByRole('tab', { name: 'Preferencias', exact: true }).click();
  await page.getByLabel('Moneda', { exact: true }).selectOption('USD');
  await page.getByLabel('Zona horaria', { exact: true }).fill('UTC');
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  await expect(page.getByText('Preferencias actualizadas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await login(page, second.username);
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await expect(page.getByText('No hay productos registrados todavía.', { exact: true })).toBeVisible();
  await expect(page.getByText('Solo empresa A', { exact: true })).toHaveCount(0);
});

test('clientes, gastos y gestión de usuarios desde la interfaz', async ({ page, request }) => {
  const admin = await owner(request);
  expect((await request.post(`${api}/expense-categories/`, { headers: { ...admin.headers, 'Idempotency-Key': randomUUID() }, data: { name: 'Servicios' } })).status()).toBe(201);
  await login(page, admin.username);
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Cliente');
  await dialog.getByLabel('Apellido', { exact: true }).fill('Prueba');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cliente Prueba', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Gastos', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo gasto' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Servicios', exact: true }).click();
  await dialog.getByLabel('Descripción', { exact: true }).fill('Internet del local');
  await dialog.locator('#amount').fill('150');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Internet del local', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar página CSV' }).click();
  expect((await download).suggestedFilename()).toBe('expenses.csv');
  await page.getByRole('link', { name: 'Configuración', exact: true }).click();
  await page.getByRole('tab', { name: 'Usuarios', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Usuario', { exact: true }).fill(`staff_${Date.now()}`);
  await dialog.getByLabel('Nombre', { exact: true }).fill('Vendedora');
  await dialog.getByLabel('Apellido', { exact: true }).fill('Prueba');
  await dialog.getByLabel('Email', { exact: true }).fill('vendedora@example.test');
  await dialog.getByLabel('Contraseña', { exact: true }).fill(password);
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Vendedor', exact: true }).click();
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Vendedora Prueba' });
  await row.getByRole('button', { name: 'Desactivar usuario' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(row.getByText('Inactivo', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await expect(row.getByText('Activo', { exact: true })).toBeVisible();
});


test('respuesta perdida no duplica venta; devolución confirmada, impresión y Kardex', async ({ page, request }) => {
  const admin = await owner(request);
  const created = await request.post(`${api}/products/`, { headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'Producto seguro', stock: 10, cost: '10', price: '25' } });
  expect(created.status()).toBe(201);
  const product = await created.json();
  const purchaseKey = 'c1c06941-ece8-4c1b-ac0e-468e26bb8f09';
  const purchasePayload = { items: [{ product: product.id, quantity: 2, unit_cost: '20' }] };
  for (let i = 0; i < 2; i++) {
    expect((await request.post(`${api}/purchases/`, {
      headers: { ...admin.headers, 'Idempotency-Key': purchaseKey }, data: purchasePayload,
    })).status()).toBe(201);
  }
  await login(page, admin.username);
  await page.goto('/sales/new');
  await page.getByPlaceholder('Buscar producto...').fill('Producto seguro');
  await page.getByRole('option', { name: /Producto seguro/ }).click();
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
  let attempts = 0;
  const keys: string[] = [];
  await page.context().route('**/api/sales/', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    attempts++;
    if (attempts === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  const submit = page.getByRole('button', { name: 'Registrar venta', exact: true });
  await submit.click();
  await expect(page.locator('p', { hasText: 'No se pudo conectar con el servidor.' })).toBeVisible();
  await expect(submit).toBeEnabled();
  const oldPage = page;
  page = await oldPage.context().newPage();
  await oldPage.close();
  await page.goto('/sales/new');
  await page.getByPlaceholder('Buscar producto...').fill('Producto seguro');
  await page.getByRole('option', { name: /Producto seguro/ }).click();
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Venta #/ })).toBeVisible();
  expect(attempts).toBe(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  expect((await (await request.get(`${api}/sales/`, { headers: admin.headers })).json()).length).toBe(1);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('th', { hasText: 'Costo unit.' })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Devolver', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const confirmReturn = dialog.getByRole('button', { name: 'Confirmar devolución' });
  await expect(confirmReturn).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await confirmReturn.click();
  await expect(dialog).not.toBeVisible();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Cancelar venta', exact: true }).click();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  const updated = await (await request.get(`${api}/products/${product.id}/`, { headers: admin.headers })).json();
  expect(updated.stock).toBe(12);
  const movements = await (await request.get(`${api}/inventory-movements/?product=${product.id}`, { headers: admin.headers })).json();
  expect(movements.reduce((sum: number, row: { quantity_change: number }) => sum + row.quantity_change, 0)).toBe(12);
  expect(movements.filter((row: { movement_type: string }) => row.movement_type === 'sale_cancel')).toHaveLength(1);
});
