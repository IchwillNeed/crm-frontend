> Estado actualizado del correo: ver [CORREO_Y_RECUPERACION.md](../crm_django/CORREO_Y_RECUPERACION.md).
> H19 y H20 están implementados y probados en SQLite/navegador. El registro antiguo de pendientes de abajo se conserva como histórico; la decisión vigente limita por empresa, cliente/correo y producto recomendado, de 1 a 365 días.
> Se corrigieron el almacenamiento de credenciales, restricciones SMTP, resumen e historial de recuperación. PostgreSQL y el despliegue real siguen pendientes de validación.

# Cierre de riesgos operativos — 19 de octubre de 2026

Este documento actualiza el estado de `ANALISIS_FUNCIONAL_CRM.md`. La auditoría
original se conserva como referencia histórica: sus observaciones no describen
necesariamente el código actual. Esta revisión corrige operaciones existentes;
no incorpora caja, crédito, facturación fiscal ni otros módulos.

## Decisiones confirmadas

- Las devoluciones del piloto admiten únicamente unidades aptas para volver a vender.
  La confirmación es obligatoria en formulario y API y queda en `SaleReturn.restock_confirmed`.
- Se reincorporan al costo histórico, recalculando el promedio. Si falta información
  de costo, la valoración permanece desconocida. La misma regla se aplica al anular;
  reactivar retira nuevamente las unidades a su costo histórico.
- Costos y márgenes internos: Administrador y Gerente. Vendedor y Empleado conservan
  precios de venta y stock, pero no reciben costos en la API ni los ven en tablas/CSV.
  El comprobante impreso omite costos para todos los roles.
- Los permisos siguen siendo una matriz fija por rol, no un editor de permisos individuales.

## Hallazgos contrastados con el código actual

| Auditoría | Estado de esta revisión | Evidencia / límite |
| --- | --- | --- |
| H01 — Borrado de operaciones | Corregido con anulación trazable | Ventas y compras no se borran. `PurchaseViewSet.cancel` exige motivo, revierte unidades/costo y registra actor/fecha/Kardex. UI Compras → Ver compra → Confirmar anulación. Si falta stock se rechaza íntegramente; registrar una nueva compra correcta. No recalcula ventas pasadas ni representa reembolso al proveedor. |
| H02 — Kardex incompleto | Corregido para operaciones nuevas | `SaleSerializer.update` registra anulación/reactivación, además de entradas, ventas y devoluciones existentes. No se inventaron movimientos para reconstruir huecos históricos. |
| H03 — Cantidades netas y recomendaciones | Corregido en revisión de campañas | `insight_service` usa cantidades netas una vez y distingue ventas/clientes identificados distintos. |
| H04 — Devoluciones | Corregidos costo histórico, valoración y aptitud | `Product.restore_stock`, `remove_historical_stock`, `SaleItem.save` y `partial_return`. Los reportes siguen mostrando ventas netas vigentes por fecha original, no movimientos financieros por fecha de reembolso; se explica en el dashboard. No hay cierre contable de períodos. |
| H05 — Audiencias y campañas | Corregido (incluye H19 y H20) | Vista previa firmada, consentimiento, audiencia exacta, clave única, revalidación, bloqueo de SMTP incierto, límite de frecuencia configurable por empresa/producto recomendado (`campaign_cooldown_days`, `campaign_policy.py`) y selección manual de destinatarios (`selected_customer_ids`). |
| H06 — Confidencialidad | Corregido según política adoptada | `CostVisibilityMixin`, permisos de analítica, `redact_costs` en replays, tablas/CSV y estilos de impresión. |
| H07 — Límites de plan | Corregido según decisión del dueño | Sin plan: solo consulta. Plan vencido/cancelado: 7 días de gracia con sus límites; luego solo consulta. Plan interno activo sin fin para negocio propio. `subscription_service.get_access` y `CompanyTimezoneMixin.initial` protegen escrituras. Seguridad de cuenta disponible. Asignación manual desde Django Admin, sin cobro automático. |
| H08 — Reintentos | Clave obligatoria en operaciones de stock | `idempotent_operation` rechaza solicitudes sin UUID. Efecto, auditoría y respuesta se guardan en una transacción. Un reintento debe conservar clave y contenido; otra clave identifica otra intención. |
| H09 — Líneas omitidas de compra | Corregido | `NewPurchaseDialog` rechaza cualquier línea incompleta en vez de eliminarla del envío. |
| H10 — Correo y transacción comercial | Parcial | Alerta de stock después del commit, con error registrado sin convertir una venta confirmada en fallo. El envío sigue siendo síncrono; no se añadió una cola. Campañas tienen estado por destinatario. |
| H11 — Recomendaciones inaccesibles | Corregido previamente | Alta y preferencias permiten activarlas. Los interruptores engañosos de inventario/gastos se retiraron de API editable y Admin; los módulos funcionan según permisos del rol. |
| H12 — Matriz de permisos | Alineados los desajustes identificados | Proveedores solo Administrador/Gerente en API e interfaz; Plan accesible a ambos en Configuración; borrar gastos solo Administrador. Costos mantienen la política anterior. Sigue siendo una matriz fija por rol, no un editor granular. |
| H13 — Abuso/sesiones | Revocación corregida; infraestructura pendiente | `LogoutView` incrementa `User.token_version`; autenticación y refresh rechazan tokens anteriores, también de otros dispositivos. Se registra el cierre. Login/registro siguen limitados por IP; cache local requiere configuración compartida en despliegues multiproceso. |
| H14 — Edición operativa en Admin | Corregido | Ventas, líneas, compras, devoluciones y movimientos de solo lectura; stock/costo de productos no editables allí. |
| H15 — Auditoría general | Historial administrativo implementado | `AuditEvent`, middleware y señales registran creación/cambio/borrado de datos de empresa, usuarios, clientes, catálogos, productos, proveedores, gastos, documentos y suscripciones durante solicitudes API/Admin. Solo Administrador consulta su empresa en Configuración → Historial. No guarda credenciales ni contenido personal libre; registra campos modificados. No reconstruye el pasado ni captura SQL directo, `QuerySet.update` genérico o comandos externos. |
| H16 — Volumen/paginación | Parcial | Nueva venta busca productos/clientes en servidor por páginas de 25; prueba de búsqueda con 500 productos y aislamiento. Otros selectores y una prueba de carga simultánea siguen pendientes. |
| H17 — Reposición gratuita | Corregido | Costo explícito cero se conserva en `InventoryMovement`, sin sustituirlo por el promedio. |
| H18 — Relaciones históricas | Parcial | Clientes/proveedores/productos referenciados quedan protegidos por FK `PROTECT`. Desactivar en lugar de borrar. No se completaron todos los detalles de compras ni la historia de catálogos. |

