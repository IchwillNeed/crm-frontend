import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:8001/api';
const password = 'Acceptance-Strong-9185!';
async function owner(request: APIRequestContext) {
  const username = `owner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const response = await request.post(`${api}/signup/`, { data: { company_name: 'Prueba aislada', username, email: `${username}@example.test`, password, first_name: 'Ana', last_name: 'Rojas' } });
  expect(response.status()).toBe(201);
  const tokens = await response.json();
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

for (const role of ['Vendedor', 'Empleado']) {
  test(`permisos y navegación móvil: ${role}`, async ({ page, request }) => {
    const admin = await owner(request);
    const roles: { id: number; name: string }[] = await (await request.get(`${api}/roles/`, { headers: admin.headers })).json();
    const username = `member_${Date.now()}`;
    const response = await request.post(`${api}/users/`, { headers: admin.headers, data: { username, password, email: `${username}@example.test`, role: roles.find(r => r.name === role)!.id } });
    expect(response.status()).toBe(201);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, username);
    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Gastos', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Productos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Nuevo producto' })).toHaveCount(0);
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
  expect((await request.post(`${api}/expense-categories/`, { headers: admin.headers, data: { name: 'Servicios' } })).status()).toBe(201);
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
