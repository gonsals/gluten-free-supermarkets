# Buscar productos, tiendas y ofertas

**Iteración 18 · 03-11-2026.** Petición del propietario: escribir «huevos», encontrar precios por tienda y consultar ofertas sin necesitar el código. El buscador ocupa ahora la entrada principal de Comparar. [Guía breve](USO_SENCILLO.md).

## Uso y alcance

1. Escribir un nombre y, opcionalmente, tienda o localidad. Pulsar «Buscar precios»; no se consulta mientras se escribe.
2. Revisar resultados de menor a mayor **por envase**, con nombre, marca, formato, tienda, localidad, origen y fecha. Distintos productos o formatos siguen separados; un envase más barato no demuestra menor precio por huevo/kg/l.
3. «Solo ofertas» muestra descuentos identificados por la fuente o anotaciones privadas con fin de oferta. Las notas privadas por sí solas no se presentan como promociones.

Por defecto, precios públicos de España y observaciones de los últimos siete días. Las anotaciones privadas no reciben un país inventado. «Incluir precios anteriores» requiere una acción y conserva un aviso visible: **no son precios ni ofertas vigentes garantizados**. Una oferta privada vencida sigue excluida. Los descuentos públicos muestran su fecha y condiciones conocidas, como tarjeta o compra por cantidad; al no recibirse una vigencia verificable, se describen como «oferta observada».

El filtro de tienda/localidad actúa sobre los resultados cargados. No permite garantizar el menor precio de todas las sucursales ni cobertura completa de una cadena. Se combinan precios públicos y privados identificables por el mismo GTIN, conservando referencias y procedencia separadas. Para el mismo producto/referencia se selecciona la observación más reciente **antes** de filtrar ofertas o antigüedad: no reaparece una promoción anterior sustituida por un precio normal.

Los códigos y el escáner permanecen en «Buscar por código o escanear»; la biblioteca y anotaciones completas, en sus desplegables. Comparar un resultado abre el comparador existente del mismo código y conserva el nombre como contexto visual, sin fabricar una ficha o una evaluación de gluten. Al abrir una oferta o un precio anterior mantiene los filtros necesarios para consultar ese resultado; sus avisos siguen visibles. El acceso directo por código conserva los valores predeterminados anteriores.

## Fuente y contrato comprobado

