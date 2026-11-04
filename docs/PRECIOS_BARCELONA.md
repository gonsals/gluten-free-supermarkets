# Supermercados de Barcelona

**Iteración 20 · 04-11-2026 · SUP-02.** Se amplía el comparador a seis cadenas, con selección rápida de supermercado y una referencia de Mercadona solicitada para Barcelona. No se promete cubrir todos los establecimientos ni que una tarifa web anónima sea la de una sucursal concreta. El [contrato anterior](PRECIOS_SUPERMERCADOS.md) conserva la evidencia de la iteración 19.

## Uso

En Comparar, escribir «huevos», «leche», «arroz», «pollo» o «patatas». Se puede indicar una cadena o abrir **Elegir supermercado** y pulsar Mercadona, DIA, Caprabo, Ametller Origen, Aldi o Lidl. Elegir una cadena aplica la búsqueda si ya hay un nombre escrito. «Todas las cadenas» vuelve a la muestra conjunta. Se mantienen los filtros de ofertas e históricos, los formatos y la procedencia.

Barcelona es el foco de esta entrega; escribir Barcelona/BCN en el filtro público de supermercados no excluye las cadenas con referencia web sin CP. El ámbito de cada fila sigue visible. Para las aportaciones Open Prices, la localidad conserva el filtro anterior sobre observaciones reales. Otras localidades no reciben precios locales inventados. Un SKU de tienda sigue separado del GTIN, la cesta y la evidencia de gluten.

## Cobertura revisada

