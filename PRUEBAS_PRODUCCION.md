# Kantu — comprobación completa del primer despliegue

Preparado el 22 de octubre de 2026 a partir del código local. **Todas las comprobaciones comienzan pendientes**, aunque se hayan realizado antes en local. Este documento es una guía de aceptación, no una certificación de ausencia de errores ni un registro de pruebas ya ejecutadas.

## Cómo usar esta lista

Marca una casilla solamente después de comprobar su resultado esperado en la versión publicada. Si falla, déjala sin marcar y registra la incidencia al final. Si no corresponde, anota `No aplica` y el motivo; no la marques como aprobada. Una prueba pendiente sigue pendiente.

Haz las operaciones en empresas separadas de prueba, con productos ficticios y correos que controles. Las ventas, gastos y devoluciones de prueba afectan a los indicadores de esas empresas. No uses clientes reales ni alteres sus planes para comprobar fallos. No escribas contraseñas, claves API, enlaces de recuperación ni tokens en este documento o en capturas compartidas.

| Registro de la ejecución | Valor a completar |
| --- | --- |
| Fecha y responsable | |
| Commit desplegado del backend | |
| Commit desplegado del frontend | |
| Empresa de prueba A / ID | |
| Empresa de prueba B / ID | |
| Navegadores y dispositivos | |
| Resultado final: pendiente / aprobado / con incidencias | |

Direcciones previstas:

- Aplicación: https://kantu-crm.vercel.app
- Backend: https://crm-backend-nm8i.onrender.com
- Administración de plataforma: https://crm-backend-nm8i.onrender.com/admin/

## 1. Despliegue y configuración

- [ ] **Versión backend:** comparar el commit de Render con el que se publicó en GitHub. Debe contener Brevo y recuperación de plataforma.
- [ ] **Versión frontend:** comparar el commit de Vercel con el publicado. Debe mostrar el selector Brevo API y la configuración nueva.
- [ ] **Arranque:** Render termina el despliegue sin errores de importación, configuración, conexión o migración. Revisar especialmente que esté aplicada `core.0015_companysettings_brevo_api_key_and_more` y cualquier migración posterior del despliegue.
- [ ] **Configuración base:** `DJANGO_SETTINGS_MODULE=mi_crm.free_trial_settings`, `DEBUG=False`, `ALLOWED_HOSTS=crm-backend-nm8i.onrender.com`, origen CORS y `FRONTEND_URL=https://kantu-crm.vercel.app`. Conservar las claves estables `SECRET_KEY` y `SMTP_CREDENTIAL_KEY`.
- [ ] **PostgreSQL:** `DATABASE_URL` corresponde a la base Supabase prevista, con SSL. No es la SQLite del piloto ni una base ajena. Verificarlo sin mostrar la cadena de conexión.
- [ ] **Frontend/API:** `VITE_API_URL` contiene únicamente `https://crm-backend-nm8i.onrender.com/api`. No contiene el texto `VITE_API_URL=` dentro del valor. El frontend fue reconstruido después de cambiarla.
- [ ] **Red del navegador:** al cargar la aplicación, las solicitudes van al backend público correcto. No van a `localhost`, a una ruta de Vercel ni a otra instalación.
- [ ] **HTTPS y CORS:** login y consultas funcionan desde el dominio de la aplicación, sin errores de contenido mixto ni CORS.
- [ ] **Disponibilidad:** `/health/` responde. Después comprobar login y una lista: el health check por sí solo no demuestra que la base de datos funcione.
- [ ] **Rutas de React:** abrir directamente `/login`, `/signup`, `/forgot-password` y, con sesión, `/sales`; recargar. No aparece un 404 de Vercel.
- [ ] **Errores públicos:** una ruta inexistente no muestra configuración de Django, claves ni trazas. El `/` del backend no tiene que ser una página del CRM; un 404 allí no prueba un fallo del servicio.
- [ ] **Primer acceso tras inactividad:** esperar el arranque si Render está dormido y repetir una consulta. Registrar el tiempo; no atribuir automáticamente una demora a contraseña incorrecta.

Las cinco variables de Brevo previstas en Render son:

```dotenv
BREVO_DELIVERY_ENABLED=True
PLATFORM_BREVO_ENABLED=True
PLATFORM_BREVO_API_KEY=<clave privada de Kantu; no copiar este marcador>
PLATFORM_FROM_EMAIL=makerzstudioo@gmail.com
PLATFORM_FROM_NAME=Kantu
```

