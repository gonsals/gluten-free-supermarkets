# Calidad y operación · Comparador de compra

## Iteración 20 · Barcelona y seis cadenas

[Contrato SUP-02](PRECIOS_BARCELONA.md). 258 pruebas de app/25 suites, 58 de seguridad y 62 recorridos web correctos. Dos casos web nuevos verifican las seis cadenas, selector DIA/caché, copia sin red, ausencia de Valencia en resultados Barcelona y cinco cadenas sin precios integrados. Nuevas pruebas de parsers cubren L1/L2 de DIA, multipack alfanumérico, precio de socios/peso variable, precio visible frente al metadato, Ametller sin imágenes/configuraciones e identidad independiente de Barcelona. Presupuesto máximo móvil de once GET y enfriamiento de fallos contrastados; actualizador limitado a 44 lecturas y parada de cadena ante 403/429.

Prueba real con el cliente implementado: seis respuestas HTTP 200 y 55 coincidencias para huevos, sin credenciales. Primera copia de 1.364 referencias y las seis fuentes en estado correcto. No se declara prueba física o tarifa confirmada por CP. Tipos y lint correctos; los bloqueos de SEG-01, el cron fuera de main y la revisión para distribución comercial siguen pendientes.

## Iteración 19 · Precios de supermercados

[Contrato y límites SUP-01](PRECIOS_SUPERMERCADOS.md). 255 pruebas de app/25 suites, 53 controles de seguridad y 60 recorridos web correctos. Tras el ajuste final de texto y estado de consulta se repiten los nueve recorridos de catálogo/supermercados, todos correctos. Tipos y lint correctos. Se contrastan moneda/SKU/URL, grupos renovados, ofertas futuras/caducadas, copia antigua sin fecha renovada por error, caché, cancelación, Lidl Plus, descarte de descuentos de segunda unidad/compra múltiple, orden, tienda y datos privados excluidos de la copia pública. Cuatro casos adicionales ejecutan el actualizador completo sin red: éxito, fallo parcial, fallo total sin escritura y fuente con contrato normalizado inválido. Los primeros fallos web fueron una expectativa antigua sobre enlaces y una fixture futura con fin anterior al inicio; se corrigieron las expectativas/fechas sin relajar la validación.

Consulta real con el cliente implementado: HTTP 200 de Mercadona, Aldi y Lidl, tres lecturas y dieciséis coincidencias. Se revisan capturas de tamaño móvil; las fixtures visuales no son ofertas reales. Sin nueva prueba física, APK, auditoría de dependencias resuelta ni activación de nube. El refresco diario web está preparado y no activo en esta rama; la consulta móvil no depende de ese horario. SEG-01 sigue pendiente.

Actualizado el **03-11-2026**. Criterios para el enfoque de [Producto](PRODUCTO.md) y las fases de la [hoja de ruta](HOJA_DE_RUTA.md). Los fallos del prototipo inicial se conservan en el [documento histórico](historico/CALIDAD_Y_OPERACION_ANTES_DEL_COMPARADOR.md); no describen el estado actual.

## Evidencia disponible y límites

Base **`638980a`**, iteración 8. [CI con cinco controles correctos](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028): secretos, dependencias, Firebase, Android y app. Evidencia detallada en [Implementación](IMPLEMENTACION.md) y [Comparador](COMPARADOR_DE_PRECIOS.md).

