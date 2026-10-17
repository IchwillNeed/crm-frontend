# MVP del CRM

La guía de alcance, roles, configuración, respaldo y despliegue está en `../crm_django/OPERACION_MVP.md`.

Comprobaciones locales:

```sh
npm ci
npm run lint
npm run build
npm run test:e2e
```

Las pruebas E2E necesitan el backend como carpeta hermana `crm_django` y sus dependencias instaladas. Usan base temporal y puertos 8001/5174. En Windows utilizan Edge; en otros entornos instalar Chromium con `npx playwright install chromium` y definir `CRM_TEST_PYTHON`.

El frontend usa `VITE_API_URL` al compilar. La recuperación de contraseña requiere SMTP configurado en Django. No poner secretos en variables `VITE_*`.

Los estilos de shadcn se conservan en `src/styles/shadcn.css` con su licencia MIT. El ejecutable de generación de componentes no es necesario para compilar ni ejecutar esta aplicación.

El CSV exporta la página visible e indica ese alcance en el botón. Los valores que podrían interpretarse como fórmulas se escapan. La impresión de venta utiliza el diálogo de impresión del navegador y no es una factura fiscal.

Validación local del 17/10/2026: lint, TypeScript, build y 5 escenarios E2E aprobados. Edge requirió cerrar su proceso temporal al finalizar la suite; no cerrar procesos del navegador personal. El resultado final fue `5 passed`, salida 0.
