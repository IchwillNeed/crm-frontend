import { test, expect } from '@playwright/test';
import { errorMessage } from '../src/lib/errors';

test('mensajes seguros para errores de servidor, validación y conexión', () => {
  const failure = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });
  for (const data of ['<html>Traceback SECRET</html>', { detail: 'SECRET', stack: 'Traceback SECRET' }]) {
    expect(errorMessage(failure(500, data))).not.toContain('SECRET');
  }
  expect(errorMessage(failure(400, '<html>Traceback SECRET</html>'))).not.toContain('SECRET');
  expect(errorMessage(failure(400, { password: ['This password is too common.'] }))).toContain('demasiado común');
  expect(errorMessage(failure(400, { items: [{ quantity: ['Stock insuficiente.'] }] }))).toContain('Stock insuficiente.');
  expect(errorMessage(failure(429, { detail: 'Throttled' }))).toContain('Espera');
  expect(errorMessage({ isAxiosError: true, code: 'ETIMEDOUT', config: { method: 'post' } })).toContain('antes de repetir');
});

test('login distingue servidor caído de credenciales incorrectas y conserva el formulario', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario', { exact: true }).fill('prueba');
  await page.getByLabel('Contraseña', { exact: true }).fill('UnaPrueba123!');
  await page.route('**/api/token/', route => route.fulfill({ status: 502, contentType: 'text/html', body: '<html>Traceback SECRET</html>' }));
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El servidor');
  await expect(page.locator('body')).not.toContainText('SECRET');
  await expect(page.getByLabel('Usuario', { exact: true })).toHaveValue('prueba');
  await page.unroute('**/api/token/');
  await page.route('**/api/token/', route => route.fulfill({ status: 401, json: { detail: 'Invalid credentials' } }));
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.');
});