| Comprobación realizada | Alcance y límite |
| --- | --- |
| 183 pruebas de app / 16 suites, iteración 10 | Dominio, clientes, repositorio, consulta, permisos, copias, tiendas y comparación. Incluye 20 pruebas nuevas de cesta, migración, límites y conflicto. |
| 35 pruebas de seguridad, iteración 9 | Política de auditoría y controles; no equivalen a un pentest ni eliminan avisos pendientes. |
| 36 recorridos web correctos, ejecución final de iteración 10 | Treinta anteriores y seis nuevos de totales/vínculos/límites/cancelación. Incluyen comparación, filtros, errores públicos, sugerencias, datos y ficha de gluten. Fixtures sintéticas, separadas de comprobaciones de proveedor real. |
| Tipos, lint y compatibilidad Expo | Correctos en la base registrada; cada cambio necesita sus controles pertinentes. |
| Reglas y nube en emuladores | Siete pruebas de reglas y cinco de integración; no habilitan nube real ni constituyen requisito de cuenta para el MVP local. |
| APK universal de iteración 8 | Compilada, instalada/actualizada en Pixel 8 emulado API 35; tienda sugerida, restauración y precio privado conservados. Sin Metro, nube desactivada y firma de desarrollo. |
| APK universal de iteración 9 | Actualización desde biblioteca v1, cesta y cantidad tras arranque en frío, restauración v2 y vaciado que conserva favoritos/precios en Android emulado API 35. [Paquete y evidencia](CESTA_LOCAL.md). Sin Metro, nube desactivada y firma de desarrollo; físico pendiente. |
| APK universal de iteración 10 | Migración de cesta v2, identidad explícita, total completo y subtotal parcial, persistencia tras reinicio y restauración v3 en Android emulado API 35. [Paquete y evidencia](TOTALES_Y_SUCURSALES.md). Sin Metro, nube desactivada y firma de desarrollo; físico pendiente. |
| Lectura pública real acotada | GTIN 3274080005003: 17/17 registros aceptados en la comprobación registrada; no demuestra cobertura española ni frescura por cadena. |

Cámara física, TalkBack, revisión experta, iOS nativo, beta, cobertura real de fuentes para cesta y métricas de uso siguen pendientes. Una exportación de JavaScript iOS no equivale a build/dispositivo nativo. El escaneo del ZIP y Gitleaks reducen riesgo de exposición, sin ser prueba universal de ausencia de cualquier secreto.

**Iteración 11:** formatos, sustituciones, copias v4 y actualización compatible del runtime, con límites y seguridad en [Formatos y alternativas](FORMATOS_Y_ALTERNATIVAS.md). La auditoría detecta deepmerge sin excepción ni parche publicado: el job de dependencias no está aprobado. Las pruebas funcionales no levantan este bloqueo.

**Iteración 10:** identidad, totales y formato v3 descritos en [Totales y sucursales](TOTALES_Y_SUCURSALES.md). Las matrices siguientes sirven también como regresión; no dan por realizadas las validaciones físicas, expertas o de beta.

## Estrategia de verificación

Verificar el recorrido **UI → datos locales/públicos → elegibilidad → comparación → decisión comprensible**, y añadir cesta/totales cuando se implementen. Mantener pruebas deterministas con fixtures para lógica y errores; las consultas reales son comprobaciones separadas, pequeñas, con fecha y contrato declarados.

| Área | Aceptación de las siguientes entregas |
| --- | --- |
| Cesta CES-01 | Añadir/editar/quitar, límites, duplicado de GTIN, cantidades inválidas, producto sin precio, acciones accesibles y reinicio sin red. |
| Datos CES-02 | Migración v1→v2 sin pérdida, importación v1 con cesta vacía, copia v2 completa, referencias válidas, borrado, fallos parciales, versiones desconocidas y dos clientes activos. |
| Identidad TIE-01 | Dos sucursales de una cadena, tiendas homónimas, ubicación incompleta y unión pública/privada confirmada/deshecha; no mezclar ámbitos. |
| Totales CES-03 | Cantidades, empates, diferencias, milésimas, filtros coherentes, última observación antes de filtrar, ofertas vencidas y discrepancia entre fuentes. |
| Cobertura CES-03/DAT-01 | Faltante no vale cero; sin precio/antiguo/excluido/fallo diferenciados; completas ordenadas y parciales fuera del ranking; una sola completa sin afirmación de ahorro. |
| Formatos UNI-01 | Masa/volumen/unidades compatibles, cantidad ausente, multipacks, necesidad de envases enteros, sobrante y redondeo. |
| Alternativas ALT-01 | Equivalencia explícita, sustitución confirmada y restricciones; no asumir equivalencia por nombre ni ausencia de gluten por falta de datos. |
| Proveedores DAT-02/DAT-03 | Contrato, timeout, cancelación, 429, respuesta inválida, paginación, tamaño y atribución; fallo externo conserva datos privados. |
| Gluten GLU-01 | Cuatro estados, campos ausentes, contradicciones, trazas junto a declaración sin gluten, fuente/fecha y comprensión con revisión experta. |