- [ ] **Separación de correos:** la primera variable habilita campañas por empresa; las otras cuatro configuran recuperación de plataforma. La clave de cada negocio se introduce en el CRM. No hay claves secretas en Vercel ni variables `VITE_*` con secretos.
- [ ] **Aplicación de variables:** después de guardarlas se reinició o redesplegó el backend; no se asume que «Save only» cambió un proceso que ya estaba ejecutándose.

## 2. Preparar cuentas y datos

- [ ] Crear desde la web dos empresas distintas: `QA Kantu A` y `QA Kantu B`, con administradores y correos propios de prueba. Sus datos deben comenzar separados.
- [ ] Guardar las credenciales fuera de este documento. No asumir que las cuentas `admin_piloto` locales existen en producción.
- [ ] Mantener un superusuario separado para `/admin/`. No usarlo para evaluar los permisos de una tienda, porque puede eludir las restricciones normales.
- [ ] Antes de asignar planes, realizar la sección 4 «Sin plan».
- [ ] Después asignar desde `/admin/` un plan activo a cada empresa. En A crear usuarios distintos con roles Administrador, Gerente, Vendedor y Empleado.
- [ ] Usar perfiles de navegador separados para probar empresas/roles. Dos pestañas del mismo perfil pueden compartir la sesión.

## 3. Registro, acceso y seguridad de la cuenta

- [ ] Registrar una empresa con datos válidos: se crea el administrador de esa empresa y puede entrar; no obtiene acceso al admin de Django.
- [ ] Intentar registrar un usuario o correo ya utilizado: recibir un error comprensible, sin crear una empresa incompleta.
- [ ] Probar contraseña débil, campos vacíos y correo mal formado: rechazos sin error 500.
- [ ] Entrar con contraseña incorrecta: no se crea sesión. Entrar con la correcta: carga la empresa esperada.
- [ ] Recargar y abrir otra ruta durante una sesión válida: la aplicación conserva el acceso correcto.
- [ ] Cerrar sesión: volver a una ruta protegida pide autenticarse. Otra sesión de esa misma cuenta queda revocada al intentar consultar de nuevo.
- [ ] Cambiar la contraseña desde Mi cuenta: exige la actual correcta y una nueva válida; las contraseñas nuevas deben coincidir.
- [ ] Tras el cambio, la contraseña antigua y las sesiones anteriores dejan de servir. La nueva permite entrar.
- [ ] Desactivar un usuario de prueba desde la administración de la empresa: deja de poder operar o iniciar sesión. Reactivarlo restaura el acceso permitido por su rol.
- [ ] Cambiar el rol de un usuario: en su siguiente consulta se aplican los permisos nuevos. No sigue accediendo a funciones del rol anterior.

### Recuperación de contraseña por Brevo

- [ ] Solicitar recuperación de una cuenta propia activa: respuesta genérica, sin mostrar tokens ni confirmar públicamente la existencia de la cuenta.
- [ ] Recibir el correo real. Comprobar remitente de Kantu, bandeja de entrada, Promociones y Spam. «Solicitud aceptada» en la web no basta para marcar esta prueba.
- [ ] Abrir el enlace: apunta a `https://kantu-crm.vercel.app/reset-password/...`, nunca a la instalación local ni a un dominio ajeno.
- [ ] Introducir contraseñas distintas entre sí o una débil: no se realiza el cambio.
- [ ] Cambiar a una contraseña válida e iniciar sesión con ella. La anterior no funciona y las sesiones previas quedan invalidadas.
- [ ] Reutilizar el enlace ya usado: se rechaza.
- [ ] Solicitar otro enlace, dejar transcurrir más de 30 minutos y abrirlo sin cambiar antes la contraseña: se rechaza por expiración.
- [ ] Modificar un carácter del enlace: se rechaza sin modificar la cuenta.
- [ ] Solicitar recuperación para un correo inexistente y para un usuario inactivo de prueba: respuesta pública genérica; no se envía correo para esas cuentas.
- [ ] Repetir el flujo con una empresa **sin plan**: la recuperación sigue funcionando y no requiere configurar el correo comercial de esa empresa.

Los endpoints de recuperación comparten el límite existente de 5 solicitudes por hora por IP. Distribuir estas pruebas entre sesiones de trabajo para no confundir un 429 con un defecto. Las pruebas intensivas del límite corresponden al entorno técnico aislado de la sección 15.

## 4. Planes y suscripciones

