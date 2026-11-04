# Iteración 21 · Buscar y ver precios dentro de la app

> La presentación se actualiza en la [iteración 22](INTERFAZ_ACCESIBLE.md): tipografía sans, supermercado e importe alineados, controles secundarios discretos y mejoras de teclado/texto ampliado. Se mantiene este contrato de datos y navegación interna; las advertencias generales repetidas pasan al detalle de cada cadena.

Petición del propietario, **04-11-2026**: simplificar la app a un buscador de productos cotidianos, con precios por supermercado y sin enviar al usuario a páginas externas.

## Recorrido actual

Inicio y Comparar comparten el buscador. Solo hay un campo visible: «Buscar productos». Se puede escribir «huevos» y pulsar «Buscar precios», o tocar las sugerencias Huevos, Leche y Arroz.

Los resultados muestran una tarjeta por cadena con el menor importe publicado de su muestra. Cada tarjeta conserva nombre del producto, formato literal, precio por unidad cuando lo publica la fuente, fecha, oferta y condiciones. «Ver los N precios de…» despliega los otros productos dentro de la app; con una sola referencia se muestran sus detalles. No hay botones para abrir supermercados o fuentes externas desde la comparación.

«Desde» se refiere al importe de un envase disponible en esa cadena. Los tamaños pueden ser distintos: este orden no demuestra qué supermercado es más barato para una cantidad equivalente. La referencia online tampoco confirma precio por CP, disponibilidad o sucursal. Una cadena sin resultados se identifica como «Sin precio disponible», sin asignar cero ni afirmar que no venda el producto.

## Opciones secundarias

- «Filtrar precios y ofertas»: cadena, texto de tienda/localidad, solo ofertas e histórico. Los filtros activos siguen indicados y los borradores se conservan al cerrar opciones.
- «Sobre estos precios»: copia offline, fallos de actualización, cobertura y cadenas pendientes, sin enlaces externos.
- «Otras aportaciones y mis precios»: observaciones privadas y Open Prices, con comparación por código dentro de la app, paginación y errores de esa fuente separados del catálogo.
- En Comparar, «Mis productos y precios»: cesta, escáner, códigos, productos guardados y anotación manual. Gluten sigue disponible en las fichas y en el filtro de productos guardados.

## Reglas y arquitectura

`CatalogSearch` se reutiliza en Inicio y Comparar. `groupRetailPrices` agrupa referencias ya validadas y filtradas por cadena, ordena por importe y conserva todas las variantes, condiciones y formatos. No altera el catálogo ni fabrica GTIN, vínculos con la cesta o equivalencias. `StorePrices` limita la primera expansión a diez referencias y permite cargar más dentro de su tarjeta.

Buscar solamente «huevo» o «huevos» excluye claras, codorniz, cocidos, chocolate y preparados líquidos/hilados. Esas referencias siguen accesibles con búsquedas explícitas, por ejemplo «claras de huevo» o «huevos de codorniz».

Se mantienen las fechas originales, vigencia de promociones, antigüedad máxima de tres días en catálogo y siete en aportaciones, exclusión de Valencia en la referencia Mercadona de Barcelona, precisión entera y separación de fuentes privadas/públicas. Los errores de validación se muestran junto al campo. No cambian esquema/copias v4, dependencias, servicios o facturación.

## Verificación y siguientes pasos

Las comprobaciones de esta iteración cubren agrupación sin mutación, formatos y condiciones preservados, relevancia de huevos, búsqueda desde Inicio, expansión de variantes sin navegación ni pestañas externas, seis cadenas, filtros, fallos de red y recuperación de funciones avanzadas. La evidencia técnica y las limitaciones se registran en la entrega; no sustituyen una prueba física de Expo Go.

Comprobado el 04-11-2026: **260 pruebas de app, 58 de seguridad y 63 recorridos web** correctos, además de tipos y lint. Tras el ajuste final de presentación y cierre de teclado se repiten los 14 recorridos afectados, todos correctos. Consulta real de «Huevos» desde Inicio: catálogo y Open Prices HTTP 200; cuatro cadenas con precios disponibles, una sola página abierta, cero botones de salida, sin errores JavaScript ni desbordamiento horizontal en 390 px. Las otras dos cadenas se indican sin precio para esa búsqueda. El paquete Android de Expo responde HTTP 200 en la red local e incluye el nuevo buscador y agrupación; no se declara una prueba física en teléfono. Estos controles no sustituyen los pendientes de dependencias o distribución documentados previamente.

La siguiente prioridad de producto es comparar formatos equivalentes con unidades fiables y ampliar cobertura manteniendo este recorrido sencillo. Para ello siguen pendientes CP comprobado, acceso mantenible a otras cadenas y validación con una compra real. No se promete todo el surtido de Barcelona. Los bloqueos de distribución y dependencias existentes siguen en [la hoja de ruta](HOJA_DE_RUTA.md) y [Dependencias](DEPENDENCIAS.md).

Fuentes y actualización: [Barcelona](PRECIOS_BARCELONA.md). Contrato de aportaciones: [buscador por nombre](BUSCADOR_DE_PRECIOS.md). Guía: [uso sencillo](USO_SENCILLO.md).