No escribir tests que solo repliquen detalles internos. Para importes, cobertura y migraciones sí se necesitan casos límite y recorridos de recuperación por el efecto de un error en la decisión de compra o los datos privados.

## Datos y recuperación

CES-01/CES-02 se han entregado juntas: cesta, exportación/restauración/borrado y esquema/copia v2 en iteración 9, ampliada a v3 con sucursales en iteración 10. [Cesta local](CESTA_LOCAL.md) registra contrato, evidencia y límites; la matriz siguiente se mantiene como control de regresión.

| Escenario | Resultado exigido antes de cerrar CES-02 |
| --- | --- |
| Actualizar biblioteca v1 | Historial, favoritos, fichas y precios preservados; cesta vacía y versión nueva válida. |
| Importar copia v1 o v2 | Resumen correcto, confirmación y sustitución completa; v1 sin cesta, v2 con cantidades y referencias preservadas. |
| Archivo inválido/desconocido o cancelación | Rechazo útil sin modificar datos. |
| Fallo al migrar/escribir/restaurar | Sin estado parcial; anterior recuperable y error visible. |
| Limpiar historial | Conservar fichas aún referenciadas por cesta/favoritos/precios según contrato. |
| Borrar todo | Eliminar también cesta y datos derivados privados. |
| Dos pestañas o instancias / diálogo abierto | No sobrescribir silenciosamente cambios ajenos; política comprobada con cada adaptador. La iteración 9 añade comparación/escritura transaccional entre clientes y comprobación del estado confirmado. |
| Retroceso de app | Cliente antiguo no modifica esquema desconocido; no recomendar reinstalar/downgrade como recuperación sin prueba. Preferir corrección compatible hacia delante. |

Conservar copias de prueba sintéticas y verificar restauración web/Android, reinicio y offline. Los datos públicos permanecen separados; una futura caché pública tendrá pruebas de retención/borrado y no viajará como anotación privada en una copia.

## Dispositivos y comprensión

CAL-02 exige al menos Android físico representativo y uno de recursos modestos, registrando modelo, SO, versión/commit y resultado. Probar cámara con envases reales, iluminación, linterna, permiso denegado/bloqueado, ajustes, segundo plano y reescaneo. Entrada manual siempre disponible; respuestas tardías no sustituyen el producto activo.

Probar comparación/cesta, teclado, fuente ampliada, controles alcanzables, lector TalkBack, temas y errores sin depender del color. Red lenta/sin red, límites de biblioteca, importación/exportación y actualización deben formar parte del recorrido. Si se distribuye iOS, añadir build nativa, dispositivo y VoiceOver antes de declararlo soportado.

CAL-01/GLU-01 validan que participantes entienden precio observado frente a precio actual garantizado, parcial frente a completo, diferencia de muestra frente a ahorro real, y declaración de gluten frente a certificación. Registrar tarea, hallazgo, severidad, corrección y revalidación. No dar por realizadas sesiones o revisión experta al pasar tests.

## CI y controles por cambio

El workflow existente comprueba app, Firebase emulado, dependencias, secretos y Android. Revisar protección de rama por separado: un workflow correcto no garantiza que GitHub impida integrar sin él. Los resultados siempre se asocian a un commit, no a todas las revisiones futuras.

Comandos actuales de referencia, con Node/npm fijados y Java 21 para emuladores:

```bash
npm ci
npm run check
npm run test:e2e
npm run secrets:check
npm run audit:security
```

Pruebas de reglas/servidor con `demo-sin-gluten`, sin credenciales de producción; comandos en [Despliegue y pruebas](DESPLIEGUE_Y_PRUEBAS.md). Cambios de SDK, permisos o configuración nativa requieren build pertinente. Documentación solamente: revisar enlaces, coherencia de prioridades/IDs, diff y secretos; no reconstruir APK ni reiniciar Expo sin necesidad.