- [ ] **Sin plan:** una empresa recién creada puede entrar y consultar; intentar crear una venta, producto o campaña queda bloqueado con el motivo correcto.
- [ ] **Asignación:** el superusuario asigna un plan desde `/admin/`. La tienda actualiza el estado del plan y puede operar según sus límites.
- [ ] **Separación:** asignar o cambiar el plan de A no cambia el de B.
- [ ] **Autorización:** el administrador de tienda no puede asignarse planes, cambiar precios/límites globales ni acceder al admin de plataforma.
- [ ] **Interno gratuito:** activo y sin fecha de fin permite operar sin renovación. No asignarlo automáticamente a negocios no autorizados.
- [ ] **Límite de productos:** usar un plan de prueba con límite pequeño; crear hasta el límite y comprobar que el siguiente se rechaza. Los productos inactivos también cuentan según el código actual.
- [ ] **Límite de usuarios:** llegar al máximo de usuarios activos y probar una creación/reactivación adicional: se bloquea sin superar el límite.
- [ ] **Plan futuro:** en una empresa sin otro plan iniciado, una suscripción cuyo inicio está en el futuro no habilita operaciones todavía.
- [ ] **Gracia:** en una empresa exclusiva de QA, fijar fin hace un día; se informa la gracia de siete días y conserva los límites.
- [ ] **Gracia terminada:** fijar fin hace más de siete días; conserva consultas pero bloquea operaciones comerciales y campañas. Recuperación, cambio de contraseña y cierre de sesión siguen disponibles.
- [ ] **Cancelación y renovación:** comprobar el estado y la gracia según la fecha de finalización; renovar y actualizar el estado debe restaurar operaciones. No debe reaparecer un plan antiguo para eludir uno cancelado más reciente.
- [ ] Dejar los planes de QA en el estado acordado al terminar, sin modificar planes de negocios reales.

## 5. Empresa, preferencias y usuarios

- [ ] Editar datos de la empresa A, guardar y recargar: persisten; B no cambia.
- [ ] Cambiar moneda, idioma de formato y zona horaria: persisten. La moneda cambia presentación, no convierte importes históricos; el formato regional no traduce toda la interfaz.
- [ ] Introducir moneda/zona inválida: error controlado, sin guardar datos inválidos.
- [ ] Desactivar y reactivar recomendaciones: el dashboard respeta el ajuste.
- [ ] Configurar el plazo de campañas entre 1 y 365 días. Rechazar 0, negativos y valores fuera del rango.
- [ ] Crear, editar, desactivar y reactivar un usuario propio con el rol previsto. No se puede asignar un usuario a otra empresa desde el formulario.
- [ ] Confirmar que no hay interruptores editables de inventario/gastos que simulen desactivar módulos: el acceso se rige por permisos.

## 6. Clientes y autorización comercial

- [ ] Crear cliente sin marcar autorización: queda desactivada por defecto, también después de editar otro campo.
- [ ] Crear/editar cliente con nombre, correo y notas válidos; buscarlo y abrir su detalle e historial de compras.
- [ ] Registrar un cliente sin correo: puede asociarse a ventas, pero no debe entrar en destinatarios de campañas.
- [ ] Registrar autorización únicamente para las cuentas propias usadas en pruebas. Anotar fecha y medio en notas: la casilla no prueba por sí sola cómo se obtuvo.
- [ ] Desmarcar autorización de un cliente: deja de ser elegible para promociones. Una baja recibida se procesa así; no se presupone un enlace automático de baja.
- [ ] Desactivar un cliente: no entra en campañas aunque tenga correo y autorización.
- [ ] Cambiar el correo o la autorización después de revisar una campaña: enviar con la vista previa anterior debe exigir revisión nueva o rechazar el envío.
- [ ] Intentar eliminar un cliente relacionado con documentos: verificar el mensaje de protección y que no desaparezcan ventas por cascada inesperada.

## 7. Catálogo, productos e inventario

