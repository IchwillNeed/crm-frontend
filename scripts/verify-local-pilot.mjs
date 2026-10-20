import { chromium } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const data = fileURLToPath(new URL('../../crm_django/.local-pilot/', import.meta.url));
const credentials = JSON.parse(readFileSync(`${data}/access.json`, 'utf8'));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(edge) ? { executablePath: edge } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5175/login');
  await page.getByLabel('Usuario', { exact: true }).fill('admin_piloto');
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials.admin_piloto);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.getByText('Productos e inventario', { exact: true }).waitFor();
  await page.screenshot({ path: `${data}/dashboard.png`, fullPage: true });
  await page.goto('http://127.0.0.1:5175/sales/new');
  await page.getByPlaceholder('Buscar producto...').fill('Café piloto');
  await page.getByRole('option', { name: /Café piloto/ }).click();
  await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
  await page.getByRole('cell', { name: 'Café piloto', exact: true }).waitFor();
  await page.getByPlaceholder('Buscar cliente...').fill('Carla');
  await page.getByRole('option', { name: /Carla/ }).click();
  await page.screenshot({ path: `${data}/new-sale.png`, fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('OK navegador real del piloto: login, dashboard, búsqueda paginada de producto y cliente. Sin errores JavaScript. No se registró otra venta.');
} finally {
  await browser.close();
}