## Seguridad y bloqueos de distribución

SEG-01 sigue abierto: la consulta del 03-11 registra 60 entradas afectadas de app y 6 de functions. Nuevos avisos de glob/minimatch, además de Zod, OpenTelemetry y deepmerge; el control también rechaza cadenas incompletas del informe. No se ha evaluado todavía la exposición de todas las cadenas nuevas. Las excepciones anteriores siguen exactas y vencen el **22-11-2026**; [Dependencias](DEPENDENCIAS.md) detalla el estado.

`audit:security` reconoce solo las excepciones anteriores y falla por avisos no aceptados y cadenas incompletas; **`audit:release` sigue bloqueado** y debe pasar para publicación general. No ampliar excepciones para simular limpieza, ocultar avisos ni aplicar `audit fix --force`. Un aviso nuevo se evalúa por alcance y puede bloquear antes. Revisar seguridad antes de beta y de cada distribución.

Clave histórica revocada, archivos de entorno excluidos y escaneo de archivos/historial con excepción exacta documentada. No registrar códigos de autorización, tokens ni valores de `.env` en evidencia. Sin secretos administrativos en variables públicas. [Credenciales](SEGURIDAD_CREDENCIALES.md).

Nube opcional fuera del MVP. Si en el futuro se activa, deberá pasar aislamiento entre cuentas, autorización administrativa, validación, cuotas, moderación, borrado/TTL, conflictos, coste y recuperación remota. Tener pruebas en emulador no acredita ese despliegue.

## Métricas y límites operativos

No hay telemetría remota configurada ni beta medida. Empezar con registro local de pruebas y sesiones consentidas, sin enviar cesta, notas o historial identificable. No incorporar un receptor de pago para obtener métricas.

| Señal propuesta | Cómo interpretarla |
| --- | --- |
| Cobertura de producto | Productos con al menos una observación elegible / N consultados; indicar zona, fechas, filtros, páginas y fallos aparte. |
| Cobertura de cesta | Cestas completas por establecimiento / cestas evaluadas, con criterio y muestra declarados; no confundir con porcentaje de cadenas cubiertas. |
| Diferencia estimada | Solo entre cestas completas y condiciones equivalentes de la muestra. Ahorro real requiere contrastar compra equivalente efectuada. |
| Comprensión y utilidad | Personas que completan la tarea y explican faltantes/condiciones; registrar número de sesiones y hallazgos. |
| Latencia y recursos | Separar frío/caliente, offline/red, proveedor/cálculo/render; equipo, SO, datos y repetición registrados antes de fijar umbrales. |
| Fallos y disponibilidad | Versión, plataforma, sesiones e incidentes; distinguir caída externa de fallo local. No inferir 99,5 % de estabilidad de unos pocos recorridos. |
| Tráfico | Peticiones por acción, cancelaciones/429 y caché; no consultar automáticamente toda la biblioteca/cesta. |

DAT-01 establece línea base de cobertura antes de integrar nuevas fuentes; DAT-02/DAT-03 necesitan justificar retención/volumen. Límites actuales de proveedor en [Comparador](COMPARADOR_DE_PRECIOS.md); presupuesto de consultas desde cesta se fijará antes de implementarlo. No prometer consultas ilimitadas porque no se pague backend.

## Beta, publicación y mantenimiento

BET-01 propone 5–10 participantes con consentimiento, versión identificable y soporte. Cerrar antes fallos críticos, CAL-01/CAL-02, revisión de gluten aplicable, datos recuperables y revisión de seguridad. Ajustar alcance si cobertura insuficiente; no sustituir faltantes con precios inventados ni cambiar silenciosamente la promesa.

Antes de publicación general REL-02:

- Flujo de cesta/comparación definido para esa versión, cobertura y limitaciones entendidas; evidencia de pruebas y compras de muestra.
- Controles sobre el commit final, `audit:release` y secretos correctos, sin fallos críticos abiertos.
- Plataformas/dispositivos y accesibilidad comprobados; no anunciar iOS nativo sin build y prueba.
- Migraciones, copias, borrado y recuperación ensayados con datos existentes; soporte asignado.
- Nombre y presentación comercial revisados, Mesa conservada, firma de publicación custodiada fuera de Git y canal elegido.
- Privacidad, licencias/atribución, ayuda y soporte coherentes con datos realmente tratados.
- Distribución gradual y mecanismo para detenerla/corregirla; no reinstalar ni retroceder sin compatibilidad de datos comprobada.

