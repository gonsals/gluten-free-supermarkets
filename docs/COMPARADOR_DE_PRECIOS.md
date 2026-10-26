# Comparar precios como función principal

Decisión del propietario, **26 de octubre de 2026**: orientar la app a comparar productos para comprar de forma más económica, conservando la información sobre gluten como función adicional. También solicita proponer el supermercado al anotar un precio cuando el producto lo identifica y autoriza investigar precios públicos sin contratar servicios.

Esta decisión sustituye la prioridad de consulta de gluten de la especificación inicial. Se conserva la dirección visual Mesa. SinGluten y los identificadores técnicos siguen siendo nombres de trabajo; no se ha aprobado un nuevo nombre comercial. Este documento registra el contrato y la evidencia de la iteración 8; el orden vigente de entrega se mantiene únicamente en la [hoja de ruta](HOJA_DE_RUTA.md), con tareas en el [backlog](PLAN_MEJORAS.md).

## Entrega de la iteración 8

- Inicio centrado en comparar; pestaña **Comparar** antes de Consultar y Biblioteca.
- Entrada por código, escaneo o producto guardado. La ficha ofrece **Comparar precios y anotar** como acción principal.
- Comparación por código y envase, con precios públicos y anotaciones privadas diferenciadas, tienda, sucursal/localidad, fecha y procedencia visibles.
- Menor importe entre las referencias comparables cargadas y diferencia frente al mayor importe de esa muestra. No se presenta como el menor precio de todo el mercado ni como un ahorro garantizado.
- Filtros de tienda/localidad, últimos siete días, ofertas/notas y ámbito español de las aportaciones públicas. Los resultados se muestran en grupos de veinte.
- Filtro adicional de productos guardados con declaración sin gluten. No certifica aptitud y no oculta la necesidad de revisar trazas, evidencia y envase.
- Sugerencia editable de supermercado en el formulario de precios; sin llamadas adicionales para obtener una ficha que ya está guardada.

La iteración 8 compara **un producto cada vez**. La iteración 9 añade [cesta local](CESTA_LOCAL.md), cantidades, copias y recuperación. La iteración 10 añade [totales por sucursal confirmada](TOTALES_Y_SUCURSALES.md). Alternativas con códigos distintos siguen pendientes.

## Supermercado sugerido

Se solicitan `stores` y `stores_tags` a Open Food Facts y se guardan como `Product.stores`, campo opcional compatible con fichas anteriores. Las nuevas consultas normalizan hasta veinte nombres de cien caracteres, sin duplicados por mayúsculas o acentos.

