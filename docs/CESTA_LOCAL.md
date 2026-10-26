# Cesta local y migración de datos

Iteración 9 · **26-10-2026**. Entrega de **CES-01/CES-02** de la [hoja de ruta](HOJA_DE_RUTA.md). La cesta permite preparar productos y cantidades; la comparación de totales por establecimiento sigue pendiente en TIE-01/CES-03. Mesa, gluten complementario y funcionamiento sin backend contratado se conservan.

## Recorrido disponible

- **Inicio, Comparar y Biblioteca → Mi cesta**. Desde la ficha, comparación o listas guardadas, **Añadir a la cesta** suma un envase.
- Una cesta activa, hasta **100 productos distintos y 99 envases enteros por producto**. Repetir el mismo GTIN, incluidas representaciones equivalentes con ceros iniciales, incrementa su línea sin duplicarla.
- En Mi cesta se pueden introducir códigos sin ficha ni precio, editar y guardar cantidades, comparar cada producto, abrir la ficha de gluten, quitar una línea o vaciar con confirmación.
- Las cantidades sobreviven al cierre y al uso sin red. Una línea sin ficha o precio permanece en la lista con explicación; no se le asigna precio cero ni se muestra un total de compra.
- Quitar/vaciar cesta conserva favoritos, historial y precios. Borrar todo desde Ajustes incluye también la cesta. Exportar/restaurar la biblioteca incluye líneas y cantidades.

El precio de cada envase se podrá combinar por establecimiento en la fase siguiente. Esta entrega no descarga precios para toda la cesta ni anuncia un ahorro o una cobertura que todavía no están calculados.

## Esquema y compatibilidad

Los datos pasan a **LibraryData v2**: `basket` contiene `barcode`, `name` opcional como resumen, `quantity` y `addedAt`; `revision` sirve al control local de cambios. No se duplica la ficha completa dentro de una línea ni se guarda un total derivado como autoridad.

Se conserva la clave física `library:${offEnv}:v1` y sus claves de fichas para evitar una copia parcial entre espacios. El sufijo histórico de la clave no describe la versión de los datos: el campo interno ahora es `version: 2`. La migración desde v1 preserva biblioteca, fichas y precios, añade cesta vacía y se confirma de forma atómica. Si falla, no publica un snapshot migrado ni sobrescribe la versión recuperable.

Las fichas referenciadas por cesta o precios privados se conservan al limpiar historial y durante la expulsión de caché, además de las referenciadas por favoritos. La copia admite hasta **2.500 fichas**, con el límite global de archivo de **20 MiB** conservado. La retención sigue acotada; no se hace una descarga de catálogo.

### Copias

| Entrada / salida | Resultado |
| --- | --- |
| Nueva exportación | `format: sin-gluten-library`, `backupVersion: 2`, datos `version: 2`, cesta incluida; revisión interna omitida y cuenta nula. |
| Copia marcada v1 o exportación original completa v1 | Se acepta y transforma a datos v2 con cesta vacía. |
| Copia v2 | Códigos, cantidades, fechas, duplicados de GTIN y límites validados; solo se recuperan campos permitidos. Las líneas pueden no tener ficha, como los códigos introducidos manualmente. |
| Versión futura, combinación incoherente o v1 con cesta | Se rechaza sin modificar los datos. No se acepta una cesta bajo un marcador antiguo que pueda ignorarla. |
| Lector real de la iteración 8 (`638980a`) | Acepta su copia v1 y rechaza la copia v2. Comprobado ejecutando ese código histórico, sin modificarlo. |

El resumen de restauración muestra productos y envases de la cesta en la copia y en la biblioteca actual. Se mantiene la **sustitución completa tras confirmación**, sin fusión. Restaurar una v1 sustituye la cesta actual por una vacía, advertida en Ajustes y en el resumen. Las copias no están cifradas y no heredan cuentas ni datos públicos de Open Prices.

## Concurrencia y clientes anteriores

Cada operación lee el estado más reciente y compara la raíz esperada **dentro de la misma transacción** que escribe metadatos y fichas. Una carrera entre lectura y commit produce un conflicto visible; no se reintenta una sobrescritura silenciosa. La revisión cambia con cada escritura. Exportar comprueba que el snapshot sigue siendo el mismo tras leer las fichas.

La edición de cantidad y la eliminación comprueban la cantidad esperada. Vaciar cesta compara la cesta confirmada; restaurar y borrar toda la biblioteca comprueban el snapshot presentado. Un cambio de otra ventana obliga a revisar antes de sustituir datos. Al cambiar de ruta o volver al primer plano/foco se refresca la biblioteca; no se promete actualización instantánea de todas las ventanas mientras permanecen inactivas.