No contratar cuentas de tienda o backend por cerrar documentación. La APK actual tiene firma de desarrollo y no acredita publicación. Mantener nube desactivada en todos los perfiles, revisión semanal de dependencias y excepciones antes del 22-11-2026. Registrar responsable, versión, evidencia y límites de cada entrega; la app profesional exige ese mantenimiento además de nuevas funciones.

## Iteración 12 · Medición pública DAT-01

[Informe, muestra y decisión](COBERTURA_PRECIOS_PUBLICOS.md): diez GTIN fijados antes de consultar, 20 GET de precios a producción más uno de preproducción. 33 observaciones compatibles y cero elegibles para la muestra Madrid; sin cestas completas ni errores de proveedor. Plan, instantánea pública y resumen ODbL separados de la biblioteca y de la caché de la app. Reproducción offline con `npm run coverage:prices -- --replay`; nuevas consultas acotadas con `--collect`, sin subir anotaciones ni activar servicios.

Comprobaciones: 220 pruebas de app, 42 de seguridad, tipos, lint y compatibilidad Expo. Las pruebas del colector simulan red, presupuesto, 429 y preproducción; no repiten la consulta pública. No se cambia el contrato v4. DAT-03 pasa a P1 para evaluar una fuente adecuada antes de integrarla; DAT-02 sigue condicionada. El control de dependencias sigue bloqueado por deepmerge, sin ampliar excepciones.

## Iteración 13 · Viabilidad de otras fuentes

[DAT-03 investigada](FUENTES_PUBLICAS.md): Carrefour, FACUA y el conjunto MAPA de origen/mayorista. La evidencia no permite aprobar otro proveedor; permisos/contrato no acreditados o ámbito incompatible. No se descargan catálogos, incorporan precios ni crean adaptadores internos sin contrato. Integración condicionada; siguiente entrega CAL-01 técnica con anotaciones sintéticas declaradas. No acredita compra física, accesibilidad nativa ni revisión experta.

Entrega de documentación y corrección del selector ambiguo de avisos en la prueba web de alternativas, sin cambios de runtime, dependencias, almacenamiento v4 o nube. Se validan enlaces, tareas, históricos y secretos; se repiten tipos, lint, compatibilidad Expo, 220 pruebas de app, 42 de seguridad y 42 recorridos web. La auditoría actual mantiene el bloqueo por deepmerge, sin ampliar excepciones.

## Iteración 14 · Recorrido de compra integrado

[CAL-01 técnica verificada](VALIDACION_COMPRA.md): consulta y anotación por UI, sucursales confirmadas, totales completos/parciales, sustitución con cantidades y recuperación de copia v4 offline. Oráculo de importes independiente, discrepancia público/privado, milésimas, ofertas, país y 429. Cuatro pruebas web nuevas. «Editar mi cesta» navega expresamente a la cesta desde un acceso directo; no depende de volver en el historial. No cambia el esquema ni el runtime nativo. Compra real, validación física, beta y revisión experta siguen pendientes; ese tramo se verifica después en iteración 15, con físico todavía pendiente.

Comprobaciones finales de iteración 14: **220 pruebas de app, 42 de seguridad y 46 recorridos web**, tipos, lint y compatibilidad Expo correctos; secretos sin hallazgos nuevos no aceptados. La auditoría de dependencias sigue fallando por deepmerge; no se presenta como una publicación aprobada.

## Iteración 15 · Validación Android y control de APK