- [ ] Crear categoría, subcategoría y tipo de producto; comprobar sus relaciones y edición. Un duplicado o una relación inválida produce error controlado.
- [ ] Crear producto con precio, costo, stock y mínimo de stock; guardar y volver a abrir. Rechazar cantidades/precios no admitidos.
- [ ] Buscar y paginar productos. Los selectores de nuevas ventas/compras encuentran también productos que no están en la primera página.
- [ ] Desactivar un producto: no debe permitir una nueva operación comercial que requiera producto activo ni aparecer como producto recomendado elegible.
- [ ] Reponer stock con costo conocido: aumentan unidades, cambia el promedio ponderado y aparece el movimiento en Kardex.
- [ ] Ajustar stock con motivo: el saldo y movimiento coinciden; una salida no puede dejar stock negativo.
- [ ] Probar stock bajo y cero: las alertas corresponden al mínimo configurado; stock cero no se presenta como disponible para recomendar/vender.
- [ ] Abrir Kardex y contrastar saldo inicial, compras, ventas, reposiciones, devoluciones y anulaciones. No hay movimientos duplicados por la misma operación.
- [ ] Un costo desconocido permanece distinguible de un costo cero; no debe mostrarse un margen fiable cuando faltan datos.
- [ ] Eliminar un producto usado en documentos: debe proteger las relaciones; usar desactivación cuando corresponda.

### Ejemplo numérico independiente para stock y costo

Usar un producto distinto al de recomendaciones, sin otras operaciones intercaladas:

| Paso | Operación | Resultado a comprobar |
| --- | --- | --- |
| 1 | Crear 10 unidades a costo 10 y precio 25 | Stock 10, costo 10 |
| 2 | Comprar 10 unidades a costo 20 | Stock 20, promedio 15 |
| 3 | Vender 2 unidades a precio 25 | Total 50, stock 18; costo histórico de venta 15 por unidad |
| 4 | Comprar 2 unidades a costo 25 | Stock 20, promedio 16 |
| 5 | Devolver 1 unidad apta de la venta del paso 3 | Stock 21; costo de entrada histórico 15; promedio aproximado 15,95 según redondeo |

- [ ] Completar y contrastar el ejemplo. Guardar IDs de compra, venta y devolución; los precios/costos actuales no reescriben la venta histórica.

## 8. Ventas, devolución y anulación

- [ ] En Nueva venta, agregar productos, cantidades, método de pago y notas; pulsar **Nuevo cliente**. El formulario permite registrar autorización promocional, desmarcada por defecto. Guardar selecciona al cliente nuevo sin salir ni perder los datos de la venta. Cancelar conserva la selección anterior; un error de guardado mantiene el formulario para corregirlo. Crear el cliente no registra aún la venta: esta se confirma por separado.
- [ ] Venta con cliente, varios productos, cantidades y método de pago: total igual a suma de subtotales; stock se descuenta una vez y se conserva fecha/cliente.
- [ ] Venta sin cliente: se registra y cuenta como venta, pero no inventa un cliente ni un destinatario.
- [ ] Intentar vender más stock del disponible: operación rechazada completamente, sin venta parcial ni stock negativo.
- [ ] Intentar cantidades inválidas y producto inactivo: rechazo controlado.
- [ ] Ver detalle e imprimir comprobante: productos, cantidades, total, fecha y empresa correctos; no imprime costos/márgenes internos como datos del cliente.
- [ ] Doble clic al crear y recarga tras completar: una sola venta. No crear otra venta «igual» para simular reintento; eso es una nueva operación.
- [ ] Devolver una parte: exige confirmar que las unidades son aptas para volver a vender; aumenta stock solo por lo devuelto y registra devolución/Kardex.
- [ ] Intentar devolver más de lo pendiente o repetir una devolución agotada: rechazo sin movimientos extra.
- [ ] No se aceptan devoluciones de mercancía dañada como stock vendible dentro de este flujo.
- [ ] Anular una venta sin devoluciones: documento conservado, stock repuesto una vez y exclusión de análisis de ventas completadas.
- [ ] Reactivar esa venta con stock suficiente: descuenta stock una sola vez y vuelve a análisis. Si no hay stock suficiente, rechaza toda la reactivación.
- [ ] En una venta con devolución previa, verificar el comportamiento permitido por el sistema; nunca reponer dos veces las unidades ya devueltas. Registrar cualquier rechazo como protección esperada, no forzar estados desde Admin.

## 9. Proveedores y compras

- [ ] Crear/editar/buscar proveedor desde Compras; sus datos pertenecen a la empresa actual.
- [ ] Crear compra con proveedor y varias líneas: total correcto, stock incrementado, costo promedio actualizado y movimientos identificables.
- [ ] Validaciones de cantidades y costos: entrada inválida se rechaza completamente.
- [ ] Abrir el detalle y comparar con las líneas registradas.
- [ ] Anular una compra de prueba con motivo: conserva documento y motivo, retira las unidades/valor que corresponden y registra Kardex.
- [ ] Intentar anular sin motivo o cuando ya no alcanza el stock: rechazo completo, sin retirar solo algunas líneas.
- [ ] Repetir la misma anulación: no descuenta inventario dos veces.
- [ ] La compra anulada aparece identificada en listado/CSV. No se interpreta como devolución bancaria del proveedor.

