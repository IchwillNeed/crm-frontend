# Suscripciones y operación — 19 de octubre de 2026

## Cómo se administran

El **administrador de plataforma** (superusuario de Django) asigna planes desde
`/admin/`. Un usuario con rol **Administrador de una tienda** no puede otorgarse
un plan, cambiar su vencimiento ni modificar sus límites.

Por ahora, los acuerdos, cobros y renovaciones se gestionan **fuera de la página**.
El precio del plan es informativo: no hay pasarela de pago, cargos automáticos ni
facturación de suscripciones. Configuración → Plan permite consultar el estado.

Política elegida:

| Situación | Comportamiento |
| --- | --- |
| Empresa sin plan asignado | Solo consulta, incluso si acaba de registrarse. |
| Plan activo o de prueba que ya empezó | Operaciones permitidas con límites del plan. |
| Plan vencido | 7 días de gracia desde su fecha de fin; mantiene límites. |
| Cancelación o finalización manual | 7 días desde la finalización registrada; si el vencimiento era anterior, se usa esa fecha anterior. |
| Después de la gracia | Solo consulta; se bloquean las escrituras comerciales y los envíos. |
| Plan que empieza en el futuro | No habilita operaciones antes de su fecha de inicio. |
| Plan interno activo sin fecha de fin | No vence y no necesita renovación. |

La gracia termina exactamente al cumplirse siete días, no al cierre del día.
Si existen varias suscripciones, se utiliza la más reciente que ya comenzó.
No se recupera una suscripción antigua para eludir una cancelación más reciente.
Una suscripción antigua cancelada sin fecha de fin ni registro de finalización
queda bloqueada: no se inventa una fecha histórica.

El cambio de contraseña y el cierre de sesión siguen disponibles sin plan.
La interfaz muestra el estado y lo actualiza cada minuto o con **Actualizar estado
del plan**. El servidor vuelve a verificarlo en cada solicitud comercial.

## Tu propio emprendimiento

1. Registra tu tienda normalmente. Al principio estará en solo consulta.
2. Entra a `/admin/` con tu cuenta de administrador de plataforma.
3. En **Plans**, crea o utiliza **Interno gratuito**: precio `0`, límites de
   usuarios/productos vacíos. `init_mvp` crea este plan si aún no existe.
4. En **Subscriptions**, crea una suscripción para tu empresa, selecciona ese
   plan, estado `active`, inicio actual o pasado y **fecha de fin vacía**.
5. Vuelve a la tienda y pulsa **Actualizar estado del plan**.

No necesitas renovar esa suscripción. Para conceder una prueba a otra tienda,
asigna un plan con estado `trial` y una fecha de fin explícita. Para renovar,
actualiza la suscripción a `active` con su nueva vigencia, o crea una nueva que
empiece ahora. El historial registra los cambios hechos desde Admin.

## Actualizar la instalación

Haz un respaldo persistente antes de actualizar. Desde `crm_django`:

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py init_mvp
```

Esta revisión preparó las migraciones `0010` y `0011`; también siguen pendientes
`0008` y `0009` en la base de trabajo revisada. No se ejecutaron sobre esa base.
**Asigna un plan a las empresas existentes antes de reanudar sus operaciones.**
No se les asignó automáticamente una suscripción permanente.

## Anular una compra equivocada

Administrador y Gerente pueden abrir **Compras → Ver compra**, revisar las líneas,
escribir el motivo y confirmar la anulación. Se conservan el documento, las líneas,
el importe original, el autor, la fecha y el motivo; se registra la salida en Kardex.
Los listados y CSV indican que la compra está anulada.

La anulación retira todas las unidades y su valor histórico del inventario restante.
Si falta stock para alguna línea, se rechaza toda la operación. Si el costo restante
no puede determinarse, permanece desconocido. Luego se registra la compra correcta.
No se modifican costos históricos de ventas realizadas, no se registra un reembolso
del proveedor y no se ofrece una devolución parcial de compras.

## Historial, permisos y sesiones

- **Configuración → Historial**, solo Administrador: cambios desde esta actualización,
  con actor, fecha, recurso y campos modificados. Incluye cambios de rol, preferencias,
  consentimiento comercial y documentos. Los campos sensibles no copian su contenido;
  el cambio de consentimiento no prueba cómo se obtuvo la autorización.
- El historial es de solo lectura en API y Admin. No reconstruye datos anteriores
  ni sustituye una auditoría de SQL directo, scripts o modificaciones fuera de la app.
- Proveedores y Plan: Administrador/Gerente. Borrar gastos: solo Administrador.
- Cerrar sesión revoca los tokens de acceso y renovación de **todas las sesiones
  de esa cuenta**. Si no hay conexión, se limpia la sesión local y se avisa que no
  pudo confirmarse la revocación del servidor.
- Las operaciones de stock exigen `Idempotency-Key`. Los clientes externos deben
  guardar y reutilizar la misma clave si pierden una respuesta. Crear otra clave
  significa iniciar otra operación, no reintentar la anterior.

Los límites externos y resultados de pruebas se mantienen en [CIERRE_RIESGOS.md](CIERRE_RIESGOS.md).