- **SQLite móvil:** comparación y escritura en transacción exclusiva. Triggers persistentes impiden que un cliente antiguo reemplace la raíz migrada por una versión anterior, incluso si ya la tenía en memoria. Una escritura rechazada revierte también sus fichas.
- **IndexedDB web:** base física versión 2 y comparación/escritura en una transacción `readwrite`. Un cliente anterior que intenta abrir versión 1 recibe `VersionError`. Si mantiene una conexión antigua abierta, la actualización espera y la UI pide cerrar las otras pestañas; no fuerza la migración por encima de esa conexión. Ofrece reintento y refresca al recuperar el foco.

Referencias de las APIs utilizadas: [transacción exclusiva de Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) y [ciclo de versiones/bloqueo de idb](https://github.com/jakearchibald/idb#opendb). Las pruebas de abajo verifican el comportamiento integrado, no solo la existencia de esas APIs.

No se recomienda retroceder una app para recuperar datos v2: conservar una copia compatible y preferir una corrección hacia delante. Las protecciones evitan la pérdida silenciosa, pero una app antigua no ofrece las nuevas funciones.

## Comprobaciones

| Nivel | Evidencia de esta entrega |
| --- | --- |
| App | **164 pruebas / 14 suites**, incluidas 20 nuevas de cesta, límites, migración, recuperación, conflicto y concurrencia. |
| Seguridad | **35 pruebas**, incluida ejecución real de los triggers en SQLite y rollback de una escritura v1 con fichas. |
| Integración opcional | **Cinco pruebas de nube correctas en emuladores locales**, incluida sincronización entre bibliotecas con el repositorio v2. Solo proyecto ficticio `demo-sin-gluten`; la nube de la app permanece desactivada. |
| Tipos/lint/Expo | `npm run check` correcto; dependencias y configuración nativa sin cambios. |
| Web | **30 recorridos correctos en la ejecución final**, incluidos siete nuevos de cesta. Se ajustó la sincronización del test de recuperación por foco: el botón de reintento puede desaparecer al abrirse la biblioteca automáticamente. Sin ampliar timeouts. |
| Recuperación histórica | Lector v1 real probado: rechaza v2 y sigue aceptando v1. Migración de IndexedDB 1 y raíz v1, conservación de precio privado y rechazo posterior de apertura v1 probados en navegador. |
| Accesibilidad web | Cesta y confirmaciones a 320 × 480, texto ampliado, claro/oscuro, acciones alcanzables y sin desbordamiento horizontal. No sustituye TalkBack físico. |

## Android y paquete local

APK final: `artifacts/singluten-iteration-9-preview-universal.apk`, **71.428.063 bytes**, ARM64/x86_64, sin Metro y con nube desactivada. SHA-256: `3cf18b3bc858131fa21e3991c20a3ef33bc61878b5a4bcf1aeb586ec6507ff1e`. Compilación correcta en **3 min 27 s**, 579 tareas, 37 ejecutadas y 542 reutilizadas. Firma de desarrollo; no es un paquete de tienda.

En un Pixel 8 emulado / Android 15 API 35, instancia propia de solo lectura `emulator-5582`, se instala primero la APK de iteración 8 y se restaura una biblioteca sintética v1. Se actualiza a la APK de iteración 9, sin red ni redirección ADB a Metro: favoritos, ficha y precio privado anterior se conservan. Se añade desde Biblioteca y se guarda cantidad 3. Tras detener el proceso y arrancar en frío, Mi cesta recupera esos tres envases; el resumen de restauración incluye cesta y precio privado. No se usan datos de un teléfono ni se modifica el AVD original.

Se restaura además un archivo sintético v2 con cuatro envases y se comprueba esa cantidad en Mi cesta. Después se vacía la cesta y el resumen de una nueva restauración confirma que siguen el favorito y el precio privado anteriores. La inspección del ZIP encuentra ambas arquitecturas, cero archivos `.env` y cero coincidencias del patrón de clave Google comprobado; no acredita ausencia universal de cualquier secreto. La instancia de emulador se cierra al terminar.

Capturas: [cantidad persistida en Android](diseno/iteracion-9-cesta.png) y [resumen con cesta](diseno/iteracion-9-copia.png). Manifiesto, registros y matriz detallada en `artifacts/iteration-9/`.

Las pruebas usan datos sintéticos; no son una medición de cobertura de supermercados. Cámara física, iOS nativo, revisión experta de gluten y beta siguen pendientes. Los avisos transitivos de publicación se mantienen según [Dependencias](DEPENDENCIAS.md); no se amplían excepciones ni se activa facturación.
