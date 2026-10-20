import { assignInternalPlan } from './plan';
import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:8001/api';
const password = 'Acceptance-Strong-9185!';

async function createOwner(request: APIRequestContext) {
  const username = `owner_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const response = await request.post(`${api}/signup/`, {
    data: {
      company_name: 'Tienda Recomendaciones',
      username,
      email: `${username}@example.test`,
      password,
      first_name: 'Ana',
      last_name: 'Rojas',
    },
  });
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

test('revisión de evidencia, audiencia compró A no B, selección manual, frecuencia por producto y confirmación explícita', async ({
  page,
  request,
}) => {
  const admin = await createOwner(request);

  // Configurar plazo de enfriamiento por empresa (14 días)
  expect(
    (
      await request.patch(`${api}/company/settings/`, {
        headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
        data: { campaign_cooldown_days: 14 },
      })
    ).status(),
  ).toBe(200);

  const prodARes = await request.post(`${api}/products/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'Cafetera Express', price: '500', cost: '300', stock: 20 },
  });
  expect(prodARes.status()).toBe(201);
  const prodA = await prodARes.json();

  const prodBRes = await request.post(`${api}/products/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'Café Molido Premium', price: '80', cost: '40', stock: 30 },
  });
  expect(prodBRes.status()).toBe(201);
  const prodB = await prodBRes.json();

  // Dos clientes que compraron A y B juntos (evidencia = 2 ventas, 2 clientes)
  for (const idx of [1, 2]) {
    const cRes = await request.post(`${api}/customers/`, {
      headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
      data: {
        first_name: `CompradorPar${idx}`,
        last_name: 'Ambos',
        email: `ambos${idx}@example.test`,
        accepts_marketing: true,
      },
    });
    expect(cRes.status()).toBe(201);
    const c = await cRes.json();

    const sRes = await request.post(`${api}/sales/`, {
      headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
      data: {
        customer: c.id,
        items: [
          { product: prodA.id, quantity: 1 },
          { product: prodB.id, quantity: 1 },
        ],
      },
    });
    expect(sRes.status()).toBe(201);
  }

  // Cliente elegible 1: compró A pero no B, con email y autorización explícita
  const luciaRes = await request.post(`${api}/customers/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: {
      first_name: 'Lucía',
      last_name: 'Gómez',
      email: 'lucia.promo@example.test',
      accepts_marketing: true,
    },
  });
  expect(luciaRes.status()).toBe(201);
  const lucia = await luciaRes.json();

  expect(
    (
      await request.post(`${api}/sales/`, {
        headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
        data: { customer: lucia.id, items: [{ product: prodA.id, quantity: 1 }] },
      })
    ).status(),
  ).toBe(201);

  // Cliente elegible 2: compró A pero no B, para verificar selección manual (H20)
  const carlosRes = await request.post(`${api}/customers/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: {
      first_name: 'Carlos',
      last_name: 'Ruiz',
      email: 'carlos.promo@example.test',
      accepts_marketing: true,
    },
  });
  expect(carlosRes.status()).toBe(201);
  const carlos = await carlosRes.json();

  expect(
    (
      await request.post(`${api}/sales/`, {
        headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
        data: { customer: carlos.id, items: [{ product: prodA.id, quantity: 1 }] },
      })
    ).status(),
  ).toBe(201);

  // Cliente excluido: compró A pero NO autorizó promociones (accepts_marketing: false)
  const pedroRes = await request.post(`${api}/customers/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
    data: {
      first_name: 'Pedro',
      last_name: 'SinPermiso',
      email: 'pedro.no@example.test',
      accepts_marketing: false,
    },
  });
  expect(pedroRes.status()).toBe(201);
  const pedro = await pedroRes.json();

  expect(
    (
      await request.post(`${api}/sales/`, {
        headers: { ...admin.headers, 'Idempotency-Key': randomUUID() },
        data: { customer: pedro.id, items: [{ product: prodA.id, quantity: 1 }] },
      })
    ).status(),
  ).toBe(201);

  await login(page, admin.username);
  await page.goto('/dashboard');

  await expect(
    page.getByText('Inteligencia, Sugerencias y Recomendaciones Comerciales'),
  ).toBeVisible();

  // Verificar que aparece la recomendación direccional con su evidencia (2 ventas · 2 clientes) y 2 destinatarios elegibles
  const recRow = page.locator('tr', { hasText: 'Cafetera Express' }).filter({ hasText: 'Revisar y enviar' }).first();
  await expect(recRow).toBeVisible();
  await expect(recRow).toContainText('2 venta(s)');
  await expect(recRow).toContainText('2 destinatario(s)');

  await recRow.getByRole('button', { name: 'Revisar y enviar' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Revisar regla aplicada, productos, período, plazo configurado y lista de destinatarios
  const previewSummary = dialog.getByTestId('campaign-preview-summary');
  await expect(previewSummary).toContainText(
    'Compró Cafetera Express y no compró Café Molido Premium en el período',
  );
  await expect(previewSummary).toContainText('Plazo entre promociones del mismo producto: 14 día(s).');
  await expect(previewSummary).toContainText('0 destinatario(s) excluido(s) por contacto reciente o envío en curso.');
  await expect(previewSummary).toContainText('Destinatarios elegibles (2):');
  await expect(previewSummary).toContainText('Seleccionados para enviar: 2');

  const recipientList = dialog.getByTestId('campaign-recipient-list');
  await expect(recipientList).toContainText('Lucía Gómez');
  await expect(recipientList).toContainText('lucia.promo@example.test');
  await expect(recipientList).toContainText('Carlos Ruiz');
  await expect(recipientList).toContainText('carlos.promo@example.test');
  await expect(recipientList).not.toContainText('pedro.no@example.test');
  await expect(recipientList).not.toContainText('ambos1@example.test');

  // El botón de envío debe estar deshabilitado hasta confirmar explícitamente
  const sendBtn = dialog.getByRole('button', { name: 'Confirmar y enviar campaña' });
  await expect(sendBtn).toBeDisabled();

  // Revisar/editar mensaje y marcar confirmación explícita
  await dialog.getByLabel('Mensaje para revisar antes del envío').fill(
    'Te recomendamos nuestro Café Molido Premium para acompañar tu Cafetera Express.',
  );
  await dialog.locator('#confirm_campaign_send').check();
  await expect(sendBtn).toBeEnabled();

  // H20: Desmarcar a Carlos Ruiz debe invalidar la confirmación anterior y actualizar el conteo a 1 seleccionado
  await dialog.getByLabel('Enviar a Carlos Ruiz').uncheck();
  await expect(previewSummary).toContainText('Seleccionados para enviar: 1');
  await expect(dialog.locator('#confirm_campaign_send')).not.toBeChecked();
  await expect(sendBtn).toBeDisabled();

  await dialog.locator('#confirm_campaign_send').check();
  await expect(sendBtn).toBeEnabled();

  // La imagen forma parte de la revisión y cambiarla exige confirmar de nuevo.
  await dialog.getByLabel('Imagen promocional en el mensaje (opcional)').setInputFiles({
    name: 'oferta.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(dialog.getByAltText('oferta.png')).toBeVisible();
  await expect(dialog.locator('#confirm_campaign_send')).not.toBeChecked();
  await expect(sendBtn).toBeDisabled();
  await dialog.locator('#confirm_campaign_send').check();
  await expect(sendBtn).toBeEnabled();

  // Cambiar el texto invalida la confirmación anterior
  await dialog.getByLabel('Asunto del correo').fill('Oferta revisada de café');
  await expect(dialog.locator('#confirm_campaign_send')).not.toBeChecked();
  await expect(sendBtn).toBeDisabled();
  await dialog.locator('#confirm_campaign_send').check();
  await expect(sendBtn).toBeEnabled();

  // Cambió un destinatario desde que se revisó: el servidor debe impedir el envío.
  expect((await request.patch(`${api}/customers/${lucia.id}/`, {
    headers: { ...admin.headers, 'Idempotency-Key': randomUUID() }, data: { email: 'lucia.actualizada@example.test' },
  })).status()).toBe(200);
  await sendBtn.click();
  await expect(dialog.getByRole('alert')).toContainText('cambió');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Actualizar vista previa' }).click();
  await expect(recipientList).toContainText('lucia.actualizada@example.test');

  // Volver a desmarcar a Carlos Ruiz para enviar únicamente a Lucía Gómez
  await dialog.getByLabel('Enviar a Carlos Ruiz').uncheck();
  await expect(previewSummary).toContainText('Seleccionados para enviar: 1');
  await expect(dialog.locator('#confirm_campaign_send')).not.toBeChecked();
  await expect(sendBtn).toBeDisabled();
  await dialog.locator('#confirm_campaign_send').check();
  await sendBtn.click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText('Campaña enviada exitosamente a 1 destinatario(s).'),
  ).toBeVisible();

  // H19: Al abrir una nueva campaña para el mismo producto recomendado, Lucía queda excluida por plazo y solo queda Carlos
  await expect(recRow).toContainText('1 destinatario(s)');
  await recRow.getByRole('button', { name: 'Revisar y enviar' }).click();
  await expect(dialog).toBeVisible();
  await expect(previewSummary).toContainText('1 destinatario(s) excluido(s) por contacto reciente o envío en curso.');
  await expect(previewSummary).toContainText('Destinatarios elegibles (1):');
  await expect(recipientList).toContainText('Carlos Ruiz');
  await expect(recipientList).not.toContainText('Lucía Gómez');
  await dialog.getByRole('button', {name: 'Cancelar', exact: true}).click();
  await page.getByRole('button', {name: 'Historial de campañas'}).click();
  const history = page.getByRole('dialog');
  await expect(history.getByRole('heading', {name: 'Historial de campañas'})).toBeVisible();
  await history.getByRole('button', {name: /Oferta revisada de café/}).click();
  await expect(history).toContainText('lucia.actualizada@example.test');
  await expect(history).toContainText('Remitente confirmado:');
  await expect(history.getByRole('button', {name: 'Continuar pendientes y reintentar rechazados'})).toHaveCount(0);
});
