# Precios de Mercadona, Aldi y Lidl

**Iteración 19 · 04-11-2026 · SUP-01.** El buscador de Comparar incorpora precios web reales de estas tres cadenas, además de las observaciones Open Prices y las anotaciones privadas. No necesita Firebase, cuenta, claves de proveedores ni backend contratado.

## Qué puede probarse

Escribir «huevos», «leche», «arroz», «patatas» o «pollo» y pulsar Buscar precios. El campo de tienda permite acotar a Mercadona, Aldi o Lidl; también se entiende «Lidel». La búsqueda de plurales básicos encuentra nombres en singular. Solo ofertas filtra los descuentos identificados; los productos conservan su cantidad, origen, fecha y condiciones. El menor importe de un paquete pequeño no implica el menor precio por kg/l/unidad.

Los resultados de supermercados aparecen ordenados por importe publicado. Debajo siguen los precios aportados por personas, con sus reglas anteriores. No se mezclan identidades: el SKU de una cadena **no es un GTIN**. Estos resultados no se añaden automáticamente a la cesta, no acreditan ausencia de gluten y no se usan para sumar una cesta por sucursal confirmada. El enlace de cada resultado abre la ficha oficial para revisar el precio y la disponibilidad.

## Fuentes y ámbito

| Cadena | Fuente utilizada | Cobertura y límites |
| --- | --- | --- |
| Mercadona | Categorías JSON de la [tienda online](https://tienda.mercadona.es/), por ejemplo `/api/categories/77/?wh=vlc1`. | Referencia online del almacén **vlc1, Valencia**. No se atribuye a una tienda física ni al código postal del usuario. Diecisiete categorías básicas: huevos, leche/bebidas, mantequilla, arroz, pasta, legumbres, aceite, fruta, verdura, pollo, pan, queso, conservas, tomate, cereales y galletas. Solo paquetes fijos; pesos aproximados y selectores a granel quedan excluidos. |
| Aldi | Datos estructurados incluidos en la [página oficial de ofertas](https://www.aldi.es/ofertas.html), `OFFER_GET`, región `pen`. | Ofertas y productos destacados de esa página para Península, no todo el surtido. Mantiene `salesUnit` y fechas explícitas. Excluye retiradas, precios sin vigencia y promociones de cantidad ambiguas. No se extrapola a Baleares/Canarias. |
| Lidl | Datos `data-grid-data` de las [ofertas semanales](https://www.lidl.es/c/store/ofertas-semanales/a10089449), `regionsPrices[1]`. | **Zona de precio 1**, sin tienda seleccionada. Precio normal y Lidl Plus son registros distintos. Lidl Plus muestra la condición de fidelidad/cupón. No sustituye precios de otra zona ni usa importes «desde», variantes con precios distintos o descuentos ambiguos de segunda unidad. |

Se consultan interfaces públicas de las tiendas, sin sesión, cookies, claves extraídas o intermediarios de pago. Son adaptadores propios sobre contratos web que pueden cambiar; no una API comercial acordada ni una licencia ODbL de esas cadenas. Se conservan únicamente hechos de precio/formato/fecha y enlaces, sin imágenes, textos largos, reseñas o datos de personas. La revisión del 03-11 también leyó `robots.txt`: Mercadona desautoriza el rastreo de `/api`; el acceso técnico no demuestra permiso general de extracción o reutilización. La evaluación de condiciones y derechos para una distribución comercial a escala sigue pendiente; no se promete acceso estable o extracción ilimitada.

Carrefour conserva su enlace oficial: no se anuncia un adaptador que no está implementado. Los huecos de surtido, zona y sucursal siguen siendo trabajo de cobertura; una tienda sin resultados puede vender el producto.

## Móvil, web y funcionamiento sin conexión

En **Expo Go/Android/iOS**, una búsqueda explícita consulta directamente las fuentes necesarias. Mercadona selecciona localmente hasta tres categorías según las palabras buscadas; Aldi y Lidl requieren como máximo una página cada una. El nombre escrito no se manda a esas tiendas: se piden categorías o páginas semanales fijas. Se aplica el filtro de tienda antes de decidir qué fuentes consultar. Una consulta nativa realiza como máximo cinco GET de supermercados, en paralelo con los hasta dos GET ya existentes de Open Prices. No se busca mientras se escribe.

Los parsers de móvil y del actualizador son el mismo módulo puro. Timeout de ocho segundos por petición móvil, comprobación de tamaño declarado y cuerpo de hasta 6 MiB, validación de URLs oficiales, SKU, moneda, enteros monetarios y fechas. Caché de quince minutos por fuente/categoría; fallos enfriados un minuto. Cancelación y cambios de foco descartan respuestas tardías. Un fallo mantiene los importes y fechas anteriores y muestra el aviso correspondiente; no inventa una actualización correcta. Una categoría renovada sustituye sus registros anteriores para no resucitar precios retirados.

En **web**, se descarga un único JSON público del repositorio, sin términos de búsqueda ni datos privados, evitando depender de CORS de las tiendas. La app incluye también `data/retail-prices.es.json` como copia inicial offline. Descarga con límite 2 MiB, timeout ocho segundos, caché cinco minutos y esquema estricto; rechaza archivos anteriores al incluido o fechados en el futuro. En esta rama, el archivo remoto pertenece a `gonsals/mejoras`; al promover a `main` hay que cambiar conjuntamente esa referencia del cliente y el flujo de actualización.

Se admiten por defecto datos consultados en los últimos **tres días**; las aportaciones Open Prices conservan sus siete días. Los registros antiguos requieren abrir el filtro de históricos y mantienen aviso. **Las ofertas futuras o caducadas nunca entran**, ni siquiera al ampliar el histórico. Las fechas se revisan durante el uso de la pantalla; no se mantiene una oferta visible por haberla abierto antes de vencer. Las copias privadas v4 y SQLite/IndexedDB no almacenan estos catálogos.

## Actualización reproducible

`npm run prices:refresh` realiza diecinueve lecturas públicas como máximo: diecisiete categorías Mercadona, una página Aldi y una Lidl. Peticiones secuenciales, pausa de 1,1 segundos entre categorías, sin barrido de fichas o almacenes, sin reintentos automáticos. Cada fuente se valida antes de sustituir sus datos. Un fallo parcial conserva las fechas originales de esa fuente; si fallan todas, el archivo no se escribe. No se usan credenciales ni endpoints de escritura.

El workflow `.github/workflows/retail-prices.yml` comprueba los parsers y actualiza únicamente ese archivo, mediante commit ordinario y sin forzar la rama. Se ejecuta al cambiar el importador/workflow y admite ejecución manual. Tiene horario diario preparado, pero **GitHub solo ejecuta cron en la rama predeterminada `main`**: mientras siga solo en `gonsals/mejoras`, el refresco diario de la copia web no está activo. La consulta móvil directa funciona independientemente de ese cron. No se cambia `main` ni la configuración de facturación para activar el horario.

## Evidencia y siguientes pasos

Prueba real con **el cliente móvil implementado**, ejecutado en Node con TLS validado, búsqueda «patata»: tres GET, respuestas HTTP 200 de Mercadona/Aldi/Lidl y dieciséis coincidencias entre las tres cadenas. Copia normalizada: **896 registros** (556 Mercadona, 272 Aldi, 68 Lidl), consultados el 03-11-2026. Se excluyeron promociones ambiguas detectadas al revisar los datos reales. Esto acredita lectura y presentación de una muestra; no inventario local, cobertura nacional ni equivalencia por GTIN.

Evidencia local ignorada: `artifacts/iteration-19/live-smoke.json`. La prueba HTTP ejecuta el mismo adaptador y parsers que el móvil, pero no sustituye una prueba física en Expo Go. Los recorridos de navegador usan respuestas controladas para contrastar orden, filtros, condiciones, fallo remoto, fechas, caché y navegación. La APK congelada de iteración 15 conserva su interfaz anterior.

Validación: 254 pruebas de app/25 suites, 53 de seguridad y 60 recorridos web; los nueve de catálogo/supermercados se repiten tras ajustar la presentación. Tipos y lint correctos. Paquete Android de Expo Go HTTP 200, con adaptador, parser compartido y catálogo incluidos; evidencia `artifacts/iteration-19/expo.json`. Revisión React de dependencias, cancelación/foco, identidades, controles accesibles y fechas durante uso; no se añaden paquetes. Gitleaks revisa archivos publicables e historial sin ampliar excepciones.

Pendiente: ampliar fuentes/categorías solo tras revisar contrato y carga; selección real de zona/almacén y tienda; comparación por unidad homogénea en estos resultados; correspondencia explícita SKU/GTIN antes de conectar cesta/gluten; y operación del refresco web en la rama de publicación. La medición de cestas completas por sucursal y las validaciones física/experta siguen abiertas. SEG-01 conserva sus bloqueos de seguridad y compatibilidad Expo; esta función no los resuelve.
