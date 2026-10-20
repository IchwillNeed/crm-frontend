# Prueba local del CRM — 19 de octubre de 2026

## Entrar

- Aplicación: http://127.0.0.1:5175
- Administración de plataforma: http://127.0.0.1:8002/admin/
- Empresa: **Piloto local KANTU**.
- Contraseñas generadas: `../crm_django/.local-pilot/access.json`. Este archivo es
  privado y está excluido de Git. No son las contraseñas de tus cuentas existentes.

| Usuario | Uso |
| --- | --- |
| `admin_piloto` | Administrador de tienda: operaciones, configuración, usuarios e historial. |
| `gerente_piloto` | Operaciones y reportes; consulta el plan; no borra gastos ni consulta el historial administrativo. |
| `vendedor_piloto` | Ventas y clientes; no puede consultar costos ni enviar campañas. |
| `empleado_piloto` | Consulta básica según permisos. |
| `plataforma_piloto` | Superusuario para `/admin/`: planes y suscripciones. No usarlo para comprobar restricciones de una tienda. |

El plan de esta empresa es **Interno gratuito**, activo y sin vencimiento.
Cerrar sesión revoca todas las sesiones de esa cuenta: usa cuentas distintas para
comparar roles simultáneamente. No hay correo externo ni PostgreSQL en esta prueba.

## Datos y correo

Todo el entorno utiliza `crm_django/.local-pilot/pilot.sqlite3`. La base original
`crm_django/db.sqlite3` y sus migraciones pendientes no se modificaron.

Hay cuatro productos, un proveedor, una compra y siete ventas iniciales:

- Dos clientes distintos compraron Café piloto junto con Filtros piloto.
- Carla solo compró café y tiene autorización comercial ficticia.
- Otro cliente no tiene autorización y otro no tiene correo: deben excluirse del envío.
- Un cliente tiene una compra antigua, para explorar segmentos por recencia.
- Hay una venta sin cliente: cuenta como venta, no como otro cliente identificado.
- Producto stock bajo permite comprobar las alertas de inventario.

Los correos se escriben como archivos en `crm_django/.local-pilot/emails/`.
Puedes abrirlos con un editor para revisar destinatario, asunto y mensaje.
Un estado “enviado” aquí significa **capturado por el backend local**, no entregado
a una bandeja real. Todos los destinatarios son ficticios bajo `example.test`.
El verificador ya puede haber dejado una campaña de comprobación en el historial.

## Recorrido recomendado

1. **Administrador:** entra con `admin_piloto`, revisa Dashboard con período Mes y
   comprueba productos, stock y la recomendación Café → Filtros.
2. **Venta:** registra una venta pequeña de una taza; comprueba total, stock y detalle.
   No vendas más unidades que las disponibles. Revisa el comprobante: no muestra costos.
3. **Devolución:** devuelve una unidad apta para vender. Sin marcar la confirmación
   no debe permitir completar la devolución. Revisa stock y Kardex.
4. **Anulación:** crea otra venta y anúlala; comprueba que el inventario se repone
   una sola vez y que el documento se conserva.
5. **Compra:** registra una compra pequeña; revisa stock y costo promedio.
   En Ver compra, escribe un motivo y anúlala. Debe conservarse con estado Anulada.
6. **Campaña:** selecciona Café y Filtros, revisa la evidencia y los destinatarios.
   Antes de nuevas ventas de prueba, la destinataria inicial esperada es Carla.
   Revisa el mensaje y confirma. Abre el archivo generado en `emails/`.
   Si cambias productos, período o mensaje, vuelve a previsualizar y confirmar.
7. **Permisos:** repite las consultas con Gerente, Vendedor y Empleado. Comprueba que
   no aparecen costos ni campañas en roles sin permiso.
8. **Configuración:** como Administrador, cambia una preferencia y consulta Historial.
   Inventario y gastos funcionan por permisos; no existen interruptores que simulen desactivarlos.
9. **Suscripciones:** registra otra empresa desde la aplicación. Debe quedar en solo
   consulta. Entra a `/admin/` con `plataforma_piloto`, asígnale un plan y vuelve a
   la aplicación para actualizar el estado. No cambies el plan de Piloto local KANTU
   si quieres conservar los demás escenarios listos para probar.
10. **Cierre de sesión:** comprueba que la cuenta vuelve a requerir autenticación.

Anota qué usuario usaste, la operación, el ID del documento, lo esperado y lo observado.
Si pierdes la respuesta de una operación, consulta el historial antes de cambiar sus
datos. El navegador conserva la clave de reintento para la misma cuenta, API y contenido,
incluso al cerrar la pestaña; borrar almacenamiento o cambiar de dispositivo elimina
esa continuidad. No es una copia automática del formulario.

## Volver a iniciar los servidores

No ejecutes estos comandos si ya responden las direcciones de arriba.
En una terminal, desde `crm_django`:

```powershell
.\venv\Scripts\python.exe scripts/local_pilot.py serve
```

En otra, desde `crm_frontend`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run-local-pilot.ps1
```

Este ajuste de ExecutionPolicy solo afecta a ese proceso. Los servidores escuchan
en `127.0.0.1`, no se publican en internet. Los logs de los procesos iniciados durante
la preparación están en `.local-pilot/backend*.log` y `.local-pilot/frontend*.log`.

## Respaldos y comprobaciones

Desde `crm_django`:

```powershell
# Crea una copia consistente y verifica integridad y relaciones.
.\venv\Scripts\python.exe scripts/local_pilot.py backup

# Verifica configuración y que no falten migraciones en la base del piloto.
.\venv\Scripts\python.exe scripts/local_pilot.py check

# Comprueba los cuatro roles y captura una campaña por HTTP; no envía correo externo.
.\venv\Scripts\python.exe scripts/verify_local_pilot.py
```

El verificador espera los escenarios iniciales: después de modificar sus compras,
clientes o consentimientos puede dejar de encontrar la audiencia original. Eso no
implica necesariamente un defecto. Cada ejecución crea una nueva campaña ficticia.

`local_pilot.py setup` aplica migraciones únicamente a la base del piloto y conserva
datos y contraseñas existentes. No reinicia el escenario. Antes de modificar esa base,
si ya existe, crea una copia en `.local-pilot/backups/`. Los respaldos de SQLite no
incluyen archivos de correo ni adjuntos; para guardar todo, conserva también esas carpetas.

## Alcance de esta prueba

Resultados de la preparación: 98 pruebas Django aprobadas y 3 omitidas por PostgreSQL;
9 pruebas de navegador aprobadas en una ejecución; lint, TypeScript y build correctos.
También se comprobó este piloto persistente por HTTP y con un navegador real, sin
errores JavaScript en login, dashboard y selección de productos/clientes.

Permite validar funcionalidades con datos ficticios y correo capturado. No certifica
concurrencia de PostgreSQL, entrega SMTP, seguridad del hosting ni rendimiento con
carga simultánea. Tampoco incorpora caja contable, pasarela de cobros o medición causal
de campañas. Esos puntos requieren su propia validación antes de operar en producción.