## 10. Gastos, dashboard y exportaciones

- [ ] Crear categoría y gasto con fecha/importe; editarlo; contrastar total por período. Rechazar importes cero/negativos si el formulario los prohíbe.
- [ ] Administrador puede borrar un gasto de prueba; Gerente no puede borrarlo. Una categoría en uso no debe eliminar documentos relacionados inesperadamente.
- [ ] Dashboard sin operaciones en el rango: muestra estado vacío o ceros, sin errores ni porcentajes engañosos.
- [ ] Seleccionar mes y rango personalizado, aplicar y comparar períodos: todos los indicadores usan el período mostrado.
- [ ] Contrastar ventas, gastos y ventas menos gastos con documentos conocidos. «Ventas menos gastos» no equivale al beneficio neto incluyendo todos los costos.
- [ ] Revisar productos más vendidos, clientes y alertas; no incluyen documentos de B.
- [ ] Anular/devolver una venta y actualizar: cambia la cifra neta según la fecha de la venta original. Una devolución posterior puede modificar un período anterior; comprobar el aviso.
- [ ] Comprobar una fecha cercana al cambio de día con la zona horaria del negocio; no debe desplazarse arbitrariamente de período.
- [ ] Cambiar de filtro/página y exportar en listas que ofrecen CSV: exporta la **página consultada**, con encabezados, importes, estados y acentos correctos. No asumir que exporta toda la base.
- [ ] Abrir CSV con nombres que comiencen por `=`, `+`, `-` o `@` en datos de prueba: comprobar que no se ejecuten como fórmulas.

## 11. Recomendaciones y audiencia: escenario reproducible

En una empresa de QA con recomendaciones activas, crear productos A (`Café QA`) y B (`Filtro QA`) activos, con stock suficiente. Usar un período fijo que incluya todas las ventas siguientes. Para clientes elegibles usar direcciones propias distintas.

| Cliente | Compras en el período | Correo/autorización | Resultado esperado antes de campañas |
| --- | --- | --- | --- |
| C1 | A y B en una venta | Cualquiera | Respalda la pareja; no recibe A → B porque ya compró B |
| C2 | A y B en otra venta | Cualquiera | Segundo cliente distinto de respaldo |
| C3 | Solo A | Correo propio y autorización | Elegible para A → B |
| C4 | Solo A | Correo propio y autorización | Elegible para A → B; permite probar selección |
| C5 | Solo B | Correo propio y autorización | Elegible para B → A |
| C6 | Solo A | Sin autorización | Excluido |
| C7 | Solo A | Sin correo | Excluido |
| C8 | Solo A | Inactivo | Excluido |

- [ ] Con solo la venta de C1 no aparece evidencia suficiente para enviar una recomendación.
- [ ] Repetir A+B con C1: hay dos ventas, pero un solo cliente distinto; no debe presentarse como respaldo de dos clientes ni superar el mínimo de clientes.
- [ ] Agregar la venta de C2: se cumple el mínimo de dos clientes distintos. Con la repetición anterior deben verse tres ventas y dos clientes, con etiquetas claras.
- [ ] Una venta anónima A+B suma evidencia de venta, pero no suma un cliente identificado.
- [ ] A → B incluye C3 y C4; B → A incluye C5. El respaldo de pareja puede ser el mismo, pero cada dirección tiene audiencia diferente.
- [ ] Los casos sin autorización, sin correo o inactivos no aparecen en destinatarios. No se sustituyen por «todos los clientes» si la audiencia queda vacía.
- [ ] Sacar las ventas del período: se recalculan evidencia y audiencia. Una compra fuera del rango no se evalúa como compra dentro de él.
- [ ] Anular una venta de respaldo o devolver completamente una línea de la pareja: el respaldo neto se reduce; si baja del mínimo, no permite enviar con evidencia insuficiente.
- [ ] Desactivar o agotar el producto recomendado: no permite una promoción que incumpla disponibilidad.
- [ ] Cambiar la empresa o usuario no reutiliza una audiencia de otra empresa.

## 12. Campañas reales de prueba mediante Brevo

### Configuración por empresa