Las tiendas explícitas tienen prioridad. Si hay una, se propone en el campo; si hay varias, se ofrecen botones para elegir y se deja el campo libre. Si no hay tiendas explícitas, se admiten coincidencias exactas de marca con nombres de cadenas y la asociación Hacendado → Mercadona. Esta última está documentada en la [memoria oficial de Mercadona](https://info.mercadona.es/document/es/memoria-anual-2022.pdf). No se deduce una tienda buscando palabras en el nombre o ingredientes ni se amplía el mapa a marcas sin referencia comprobada.

La propuesta indica si viene de la ficha o de la marca. Una edición manual, incluida vaciar el campo, prevalece sobre metadatos que lleguen después. Las fichas anteriores sin `stores` se actualizan una vez al volver a consultarlas mediante el flujo de búsqueda; las fichas sin datos conservan la entrada manual.

Ni una tienda declarada ni una marca propia prueban disponibilidad o precio. No se inventa una sucursal: sigue siendo necesario indicar dónde se ha observado el precio.

## Investigación y fuente pública integrada

**Open Prices**, de Open Food Facts, ofrece aportaciones públicas consultables sin cuenta. El proyecto describe su recogida colaborativa de precios con pruebas aportadas por participantes: [descripción y acceso](https://github.com/openfoodfacts/open-prices), [precios de productos](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/product-prices/). La API y la licencia se documentan en [API oficial](https://github.com/openfoodfacts/open-prices/blob/main/API.md) y [esquema](https://prices.openfoodfacts.org/api/docs).

Se ha integrado lectura mediante `GET https://prices.openfoodfacts.org/api/v1/prices`, filtrada por GTIN y EUR. No requiere clave, cuenta ni Firebase. No se han conectado catálogos comerciales, APIs privadas ni sistemas de pago. La disponibilidad de datos depende de contribuciones; un resultado vacío no demuestra que un producto no se venda.

Contrato contrastado primero con el esquema y peticiones de lectura de preproducción. Una consulta acotada a producción con el nuevo cliente para el GTIN `3274080005003` devolvió **17 resultados, los 17 compatibles con el contrato**. Es una comprobación de esa muestra y ese momento; no acredita cobertura actual de España ni disponibilidad reciente en todas las cadenas.

### Controles de lectura

| Control | Política |
| --- | --- |
| Identidad | GTIN válido; normalización al formato usado por Open Prices y comprobación de equivalencia en cada resultado. |
| Petición | Solo GET, sin credenciales, cookies ni anotaciones privadas. El proveedor recibe el código y datos técnicos de conexión. |
| Volumen | Cincuenta resultados por página, tres páginas como máximo. Cargar más requiere pulsación; sin barridos masivos ni consulta de toda la biblioteca. |
| Recursos | Timeout de ocho segundos, cancelación al salir, caché en memoria de cinco minutos y máximo cien páginas almacenadas. No se persiste esta caché en la biblioteca. |
| Errores | Mensajes diferentes para fallo de conexión, timeout, 429, respuesta inválida y servicio no disponible. Un fallo no se convierte en «cero precios». |
| Reintentos | Explícitos; 429 aplica espera acotada. No se reintenta en bucle ni se registra un proveedor de pago. |
| Respuesta | Estructura paginada validada, como máximo cincuenta filas y límite de tamaño antes de interpretar el JSON. La lectura del cuerpo se acota también después de recibirlo. |
| Registros | Solo PRODUCT del mismo GTIN, EUR, importe positivo hasta 10.000 €, hasta tres decimales, fecha de calendario válida no futura, ubicación física identificada y campos compatibles. Se descartan duplicados marcados por el proveedor. |

La validación oficial de Open Prices distingue productos con código de categorías a granel: en PRODUCT no debe haber `price_per`; las categorías sí lo requieren. Se contrasta con su [validador](https://github.com/openfoodfacts/open-prices/blob/main/open_prices/prices/validators.py). La app no mezcla precios por kilo de categorías con precios de envase. Las milésimas públicas se conservan como enteros antes de ordenar; no se redondea prematuramente a céntimos.

No se descargan imágenes de tickets o pruebas. La normalización descarta autoría y comentarios personales que pueda incluir la respuesta; la app no los muestra ni los persiste. Se conserva un enlace al registro público para consultar su contexto.

## Reglas de comparación y límites

La comparación selecciona primero la observación más reciente de cada referencia de sucursal y origen. Después aplica filtros de edad, condiciones y ubicación. Descartar una observación nueva no hace reaparecer como actual una antigua más barata de esa misma referencia.

Por defecto se usan siete días y se excluyen ofertas públicas, ofertas privadas y anotaciones privadas con notas sin revisar. La persona puede ampliar filtros. Las ofertas privadas con vencimiento pasado se excluyen siempre del ranking; siguen disponibles en el historial de anotaciones.

La consulta pública comienza con España como filtro local de visualización. Ese filtro afecta solo a los datos públicos con país identificado; las anotaciones privadas no reciben un país inventado. Desactivar el filtro permite ver otros países en EUR. La búsqueda por tienda/localidad se aplica en el dispositivo; no se envía la dirección que se escriba al proveedor.

Las sucursales públicas se identifican por su ID de ubicación. Las privadas por tienda y localidad normalizadas. No se identifica automáticamente una sucursal privada con una pública: podrían ser establecimientos diferentes. Por eso el contador muestra **referencias comparables**, no un número garantizado de tiendas físicas distintas.

El ranking solo representa la muestra cargada. La antigüedad, las aportaciones descartadas, el límite de páginas y la falta de cobertura pueden afectar al resultado. No incluye gastos de desplazamiento, envío, tarjetas de fidelidad no aplicables ni disponibilidad comprobada. Tampoco equipara envases con códigos diferentes o versiones con/sin gluten por su nombre.

## Privacidad, licencia y compatibilidad

Los precios públicos son de Open Prices, bajo ODbL, con atribución visible y enlace a la fuente. La documentación de licencia enlazada explica las condiciones de reutilización. Las aportaciones públicas y las anotaciones privadas permanecen separadas en almacenamiento y exportación: comparar no publica, sincroniza ni transforma un precio externo en una anotación propia.

Las ubicaciones incluyen atribución visible a OpenStreetMap contributors y enlace a su [página de copyright](https://www.openstreetmap.org/copyright). No se incorporan imágenes de mapas ni logos externos.

Se mantienen SQLite/IndexedDB y esquema local 1. Las copias conservan el nuevo campo opcional de tiendas y siguen admitiendo las anteriores. No se cambian reglas ni funciones Firebase; la nube de cuentas permanece desactivada y no se añade un backend de pago ni una dependencia al proyecto.

Expo Go sigue levantado para pruebas en la red local. Los cambios de JavaScript pueden llegar por Fast Refresh; no se cambia el servidor que ya estaba utilizando el propietario.

## Comprobaciones y siguientes pasos

La matriz de esta iteración incluye reglas de tiendas, prioridad de edición manual, comparación por sucursal, edad/ofertas, privacidad de GET, cancelación/caché, contratos malformados y límites de lectura. Los recorridos de navegador usan respuestas sintéticas para que las pruebas no dependan de cambios en precios reales. La consulta real descrita arriba es una comprobación adicional acotada.

Resultados: **144 pruebas de app**, trece suites; **34 pruebas de seguridad**; tipos, lint y compatibilidad Expo correctos. **23 recorridos web** completos, con cuatro nuevos de sugerencia/corrección de tienda, comparación pública, filtros y errores. Después de ajustar la posición del aviso de conexión se repiten correctamente los cuatro recorridos de comparación. La primera ejecución de las pruebas de formulario encontró una limitación del registro de fuentes en Jest; se aisló el icono decorativo en esas pruebas. Los recorridos web y la APK utilizan las fuentes reales.

La última comprobación de los cuatro recorridos añade además navegación desde comparación a la ficha completa y visibilidad de trazas junto a una declaración sin gluten. El proveedor real devuelve HTTP 200 y un encabezado CORS compatible con el origen web de prueba. Una exportación web encontró una caché de Metro no legible, rehízo el recorrido de archivos y completó las pruebas; no se cambian los plazos de las pruebas para ocultar errores.

### Android emulado y paquete local

APK final: `artifacts/singluten-iteration-8-preview-universal.apk`, **71.404.535 bytes**, ARM64/x86_64, sin Metro y con nube de cuentas desactivada. SHA-256: `82e8a82dc06dd92e050223d41de3df8b85a2022b32726baab739d48a8345b1f4`. Compilación final correcta en **2 min 2 s**, 579 tareas, 37 ejecutadas y 542 reutilizadas. Usa firma de desarrollo y no es una distribución de tienda.

En Pixel 8 / Android 15 API 35 se utiliza una instancia propia `emulator-5582`, `-read-only -no-snapshot -no-window`, sin red activa ni redirección ADB a Metro. Una copia sintética con Hacendado/Mercadona y una anotación de 2,49 € comprueba que el nuevo campo de tiendas se conserva al restaurar y leer SQLite. El formulario propone **Mercadona**, se guarda otro precio de **2,29 €** y el ranking refleja ese menor importe. El fallo de red de Open Prices se muestra sin impedir la comparación de las anotaciones privadas.

Se actualiza a la APK final y se repiten lectura de tienda, presencia del acceso a la ficha de gluten y comparación del precio ya guardado. Se conservan tienda y precio tras esa actualización. La inspección del ZIP confirma las dos arquitecturas y no encuentra archivos `.env` ni coincidencias del patrón de clave Google utilizado. La instancia de prueba se cierra al terminar; el AVD original permanece conservado.

Capturas: [tienda propuesta en Android](diseno/iteracion-8-tienda.png) y [comparación privada sin conexión pública](diseno/iteracion-8-comparador.png). Los registros, matriz y manifiesto del APK permanecen en `artifacts/iteration-8/`. No se presentan estas pruebas como validación física, nativa de iOS ni de conectividad pública desde Android: la consulta real fue con el cliente HTTP, los recorridos públicos completos usan navegador y respuestas controladas.

La revisión de la iteración 8, **`638980a`**, tiene sus cinco jobs de CI correctos: [run 40270570028](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028). El resultado corresponde a esa revisión; los cambios posteriores requieren sus propios controles.

Continuación según la [hoja de ruta](HOJA_DE_RUTA.md):

1. **CES-01/CES-02:** cesta persistente con cantidades, migración, copias y borrado; entregada técnicamente en [iteración 9](CESTA_LOCAL.md).
2. **TIE-01/CES-03, entregadas en iteración 10:** identidad explícita y total con cobertura completa, [contrato y pruebas](TOTALES_Y_SUCURSALES.md). Incompletas con subtotal y faltantes; nunca precio cero para un producto sin dato.
3. **UNI-01/ALT-01:** formatos/unidades y alternativas explícitas, incluida información sobre gluten, sin equiparar productos por nombre.
4. **CAL-01/CAL-02/GLU-01 y beta:** validación de compra, comprensión, accesibilidad, dispositivos y evidencia de gluten.

**DAT-01**, medición de cobertura por producto/zona/antigüedad, acompaña la cesta desde el inicio; no espera al final. DAT-02/DAT-03, caché persistente y otras fuentes, se condicionan a esa medición y a contratos/permisos comprobados. No se promete integrar todas las cadenas ni realizar scraping masivo.

La revisión experta de la información sobre gluten y los avisos de dependencias continúan pendientes según la hoja de ruta. El cambio de prioridad no los da por resueltos.