## Uso y límites de las claves de operación

- El navegador añade `Idempotency-Key` (UUID) a crear venta/compra, devolución,
  reposición, ajuste, anulación de compra y cambio de estado de venta. La clave se conserva en el navegador para la misma API, usuario y contenido
  ante respuesta perdida o error 5xx; un resultado exitoso cierra esa operación.
- Repetir clave, usuario, empresa, ruta y contenido devuelve la respuesta guardada.
  Cambiar contenido reutilizando la clave se rechaza. Los permisos se vuelven a
  comprobar; un cambio de rol no permite recuperar costos de una respuesta anterior.
- Clientes externos deben enviar y conservar esa cabecera. Una llamada sin clave
  se rechaza con 400, antes de cambiar stock. No reutilizar la clave para otra operación.
- Editar una operación cuyo resultado fue incierto crea otra intención. Antes de
  cambiar datos o dispositivo, comprobar el historial. Las claves pendientes ahora
  sobreviven al cierre de pestaña y de sesión en el mismo navegador y usuario.
  No guardan el formulario, no se sincronizan entre dispositivos y se pierden al
  borrar el almacenamiento del navegador. Se almacena una huella, no datos personales.
- Los recibos no se purgan automáticamente: eliminar uno elimina su protección de replay.

## Despliegue y datos existentes

- Aplicar `manage.py migrate` con respaldo previo. Migraciones pendientes: `0008` y
  `0009` del cierre anterior, más `0010` (anulación de compras, auditoría y versión de
  sesión) y `0011` (fecha de finalización manual de suscripción).
- La base SQLite local ya tiene `0007`; no se aplicaron `0008`–`0011` a los datos de
  trabajo durante esta revisión. Sí se aplican al crear las bases aisladas de pruebas.
- Las devoluciones antiguas quedan con `restock_confirmed=False`; no se inventa una
  confirmación histórica. Las correcciones de costo y Kardex se aplican hacia adelante.
- Se probó copiar la SQLite local con la API de backup, abrir la copia y verificar
  integridad/relaciones. Esto no certifica respaldos automáticos, adjuntos ni restauración
  de un despliegue PostgreSQL.

## Pendientes que condicionan el piloto