- [ ] Como Administrador, seleccionar **Brevo API**, nombre, correo verificado y clave de esa empresa; guardar y recargar.
- [ ] El indicador de servidor habilitado coincide con Render. «Credenciales guardadas» no se toma como prueba de conexión o verificación del remitente.
- [ ] La clave nunca vuelve en texto visible al recargar ni en respuestas API. Dejar el campo vacío conserva la clave; la acción explícita de eliminarla la borra.
- [ ] Una empresa sin clave propia no utiliza la clave de otro negocio ni la clave de recuperación de Kantu.
- [ ] Al cambiar preferencias comerciales de una empresa, la recuperación de cuentas sigue utilizando el remitente de plataforma.

### Revisión antes de enviar

- [ ] Abrir A → B: muestra productos, período, evidencia, lista de destinatarios, asunto, mensaje y remitente correctos.
- [ ] Desmarcar C4 y dejar C3: actualizar vista previa. La lista revisada contiene únicamente C3 y el envío solo debe dirigirse a C3.
- [ ] Dejar selección vacía o usar segmento sin resultados: confirmar queda bloqueado; no se seleccionan destinatarios adicionales automáticamente.
- [ ] Cambiar asunto, texto, selección o imagen después de confirmar la casilla: exige revisión/confirmación nueva.
- [ ] Cambiar productos/período o remitente/proveedor: la vista previa anterior no autoriza el envío nuevo.
- [ ] Quitar autorización/cambiar correo desde otra sesión después de la vista previa: el backend rechaza el envío obsoleto o exige revisión; no basta la casilla del navegador.

### Envío y recepción

- [ ] Enviar un mensaje sencillo a un único correo propio autorizado. Verificar recepción y el registro correspondiente en Brevo.
- [ ] Verificar nombre del remitente y dirección de respuesta. Con Gmail, la dirección visible puede ser sustituida por Brevo; no interpretar eso como envío SMTP desde Gmail.
- [ ] Responder al mensaje de prueba: la respuesta llega al correo configurado del negocio.
- [ ] Repetir con una imagen PNG/JPG/GIF pequeña en otra campaña elegible: llega como **adjunto** y se puede abrir. El texto sigue legible; no queda una referencia CID rota.
- [ ] Probar archivo no válido, imagen de más de 2 MB y WEBP con Brevo: error controlado antes del envío. Para reenviar una campaña con imagen, se requiere seleccionar el mismo archivo cuando el sistema lo solicite.
- [ ] Revisar asunto, saludo, texto, firma, tildes y saltos de línea. Registrar cómo lo muestra el cliente de correo; Gmail puede agrupar mensajes u ocultar texto repetido.
- [ ] La pestaña Promociones cuenta como recepción, no como Spam. Registrar en qué carpeta llega; no exigir ni prometer la pestaña Principal.
- [ ] «Enviar resumen a mi correo»: llega al usuario autorizado correspondiente, con datos solo de su empresa y período; no se envía como campaña a los clientes.

### Duplicados, plazo e historial

- [ ] Después del envío, el historial muestra campaña, destinatarios y estados coherentes. «Enviado» significa aceptación del proveedor, no apertura ni compra.
- [ ] Doble clic/repetición de la misma confirmación no genera otra campaña ni otro correo para el destinatario ya procesado.
- [ ] Crear otra promoción del mismo producto recomendado para C3 antes del plazo: lo excluye. Cambiar asunto, texto o producto comprado A no evita el plazo del producto B recomendado.
- [ ] Comprobar que C4, que no recibió el primer envío, puede seguir siendo elegible.
- [ ] Configurar un plazo distinto para B: no altera el plazo de A. Para comprobar expiración real, esperar el intervalo; no modificar registros internos de envíos en producción.
- [ ] Abrir el historial, paginar y consultar detalle: solo aparecen campañas de la empresa y los permisos se respetan.
- [ ] Si aparece un rechazo explícito, corregir su causa y reintentar desde el historial: los destinatarios ya enviados no se repiten.
- [ ] Si aparece un resultado **desconocido**, comprobarlo en Brevo antes de actuar. No borrar el historial ni crear otra campaña para forzar su reenvío.

## 13. Permisos y separación entre empresas

Comprobar con usuarios de tienda, sin `is_superuser`. Las funciones comerciales además requieren un plan habilitado.

