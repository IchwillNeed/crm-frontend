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
  // Finish the dashboard requests before a full page.goto(). WebKit reports
  // requests interrupted by that navigation as access-control page errors.
  await page.waitForLoadState('networkidle');
}

test('cargas lentas muestran progreso sin resultados vacíos prematuros', async ({ page, request }) => {
  const account = await owner(request);
  await login(page, account.username);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/customers/?page=*', async route => {
    await gate;
    await route.fulfill({ json: { results: [], count: 0, next: null, previous: null } });
  });
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Cargando lista' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.getByText('Está tardando más de lo habitual.', { exact: false })).toBeVisible();
  release();
  await expect(page.getByText('Cargando lista…', { exact: true })).not.toBeVisible();
  await page.goto('/sales/new');
  let releaseSearch!: () => void;
  const searchGate = new Promise<void>(resolve => { releaseSearch = resolve; });
  await page.route('**/api/products/?*', async route => {
    await searchGate;
    await route.fulfill({ json: { results: [], count: 0, next: null, previous: null } });
  });
  await page.getByRole('combobox', { name: 'Buscar producto...' }).click();
  await expect(page.getByText('Buscando…', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Buscar producto...' }).locator('xpath=ancestor::*[@data-slot="card"]')).toHaveCSS('overflow', 'visible');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/loading-mobile.png', fullPage: true });
  await expect(page.getByText('No se encontraron resultados.')).not.toBeVisible();
  releaseSearch();
  await expect(page.getByText('No se encontraron resultados.')).toBeVisible();
});

test('detalles distinguen un fallo del servidor de un registro inexistente', async ({ page, request }) => {
  const account = await owner(request);
  await login(page, account.username);
  for (const resource of ['sales', 'customers']) {
    await page.route(`**/api/${resource}/999999/`, route => route.fulfill({ status: 503, contentType: 'text/html', body: '<html>Traceback SECRET</html>' }));
    await page.goto(`/${resource}/999999`);
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('El servidor');
    await expect(page.locator('body')).not.toContainText('SECRET');
    await page.unroute(`**/api/${resource}/999999/`);
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.locator('main')).toContainText('No se encontró el recurso');
  }
});

test('fallo al actualizar la cuenta conserva el formulario y permite reintentar', async ({ page, request }) => {
  const account = await owner(request);
  await page.clock.install();
  await login(page, account.username);
  await page.goto('/sales/new');
  await page.getByLabel('Notas').fill('Conservar este borrador');
  await page.route('**/api/me/', route => route.fulfill({ status: 503, json: { detail: 'Internal SECRET' } }));
  // The profile refresh is periodic; advance the timer without waiting a minute.
  await page.clock.runFor(61000);
  await expect(page.getByRole('button', { name: 'Reintentar conexión' })).toBeVisible();
  await expect(page.getByLabel('Notas')).toHaveValue('Conservar este borrador');
  await expect(page.locator('body')).not.toContainText('SECRET');
  await page.unroute('**/api/me/');
  await page.getByRole('button', { name: 'Reintentar conexión' }).click();
  await expect(page.getByRole('button', { name: 'Reintentar conexión' })).not.toBeVisible();
  await expect(page.getByLabel('Notas')).toHaveValue('Conservar este borrador');
});

test('errores de pantalla conservan el menú y permiten navegar a otra sección', async ({ page, request }) => {
  const account = await owner(request);
  await login(page, account.username);
  // A malformed successful response triggers a genuine rendering exception.
  await page.route('**/api/sales/?*', route => route.fulfill({ json: { count: 1, results: { invalid: true } } }));
  await page.goto('/sales');
  await expect(page.getByRole('heading', { name: 'Algo salió mal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Algo salió mal' })).not.toBeVisible();
});

test('selector de pago tolera cambios de texto como los de traducción', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const account = await owner(request);
  await login(page, account.username);
  await page.goto('/sales/new');
  const payment = page.locator('[data-slot="select-trigger"]');
  await expect(payment).toContainText('Sin especificar');
  const translateValue = async () => {
    // Model the replacement of text nodes performed by browser translation tools.
    // This does not claim to run Safari's proprietary translator.
    await page.locator('[data-slot="select-value"]').evaluate(element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const texts: Node[] = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const text of texts) {
        const replacement = document.createElement('span');
        replacement.textContent = text.textContent;
        text.parentNode!.replaceChild(replacement, text);
      }
    });
  };
  await translateValue();
  await payment.click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  expect(errors).toEqual([]);
  await expect(payment).toContainText('Efectivo');
  await translateValue();
  await payment.click();
  await page.getByRole('option', { name: 'QR', exact: true }).click();
  expect(errors).toEqual([]);
  await expect(payment).toContainText('QR');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();
});