Se utiliza [Open Prices](https://openfoodfacts.github.io/open-prices/), sin cuenta, clave o backend nuevo. El [filtro oficial de productos](https://github.com/openfoodfacts/open-prices/blob/main/open_prices/api/products/filters.py) admite `product_name__like`; el [contrato de precios](https://github.com/openfoodfacts/open-prices/blob/main/open_prices/api/prices/filters.py) admite `product_code__in`. El campo `product_name` de precios es un filtro exacto y no sustituye la búsqueda del catálogo; las primeras pruebas con él no dieron resultados y se descartó esa vía.

Cada acción consulta una página de hasta veinte productos alimentarios (`source=off`, con al menos un precio declarado) y después una página de hasta cincuenta precios para sus códigos validados. Como máximo dos GET por acción; hasta tres páginas de productos, solicitadas expresamente (sesenta productos y ciento cincuenta registros de precio como techo de una búsqueda). La muestra puede omitir tiendas/precios: se informa del truncamiento y de los registros no utilizados. No se recorren catálogos completos ni se solicitan fichas una a una.

El filtro documentado `location__osm_name__contains` produjo cero coincidencias en la comprobación de preproducción con referencias Carrefour existentes; el código oficial lo convierte en un filtro de elemento de array. Se decidió no depender de él. El nombre se envía al catálogo; **la tienda/localidad se filtra en el dispositivo y no se envía**. Los códigos de la segunda petición proceden exclusivamente del catálogo público recibido, nunca de la biblioteca privada.

El cliente comparte transporte y espera de 429 con la consulta por código: timeout de ocho segundos por petición, cancelación, respuesta limitada a 2 MiB, validación de paginación, códigos, importes y fechas. Caché pública solo en memoria, cinco minutos y hasta treinta páginas de búsquedas. No se guarda en SQLite/IndexedDB, favoritos, historial o copias. No se conservan autoría, tickets, imágenes o comentarios del proveedor. El contrato anterior de consultas/mediciones por código se mantiene; los campos adicionales de promoción se añaden solo en búsqueda.

Un error del catálogo o de precios se distingue de un resultado vacío. Los precios privados siguen funcionando. Si falla la consulta de precios tras obtener productos, se conserva esa información como resultado parcial y se permite reintentar. Cancelar, cambiar de búsqueda o abandonar la pestaña invalida respuestas tardías; volver de una consulta interrumpida no afirma que no existan precios.

## Ofertas oficiales

Hay enlaces explícitos a las [ofertas semanales de Lidl](https://www.lidl.es/c/store/ofertas-semanales/a10089449) y a las [ofertas de alimentación Carrefour](https://www.carrefour.es/supermercado/c/cat20009/c), comprobados el 03-11. Abren la web oficial; sus precios **no se importan automáticamente** al ranking y no se mezclan con Open Prices. Pueden exigir elegir tienda/código postal o revisar fidelidad, cantidades y fechas. No se ha programado extracción masiva ni se presume acceso a todos los catálogos comerciales. Las demás integraciones siguen sujetas al contrato de [Fuentes públicas](FUENTES_PUBLICAS.md).

## Prueba real y límites de cobertura

Se comprobó primero esquema y consultas en preproducción, conforme a la [guía del proveedor](https://github.com/openfoodfacts/open-prices/blob/main/API.md). Después, lectura limitada de producción y repetición con **el cliente implementado**, no con otro normalizador. La búsqueda «huevos» devolvió cuatro productos y tres precios EUR interpretables de España: observaciones de **01-02-2025, 06-04-2026 y 05-05-2026**, sin descuento declarado. Ninguno cumple la ventana reciente al 03-11-2026; no son tarifas actuales y no acreditan qué tienda es hoy más barata.

La evidencia local queda en `artifacts/iteration-18/implemented-client-real.json`, junto con consultas, comprobaciones de CORS y pruebas sintéticas. El nuevo cliente obtiene esos datos sin cuenta ni Firebase. El encabezado CORS se comprobó con un origen web de prueba. No se presentan los resultados sintéticos de pruebas o capturas como ofertas reales. La licencia es Open Prices/ODbL, con atribución de ubicaciones © OpenStreetMap contributors/ODbL visible en la app.

No cambian esquema/copia v4, reglas de gluten, cuentas, permisos o dependencias. La APK de iteración 15 conserva su interfaz anterior; esta entrega se sirve en Expo Go y exportación web. Validación física, revisión experta, cobertura suficiente y bloqueos de seguridad/compatibilidad de SEG-01 siguen pendientes.

## Verificación de entrega

231 pruebas de app en 22 suites, 43 controles de seguridad y suite completa de 57 recorridos web correctos. Se añaden once pruebas de cliente/dominio y seis recorridos de catálogo: orden/envase, ofertas y condiciones, privacidad/fallo público, precios antiguos, cancelación/respuesta tardía, paginación y retorno desde otra pestaña. Los seis casos del catálogo se repiten después de los ajustes finales. Tipos y lint correctos; Gitleaks sin hallazgos no aceptados.

Además de las respuestas sintéticas, navegador Chromium con tamaño móvil y cliente real: «huevos» carga cuatro productos con dos GET, no muestra precios recientes y permite abrir explícitamente tres precios históricos en orden por envase. Informe local `artifacts/iteration-18/real-browser.json`. Se revisa la captura del buscador; este ensayo de navegador no acredita dispositivo físico o inventario de supermercados.

El ajuste final de navegación se verifica repitiendo diez recorridos de catálogo/comparador: abrir una oferta mantiene su inclusión y abrir un precio antiguo mantiene todas las fechas, sin cambiar los filtros predeterminados de los accesos anteriores.