| Función | Administrador | Gerente | Vendedor | Empleado |
| --- | --- | --- | --- | --- |
| Consultar clientes, productos, catálogo y ventas propios | Sí | Sí | Sí | Sí |
| Crear/editar clientes | Sí | Sí | Sí | No |
| Crear/editar catálogo, productos e inventario | Sí | Sí | No | No |
| Crear ventas | Sí | Sí | Sí | No |
| Actualizar estado/devolver ventas | Sí | Sí | No | No |
| Consultar costos, dashboard, compras y gastos | Sí | Sí | No | No |
| Campañas y revisión de audiencia comercial | Sí | Sí | No | No |
| Consultar plan | Sí | Sí | No | No |
| Empresa, preferencias, usuarios e historial administrativo | Sí | No | No | No |
| Borrar gastos | Sí | No | No | No |
| Mi contraseña y cierre de sesión | Sí | Sí | Sí | Sí |

- [ ] Recorrer la tabla con cada rol: se ocultan las acciones no permitidas y no basta escribir una ruta para acceder a ellas.
- [ ] Como Vendedor/Empleado, revisar respuestas de red de productos, ventas y Kardex: no reciben costos internos aunque alguien manipule la interfaz.
- [ ] Un rol sin permiso comercial no obtiene correos de la audiencia por la API de vista previa.
- [ ] Abrir desde B la URL de una venta/cliente cuyo ID pertenece a A: no se muestran datos de A.
- [ ] Consultar listas, búsquedas, CSV, selectores, dashboard e historial como B: no aparecen registros de A.
- [ ] En prueba técnica con sesión de B, intentar usar IDs de productos/clientes/proveedores de A: rechazar sin crear ni modificar documentos.
- [ ] Usuarios normales no acceden a `/admin/`. Solo el superusuario de plataforma administra catálogos globales, planes y suscripciones.

## 14. Historial, persistencia y uso diario

- [ ] Como Administrador, abrir Configuración → Historial después de editar un cliente, consentimiento, producto y preferencia: aparecen actor, fecha y recurso correctos.
- [ ] Los registros no incluyen contraseñas, claves API, enlaces de recuperación ni contenido sensible completo. Se informa el cambio sin revelar el secreto.
- [ ] El historial de A no muestra acciones de B y no puede editarse desde la interfaz/API.
- [ ] Cerrar navegador y entrar otra vez: datos, planes y configuración persisten.
- [ ] Después de un reinicio/despliegue del backend, los documentos y claves guardadas siguen disponibles. No se regeneró `SMTP_CREDENTIAL_KEY`.
- [ ] Probar escritorio y móvil: menús, formularios, listas, modales y confirmaciones se pueden usar; no quedan botones inaccesibles.
- [ ] Probar búsqueda sin coincidencias y listas con varias páginas: estado vacío claro, filtros consistentes y navegación correcta.
- [ ] Simular desconexión en una **consulta**: la interfaz informa error y permite recuperar, sin mostrar la empresa anterior ni afirmar éxito.
- [ ] Tras un error de guardado, comprobar si existe el documento antes de intentar crearlo con datos o dispositivo diferentes.

## 15. Validación técnica aislada antes de abrir a más negocios

Estas comprobaciones necesitan apoyo técnico. **No ejecutar pruebas automatizadas contra la base de producción, cortar conexiones de clientes reales ni provocar fallos del proveedor en una cuenta compartida.** Un resultado local previo no marca esta sección como completada para la versión publicada.

- [ ] Ejecutar la suite Django de la revisión desplegada en una base de pruebas aislada; registrar comando, versión, cantidad aprobada, omitida y fallida.
- [ ] Ejecutar pruebas concurrentes con PostgreSQL aislado: ventas simultáneas sobre la última unidad no producen stock negativo ni dos ventas válidas incompatibles.
- [ ] Probar simultáneamente devolución/anulación y límites de usuarios/productos: saldos y límites se mantienen, sin movimientos duplicados.
- [ ] Simular una operación aceptada cuya respuesta se pierde: reintentar con la **misma** clave de idempotencia no crea otra venta, compra, reposición o devolución. Cambiar el contenido con la misma clave se rechaza.
- [ ] Probar aceptación de Brevo seguida de timeout o respuesta inválida: destinatario desconocido, sin reintento automático. Probar lote con éxitos y rechazos: reintento solo de los pendientes/rechazados permitidos.
- [ ] Probar credencial ausente, inválida o vencida: error controlado, sin exponer secretos ni usar credenciales de otra empresa.
- [ ] Probar recuperación con error del proveedor: misma respuesta pública, registro genérico sin email/token/clave y sin reintento automático de esa solicitud.
- [ ] Probar límite de solicitudes de recuperación y login sin bloquear una IP compartida por usuarios reales.
- [ ] Verificar autorización de endpoints directamente: no confiar solo en botones ocultos. Incluir vista previa, envío, reintento, costos, configuración y suscripciones.
- [ ] Ejecutar `npm.cmd run lint`, `npm.cmd run build` y las pruebas de navegador pertinentes contra el entorno aislado. No usar el verificador de piloto como garantía de que no enviará correo real: depende de su configuración.
- [ ] Programar un respaldo de PostgreSQL y realizar una restauración en **otra base aislada**. Comparar clientes, ventas, inventario y planes después de restaurar.
- [ ] Mantener respaldo privado de las claves de servidor necesarias para descifrar credenciales; no incluirlas en informes de QA ni en Git.
- [ ] Revisar procedimiento de vuelta atrás: una versión anterior puede no ser compatible con el esquema nuevo. No improvisar migraciones inversas en producción.
- [ ] Comprobar logs de arranque y fallos sin datos sensibles; definir quién revisará rechazos de Brevo, errores de aplicación y vencimiento de claves.
- [ ] Documentar límites/continuidad de los servicios contratados, almacenamiento y cuotas vigentes desde sus paneles. No asumir que la modalidad gratuita garantiza disponibilidad o capacidad para cualquier cantidad de negocios.