test('selectores de venta y compra funcionan sin errores de página', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const account = await owner(request);
  const response = await request.post(`${api}/products/`, { headers: account.headers,
    data: { name: 'Café Safari', price: '25', cost: '10', stock: 10 } });
  expect(response.status()).toBe(201);
  const product = await response.json();
  const customerResponse = await request.post(`${api}/customers/`, { headers: account.headers,
    data: { first_name: 'José', last_name: 'Safari' } });
  expect(customerResponse.status()).toBe(201);
  await login(page, account.username);
  await page.goto('/sales/new');
  const products = page.getByRole('combobox', { name: 'Buscar producto...' });
  await products.fill('Café');
  await page.getByRole('option', { name: /Café Safari/ }).click();
  await expect(products).toHaveValue(/Café Safari/);
  await products.click();
  await expect(page.getByRole('option', { name: /Café Safari/ })).toBeVisible();
  await products.press('Escape');
  await expect(products).toHaveValue(/Café Safari/);
  await page.getByRole('button', { name: 'Limpiar Buscar producto...' }).click();
  await products.fill('inexistente');
  await expect(page.getByText('No se encontraron resultados.')).toBeVisible();
  await products.fill('Café');
  await expect(page.getByRole('option', { name: /Café Safari/ })).toBeVisible();
  await products.press('ArrowDown');
  await products.press('Enter');
  await expect(products).toHaveValue(/Café Safari/);
  await page.getByRole('button', { name: 'Agregar producto' }).click();
  const customers = page.getByRole('combobox', { name: 'Buscar cliente...' });
  await customers.fill('José');
  await page.getByRole('option', { name: 'José Safari' }).click();
  await expect(customers).toHaveValue('José Safari');
  await page.getByRole('combobox').filter({ hasText: 'Sin especificar' }).click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await expect(page.getByRole('combobox').filter({ hasText: 'Efectivo' })).toBeVisible();
  await page.goto('/purchases');
  await page.getByRole('button', { name: 'Nueva compra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Producto', exact: true }).selectOption(String(product.id));
  await expect(dialog.getByRole('combobox', { name: 'Producto', exact: true })).toHaveValue(String(product.id));
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(errors).toEqual([]);
});

test('crear cliente durante una venta conserva el carrito y la autorización elegida', async ({ page, request }) => {
  const account = await owner(request);
  const created = await request.post(`${api}/products/`, { headers: account.headers,
    data: { name: 'Producto cliente en venta', price: '25', cost: '10', stock: 10 } });
  expect(created.status()).toBe(201);
  const product = await created.json();
  await login(page, account.username);
  await page.goto('/sales/new');
  await page.getByRole('combobox', { name: 'Buscar producto...' }).fill(product.name);
  await page.getByRole('option', { name: new RegExp(product.name) }).click();
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar producto' }).click();
  await page.getByLabel('Notas', { exact: true }).fill('Conservar notas de venta');
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByLabel('Nombre', { exact: true }).fill('Descartado');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: product.name })).toContainText('2');
  await expect(page.getByLabel('Notas', { exact: true })).toHaveValue('Conservar notas de venta');
  await page.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByLabel('Nombre', { exact: true }).fill('Cliente');
  await dialog.getByLabel('Apellido', { exact: true }).fill('Durante venta');
  await dialog.getByLabel('Email', { exact: true }).fill('inline@example.test');
  await dialog.getByRole('checkbox').check();
  await dialog.getByLabel('Notas', { exact: true }).fill('Autorización ficticia para prueba');
  // A rejected save must keep both forms, allow correction and not create a sale.
  await page.route('**/api/customers/', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ detail: 'Revisa los datos del cliente.' }) });
    } else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Revisa los datos del cliente.');
  await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Cliente');
  await page.unroute('**/api/customers/');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/sales\/new$/);
  await expect(page.getByRole('combobox', { name: 'Buscar cliente...' })).toHaveValue('Cliente Durante venta');
  await expect(page.getByRole('row').filter({ hasText: product.name })).toContainText('2');
  await expect(page.getByLabel('Notas', { exact: true })).toHaveValue('Conservar notas de venta');
  const customers = await (await request.get(`${api}/customers/`, { headers: account.headers })).json();
  expect(customers).toHaveLength(1);
  expect(customers[0].accepts_marketing).toBe(true);
  await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
  await expect(page).toHaveURL(/\/sales\/\d+$/);
  const saleId = page.url().split('/').pop();
  const sale = await (await request.get(`${api}/sales/${saleId}/`, { headers: account.headers })).json();
  expect(sale.customer).toBe(customers[0].id);
  expect(Number(sale.total)).toBe(50);
  expect(sale.notes).toBe('Conservar notas de venta');
});

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