| Cadena | Integración actual | Ámbito y limitación |
| --- | --- | --- |
| Mercadona | 17 categorías, referencia `wh=bcn1`; 563 SKU en la primera importación. | Referencia **solicitada** para Barcelona, sin confirmar un CP o una sucursal. La app muestra ese límite. Identidad `mercadona:SKU:bcn1`, grupo `category:N@bcn1`; las observaciones antiguas de Valencia no se muestran ni se renombran. |
| DIA | 9 categorías, 122 SKU. [Ejemplo: huevos](https://www.dia.es/huevos-leche-y-mantequilla/huevos/c/L2055). | Catálogo web sin CP seleccionado. Primera página de huevos, leche, arroz, pasta, aceite, fruta, verdura, pollo y pan; no todo el surtido. |
| Caprabo | 8 categorías, 122 SKU. [Ejemplo: huevos](https://www.capraboacasa.com/es/supermercado/2059698-frescos/2059760-huevos/). | Referencia web sin CP, con primeras páginas de categorías básicas. El precio visible debe coincidir con el metadato de ese producto. No se mezcla precio por docena con precio del paquete. |
| Ametller Origen | 8 categorías, 308 SKU. [Ejemplo: huevos](https://www.ametllerorigen.com/es/lacteos-y-huevos/huevos-frescos). | Productos de los listados públicos en español, sin CP; disponibilidad genérica web, no existencias de una tienda. |
| Aldi | 181 referencias en la copia inicial de esta entrega. | Ofertas/destacados de la página semanal para Península; no surtido completo. |
| Lidl | 68 referencias. | Zona de precio 1; precio normal y Lidl Plus separados, sin tienda seleccionada. |
| Bonpreu / Esclat | Enlace oficial; precios no integrados. | La página de categoría observada devuelve HTTP 403 al lector. Los precios indexados por un buscador no se importan como actuales. |
| Carrefour | Enlace oficial; precios no integrados. | La lectura de categoría devuelve HTTP 403 en esta comprobación. |
| Alcampo | Enlace oficial; precios no integrados. | Inicio accesible, pero categoría de huevos y su ruta canónica devuelven HTTP 403. |
| Condis | Enlace oficial actualizado a [compraonline.condis.es](https://compraonline.condis.es/). | Condisline redirige al nuevo sitio, que inicia una sesión anónima por su proxy. No hay adaptador de precios ni uso de credenciales/sesión de tienda en esta entrega. |
| Consum | Enlace oficial; precios no integrados. | Las páginas consultadas entregan el shell del cliente sin catálogo interpretable. El contrato de lectura queda pendiente. |

La primera copia actualizada contiene **1.364 referencias**, con las seis fuentes en estado correcto. Las cantidades cambian con el catálogo y las promociones. «Otras cadenas de Barcelona» permite abrir las cinco webs pendientes y dice expresamente que sus precios no están integrados. No se simulan resultados para aparentar cobertura total.

## Contratos y datos

`retailSources.ts` centraliza cadenas, dominios, categorías conocidas y enlaces. Los parsers siguen siendo compartidos entre móvil y actualizador. El parámetro `wh` de Mercadona se comprobó en el JavaScript público de su tienda y se solicita explícitamente `bcn1`. Las comprobaciones sin cuenta de CP no acreditaron una resolución de entrega; no se presenta ese resultado como CP verificado.

DIA lee `vike_pageContext`, tanto `l2.plp_items` como `l1.items`. Conserva SKU alfanuméricos como `504P6` y cantidades literales como «pack 6 x 1 L». Excluye falta de stock, pesos aproximados/variables, precios de socios y promociones sin reducción directa interpretable. No convierte esos SKU en EAN. Caprabo segmenta las tarjetas y contrasta el importe visible con el JSON de métricas de **esa tarjeta**, sin enviar analítica, ejecutar scripts ni enviar formularios. Excluye promociones ambiguas de segunda unidad, tarjeta o acumulación. Ametller lee únicamente `Product/Offer` de JSON-LD con moneda EUR y disponibilidad web `InStock`; no importa configuraciones, imágenes o reseñas. Una oferta sin vigencia conocida no recibe una fecha inventada.

Se validan origen HTTPS y rutas de cada comercio, fuente declarada, grupo conocido, identidad, importes enteros en milésimas y fechas. El catálogo público admite las seis cadenas conocidas y mantiene lectura de la copia anterior de tres fuentes; un cliente antiguo puede rechazar la ampliación y conservar su copia hasta actualizar la app. Copia privada/almacenamiento **v4 sin cambios**, sin cuentas, nube, claves nuevas ni servicios contratados. Ajustes explica los nuevos destinos de conexión; no se envían biblioteca, precios privados, historial, cesta ni dirección personal.

## Límites operativos

Consulta móvil explícita: normalmente seis GET de supermercados para un básico; máximo once si el nombre combina varias categorías (tres Mercadona, dos por cada nueva cadena y dos páginas semanales). Se mantienen los hasta dos GET de Open Prices por acción. Cachés, timeout de ocho segundos, cuerpo hasta 6 MiB, cancelación y rechazo de respuestas tardías. Un fallo conserva importe y fecha previos. Las observaciones de Valencia quedan excluidas de los resultados de esta entrega, incluso si falla Barcelona.

Cambiar únicamente la cadena reutiliza la muestra Open Prices del mismo nombre/página durante su caché; no vuelve a consultar productos/precios por cada supermercado. El filtro continúa en el dispositivo. La consulta móvil de la cadena elegida conserva su caché propia.

Tras ese ajuste se repiten once recorridos de catálogo/Barcelona/supermercados, todos correctos, incluyendo una sola consulta comunitaria al cambiar únicamente a DIA. Los parsers rechazan identificadores ausentes, nulos, compuestos o numéricos inválidos antes de formar un SKU; la suite de 58 controles de seguridad se repite correctamente.

`npm run prices:refresh` recorre **44 páginas fijas** como máximo, sin explorar fichas, sucursales o páginas siguientes. Diez segundos por petición y pausa de 1,1 segundos entre páginas. Se valida por grupo: fallar una categoría no impide renovar otras; las fallidas mantienen sus fechas. HTTP 403/429 detiene las demás lecturas de esa cadena. Fallo de todas las fuentes deja el archivo intacto. `npm run prices:refresh -- --retailer dia` permite renovar solo DIA conservando las demás fuentes. El JSON se sustituye de forma atómica.

El workflow valida parsers/actualizador y publica únicamente el archivo público. El horario diario continúa preparado y **no activo fuera de main**; la consulta móvil no depende de ese horario. Web descarga una copia del repositorio y conserva la incluida si falla la descarga. Se mantienen tres días de frescura pública, siete para aportaciones, e históricos solo por acción explícita. Ofertas con vigencia conocida futura/caducada siguen excluidas. La revisión de derechos y condiciones para distribución comercial a escala, cobertura por CP y validación física siguen pendientes.

## Evidencia y siguientes pasos

Cliente implementado ejecutado en Node, con TLS validado: **seis GET con HTTP 200**, 55 coincidencias para «huevos» entre Mercadona, DIA, Caprabo y Ametller; Aldi/Lidl no tenían coincidencias en esa búsqueda. Evidencia local ignorada: `artifacts/iteration-20/live-smoke.json`. La primera importación detectó dos contratos que ya se cubren: páginas L1 de DIA y SKU de multipack alfanuméricos. Se renovó solo esa cadena después de corregirlos, sin cambiar las fechas de las otras cinco.

Validación: **258 pruebas de app en 25 suites, 58 de seguridad y 62 recorridos web**, tipos y lint correctos. Se revisó la captura de los nuevos resultados; los datos sintéticos no se presentan como precios reales. Expo Go sirve el paquete Android con HTTP 200 e incluye selector, tres adaptadores nuevos, separación Barcelona/Valencia y copia de precios; `artifacts/iteration-20/expo.json`. Gitleaks pasa en archivos publicables e historial, sin ampliar excepciones. Esto no sustituye una prueba física del teléfono ni resuelve la auditoría/compatibilidad pendiente de SEG-01.

Navegador sin fixtures después de publicar: descarga del JSON HTTP 200 con seis fuentes y selección de DIA/Caprabo/Ametller; diez, diecinueve y quince resultados de huevos respectivamente, sin errores JavaScript (`artifacts/iteration-20/real-browser.json`). El [refresco en GitHub](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/41747679363) renovó cinco cadenas, pero Caprabo devolvió HTTP 403 desde el runner. Se detuvo esa cadena y se conservaron sus 122 precios y fechas previas; la consulta directa local había respondido HTTP 200. Ese workflow termina en error para hacer visible la actualización parcial; no se presenta como un fallo de todas las consultas ni se oculta con reintentos o proxies.

Siguiente ampliación de cobertura: selección de CP con referencia realmente comprobada, contratos de las cinco cadenas pendientes, nuevas categorías/paginación explícita y comparación por unidad homogénea. Las condiciones de reutilización y acceso se revisan antes de crecer en volumen. Se conservan los bloqueos de SEG-01 y las validaciones física/experta; añadir precios no los cierra.