## 16. Qué no se debe marcar como defecto de una función inexistente

No se han implementado en este flujo códigos OTP de registro, verificación obligatoria de correo al registrarse ni segundo factor. La recuperación usa enlace temporal. Tampoco se presupone cobro automático de suscripciones, facturación fiscal, reembolso bancario automático, devolución parcial de compras, medición de aperturas/conversiones ni atribución de compras a campañas.

La baja comercial actual se gestiona desmarcando la autorización del cliente; no existe aquí un enlace de baja automática. Las imágenes enviadas no constituyen una biblioteca persistente de archivos. La reputación, la cuota y la entrega del proveedor no se garantizan por el estado «enviado» del CRM.

## 17. Registro de incidencias y criterio de cierre

| ID de sección/prueba | Usuario/rol y empresa | Pasos e IDs de documentos | Esperado | Observado | Evidencia sin secretos | Prioridad | Estado/reprueba |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Priorizar de esta manera:

- **Bloqueante:** exposición entre empresas, recuperación de otra cuenta, envío a audiencia no revisada, duplicados, stock/costos incorrectos o acceso de un rol no autorizado. Detener el flujo afectado hasta corregir y repetir.
- **Alta:** una función esencial falla, pierde datos o no puede completarse de manera estable. No dar ese módulo por listo.
- **Mejora:** texto, disposición visual u otra molestia que no altera permisos, datos ni destinatarios. Registrar y acordar fecha.

- [ ] Todas las pruebas manuales aplicables quedaron aprobadas o tienen una incidencia visible; no hay casillas marcadas basadas únicamente en suposiciones.
- [ ] Las comprobaciones técnicas pendientes están identificadas y tienen responsable; no se presenta SQLite como validación de concurrencia PostgreSQL.
- [ ] No quedan fallos bloqueantes/altos sin resolver para los módulos que se van a habilitar.
- [ ] Se verificó al menos una recepción real de campaña y una recuperación completa en el dominio público.
- [ ] Se registraron los commits aprobados, respaldos, responsable de soporte y procedimiento para deshabilitar envíos si aparece un problema.
- [ ] Cerrar/desactivar usuarios de QA que no deban conservar acceso y retirar autorizaciones promocionales de prueba. Conservar documentos necesarios para rastrear resultados; no borrar indiscriminadamente registros históricos.

## Referencias utilizadas para preparar la lista

El código vigente tiene prioridad sobre documentos antiguos de alcance:

- Rutas y permisos de interfaz: `src/App.tsx`, `src/lib/permissions.ts`.
- Formularios y operaciones: `src/pages/*`, `src/components/dashboard/SendPromotionDialog.tsx`, `CampaignHistory.tsx`.
- Backend: `../crm_django/core/views.py`, `core/serializers.py`, `core/permissions.py`, `core/account_views.py`.
- Políticas: `../crm_django/core/services/subscription_service.py`, `insight_service.py`, `notification_service.py`, `campaign_policy.py`.
- Correo: `../crm_django/core/brevo_backend.py`, `mi_crm/free_trial_settings.py` y [guía Brevo](../crm_django/BREVO.md).
- Detalle de suscripciones: [SUSCRIPCIONES_Y_OPERACION.md](SUSCRIPCIONES_Y_OPERACION.md).

Este documento no ejecuta ninguna prueba ni cambia la configuración del sistema.