1. Ejecutar las pruebas de concurrencia en PostgreSQL: última unidad, reposiciones
   simultáneas y creación simultánea con la misma clave. SQLite no prueba bloqueos de fila.
2. Aplicar migraciones y revisar datos cargados antes de estas correcciones.
3. Probar el proveedor real con correos internos. SMTP incierto permanece bloqueado;
   aceptación no garantiza entrega en bandeja.
4. Verificar HTTPS, secretos, respaldo automatizado, restauración y monitoreo del entorno.
5. Asignar un plan a cada empresa que deba operar: las empresas existentes sin plan
   también quedan en solo consulta. Ver `SUSCRIPCIONES_Y_OPERACION.md`.
6. Antes de exigir cierres contables, definir períodos cerrados. No presentar el
   dashboard como caja ni contabilidad. La anulación de compra es completa, no una
   devolución parcial ni una corrección retroactiva de márgenes de ventas.
7. Antes de enviar promociones reales, resolver H19 y H20: frecuencia de contacto
   entre campañas y selección manual de destinatarios dentro de la audiencia elegible.

### Pendientes detectados durante la prueba de campañas — 19 de octubre

Estos puntos están registrados como pendientes; no se implementaron con esta actualización documental.

| ID / prioridad | Pendiente | Criterio para darlo por resuelto |
| --- | --- | --- |
| H19 — P1, antes de promociones reales | Limitar la frecuencia de contacto por cliente entre campañas. La protección existente evita repetir una misma confirmación, pero una nueva vista previa/campaña puede volver a incluir al mismo cliente inmediatamente. | Mostrar en la vista previa los clientes excluidos por contacto reciente y el motivo. Revalidar el límite en backend al enviar, también ante campañas simultáneas. Probar que una nueva campaña no permite eludirlo y que se respeta el aislamiento por empresa. |
| H20 — P1, antes de promociones reales | Permitir marcar/desmarcar destinatarios de la audiencia elegible. Actualmente se propone y confirma la audiencia completa que cumple la regla, tiene correo y autorización. | Mostrar selección individual y total seleccionado; enviar exactamente a los seleccionados. Vincular esa selección a la confirmación: cambiarla exige nueva revisión y confirmación. Revalidar permisos, empresa, consentimiento, elegibilidad y frecuencia en backend; rechazar destinatarios añadidos fuera de la audiencia elegible y selecciones vacías. |

**Pendiente de decisión comercial para H19:** duración del intervalo mínimo, si se
aplica a todas las promociones o solo a la misma oferta, cómo tratar clientes que
comparten correo y qué estados de envío cuentan como contacto. Un resultado SMTP
incierto no debe convertirse en una vía para repetir el envío. No se fijó todavía
un número de días ni se autorizó una excepción manual al límite.

## Comprobaciones del cierre anterior

Pruebas ejecutadas durante el cierre del 18–19 de octubre. No se enviaron correos
reales ni se aplicaron migraciones a la base de trabajo.

| Comando / comprobación | Resultado observado |
| --- | --- |
| Backend: `venv/Scripts/python.exe manage.py test --settings=mi_crm.test_settings --verbosity=1` | 86 pruebas: 83 aprobadas y 3 omitidas por requerir PostgreSQL; `OK (skipped=3)`, 7,243 s. |
| Frontend: `npm.cmd run test:e2e` | 7 aprobadas, 2,3 min. Base temporal y correo en memoria. Incluye respuesta perdida, reintento, devolución confirmada, Kardex, impresión, roles y campañas. |
| Frontend: `npm.cmd run build` | Código de salida 0; compilación Vite en 8,87 s. Ejecutado antes del último ajuste de mensajes de error al borrar registros protegidos. |
| Frontend: `npm.cmd run lint` y `npx.cmd tsc -b` | Ambos terminaron con código de salida 0 después del último ajuste de mensajes de error. |
| Backend: `venv/Scripts/python.exe manage.py makemigrations --check --dry-run --settings=mi_crm.test_settings` | Código de salida 0: `No changes detected`. No equivale a haber aplicado las migraciones pendientes. |
| `git diff --check` en ambos repositorios | Código de salida 0; avisos de conversión LF/CRLF. |
| Copia SQLite mediante API de backup y apertura de la copia | `integrity_check`: `ok`; `foreign_key_check`: 0 violaciones. Copia temporal eliminada; no sustituye un respaldo persistente. |

