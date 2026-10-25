// Export the existing vector logo to a share card, without changing the brand asset.
// Run manually when updating the logo: node scripts/generate-share-image.mjs
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const svg = await readFile(new URL('public/kantu-logo.svg', root), 'utf8');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="es"><head><meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; width: 1200px; height: 630px; background: #fff; display: flex;
        flex-direction: column; justify-content: center; align-items: center; gap: 32px; }
      img { display: block; width: 600px; height: 187.5px; object-fit: contain; }
      p { margin: 0; font: 28px Arial, sans-serif; color: #555; }
    </style></head><body>
    <img alt="Kantu" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">
    <p>Clientes · Ventas · Inventario</p></body></html>`);
  await page.locator('img').evaluate(image => image.decode());
  await page.screenshot({ path: fileURLToPath(new URL('public/kantu-share-v2.png', root)) });
  await mkdir(new URL('test-results/', root), { recursive: true });
  // Preview the centered square crop used by compact cards, without changing the export.
  await page.screenshot({ path: fileURLToPath(new URL('test-results/kantu-share-square.png', root)),
    clip: { x: 285, y: 0, width: 630, height: 630 } });
  console.log('Generated public/kantu-share-v2.png (1200 × 630).');
} finally {
  await browser.close();
}