[CAL-02 emulada verificada](VALIDACION_ANDROID.md), ejecutada el 31-10 y documentada al cierre del 03-11: actualización v4 → v4, totales 7,75/8,07 €, sustitución a 7,60/7,80 €, persistencia SQLite, copias nativas exportadas/restauradas y comparación independiente del JSON. Denegación y recuperación del permiso desde ajustes, sesión de cámara emulada, petición TORCH, liberación asíncrona al salir y acceso directo a editar cesta. Fuente al 200 % y tema oscuro revisados. ARM64 incluida en la APK, ejecución únicamente x86_64; cámara física, TalkBack, iOS, compra real y revisión experta pendientes.

Se bloquea el permiso de superposición innecesario y se inspeccionan automáticamente las APK preview local y de CI: permisos, hash, bundle, ABI, copia de Android y patrones de claves/archivos de entorno. No es una auditoría universal de secretos ni una verificación criptográfica de firma. Builder incremental opcional con idéntico hash (11 min 34 s → 1 min 10 s en este equipo). Receptor de compartir separado y solo de ensayo, sin red, fuera del producto.

`npm run check` correcto: 220 pruebas de app/20 suites y 43 pruebas Node de seguridad (una engloba diez casos Python), tipos, lint y Expo. Los 46 recorridos web corresponden a CI de la base c43bb24, no a una repetición local en esta entrega. Auditoría del 03-11 bloqueada: 60 entradas de app y 6 de functions, sin ampliar excepciones ni modificar lockfiles. Siguiente iteración técnica SEG-01; [detalle vigente](DEPENDENCIAS.md).

## Iteración 16 · Simplificación del uso

[Recorrido reducido](USO_SENCILLO.md): mostrar primero búsqueda/comparación y datos esenciales del precio; detalles secundarios desplegables. La simplificación conserva borradores, selección, resumen de filtros, faltantes y condiciones. El estado abierto/cerrado se expone a tecnología de asistencia; los controles cerrados no participan en la navegación accesible. Se conserva Mesa y la evidencia sobre gluten.

220 pruebas de app y 48 recorridos web correctos, con TypeScript y ESLint. Dos casos nuevos verifican persistencia de filtros/borradores al plegar, precisión del precio y conservación de formato/condiciones en la copia exportada. Guardado alcanzable y sin desbordamiento horizontal en la muestra web de texto ampliado; no acredita TalkBack, VoiceOver ni todo el comportamiento de fuente del sistema. Gitleaks sin hallazgos nuevos. Sin dependencias o permisos nuevos, cambios de esquema, servicios de pago ni nueva APK. SEG-01 y la matriz física siguen pendientes.

## Iteración 17 · Ficha y cantidades

La [simplificación de ficha y cesta](IMPLEMENTACION.md) conserva avisos visibles y el contrato de datos. Comprobar guardado inmediato con «−»/«+», límites 1–99, protección de borradores, foco, recálculo y persistencia; ingredientes/fuente deben abrirse sin consultas adicionales. [Guía de uso](USO_SENCILLO.md). Los recorridos web no sustituyen TalkBack, VoiceOver, cámara física o revisión experta; SEG-01 sigue abierto.

Resultado final: 220 pruebas de app/20 suites y 51 recorridos web correctos, tipos y lint. Tres casos nuevos cubren ficha y cantidades; teclado web, actualización a 9,40 €, copia con precios intactos y muestra de texto ampliado incluidos. La primera ejecución de app tuvo un timeout de Confirm y la repetición secuencial pasó sin aumentar su plazo. El ajuste de foco se verificó de nuevo y después pasó la suite web completa. No se declara una nueva validación nativa o física.

## Iteración 18 · Catálogo y ofertas

[Búsqueda por nombre](BUSCADOR_DE_PRECIOS.md), con muestra explícita, tienda/localidad local y descuentos observados sin prometer vigencia. 231 pruebas de app, 43 controles de seguridad y suite web de 57 casos correctos; seis recorridos del catálogo repetidos tras ajustes finales. Incluye fallo del proveedor con precios privados utilizables, copia sin catálogo público, filtros después de seleccionar última observación, cancelación al salir y respuesta tardía descartada. Cliente real y navegador confirman la escasez/antigüedad de precios de huevos: no se interpreta como cobertura suficiente ni compra realizada. Sin cambios de dependencias, esquema, nube o permisos; publicación y físico conservan sus bloqueos.