Los comandos Django anteriores usaron `DATABASE_URL=sqlite:///:memory:` y
`PYTHONDONTWRITEBYTECODE=1`. Los tres escenarios de concurrencia no se validaron
en PostgreSQL. Tampoco se comprobó entrega con SMTP real ni restauración del
entorno de producción. Las pruebas de navegador y build preceden al último
ajuste de mensajes de error de borrado; no se afirma una repetición posterior.

## Verificación de esta ampliación

| Comando / comprobación | Resultado observado |
| --- | --- |
| `venv/Scripts/python.exe manage.py test --settings=mi_crm.test_settings --verbosity=1` | 99 pruebas: 96 aprobadas y 3 omitidas por PostgreSQL; última ejecución `OK (skipped=3)`, 6,823 s, después del ajuste de auditoría de tipos de producto. |
| `venv/Scripts/python.exe manage.py makemigrations --check --dry-run --settings=mi_crm.test_settings` | Código de salida 0, `No changes detected`. |
| `npm.cmd run lint` y `npm.cmd run build` | Código de salida 0; build ejecuta TypeScript y Vite, compilación en 6,14 s. |
| `npm.cmd run test:e2e` | 8 aprobadas y 1 fallida por selector de texto del caso Gerente, 2,3 min. El plan se mostraba junto al estado, no como texto aislado. |
| `npm.cmd run test:e2e -- --grep Gerente` | Tras corregir el selector: 1 aprobada, 34,9 s, código de salida 0. Los 9 casos tienen una ejecución aprobada; no se afirma una nueva corrida completa de 9 después de ese ajuste. |
| `git diff --check` en ambos repositorios | Código de salida 0; avisos LF/CRLF. |

Se agregaron 13 pruebas en `core/test_remaining_limits.py` y se actualizaron los
casos existentes para la política de suscripciones y las claves obligatorias.
Cubren reversión de compras y costo, reintentos, fallo parcial con rollback,
productos inactivos, permisos, aislamiento por empresa, claves ausentes,
revocación de acceso/refresh, protección del historial, privacidad, cambios de rol
y contraseña, planes futuros, límites durante gracia y acceso solo de consulta.
Las fixtures asignan explícitamente un plan para los casos comerciales; no se
deshabilitó la política en la configuración de pruebas.

Las pruebas usaron SQLite aislada y correo en memoria. Continúan pendientes las
pruebas de concurrencia en PostgreSQL, proveedor real y entorno de producción.

## Preparación del piloto local (19 de octubre)

Ver [PRUEBA_LOCAL.md](PRUEBA_LOCAL.md). Se creó una base independiente en
`crm_django/.local-pilot/pilot.sqlite3`, migrada hasta `0011`, y una empresa ficticia
con plan interno. La base original no se modificó. Los accesos generados, correos,
logs y respaldos se excluyen de Git.

| Verificación | Resultado |
| --- | --- |
| `venv/Scripts/python.exe scripts/local_pilot.py setup` (dos ejecuciones) | Primera: migraciones y datos creados. Segunda: respaldo verificado, sin duplicar datos ni cambiar contraseñas. |
| `venv/Scripts/python.exe scripts/local_pilot.py check` | Configuración válida y ninguna migración pendiente en la base del piloto. |
| `venv/Scripts/python.exe scripts/local_pilot.py backup` | Copia consistente, integrity_check correcto y sin violaciones de claves externas. |
| `venv/Scripts/python.exe scripts/verify_local_pilot.py` | HTTP real: cuatro roles, costos protegidos, dos compradores distintos de respaldo, una destinataria autorizada; archivo de correo creado y confirmación repetida sin otro envío. |
| `venv/Scripts/python.exe manage.py test --settings=mi_crm.test_settings --verbosity=1` | 101 pruebas: 98 aprobadas, 3 omitidas por PostgreSQL; 9,280 s. |
| `npm.cmd run lint` y `npm.cmd run build` | Código de salida 0; TypeScript y Vite correctos, build 7,25 s. |
| `npm.cmd run test:e2e` | 9 aprobadas en una ejecución, 3,3 min. Incluye respuesta perdida, cierre de pestaña y reintento sin duplicar venta. |
| `node scripts/verify-local-pilot.mjs` | Navegador contra el piloto persistente: login, dashboard y selección paginada de producto/cliente correctos, sin errores JavaScript. Capturas en `.local-pilot/dashboard.png` y `new-sale.png`. No registra ventas. |

Los correos se capturan en archivos locales: no se comprobó entrega externa.
El envío sigue siendo síncrono; una cola, la paginación de otros selectores y la
historia completa del catálogo no se incorporaron en esta preparación. PostgreSQL,
SMTP real y despliegue continúan fuera de la validación local elegida.
