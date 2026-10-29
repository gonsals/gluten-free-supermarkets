# Copias locales y recuperación

> **Actualización 29-10-2026.** Exportación actual v4 con cesta, sucursales y grupos de alternativas; importación v1/v2/v3. [Contrato actual](FORMATOS_Y_ALTERNATIVAS.md). Máximo actual 3.000 fichas y 20 MiB. El contrato v2/v3 de abajo conserva su evidencia histórica. [Contrato de iteración 10](TOTALES_Y_SUCURSALES.md). Se conserva la evidencia previa con su fecha. Los resultados históricos de pruebas se conservan con su fecha. [Hoja de ruta vigente](HOJA_DE_RUTA.md) · [Backlog](PLAN_MEJORAS.md).

Iteración 7 · 25 de octubre de 2026. Implementación de F-03 de la hoja de ruta para recuperar o trasladar la biblioteca sin cuenta ni backend. La nube permanece desactivada.

## Uso

1. En **Ajustes → Exportar mis datos**, guardar `sin-gluten-datos.json` en un lugar seguro. El archivo contiene cesta, consultas, favoritos, fichas y precios privados; no está cifrado.
2. En el dispositivo de destino, abrir **Ajustes → Restaurar una copia** y seleccionar el JSON. La selección no modifica la biblioteca.
3. Revisar la fecha de exportación, las cantidades de datos de la copia y las cantidades actuales. Cancelar descarta la selección.
4. **Sustituir y restaurar** reemplaza toda la biblioteca local. Exportar antes los datos actuales que se quieran conservar. La operación no combina bibliotecas ni elige datos más recientes entre ambas.

Se conservan las fechas originales de consulta y de observación de precios. Las fichas restauradas muestran un aviso de procedencia del archivo y su fecha de recuperación. Actualizar una ficha correctamente desde Open Food Facts elimina ese aviso para la nueva consulta. Un archivo puede haber sido modificado: ni restaurar ni recalcular una conclusión certifican el contenido del envase.

Cada entrada del historial conserva su fecha de escaneo (`scannedAt`). Su nombre, estado y fecha de consulta del resumen se reconstruyen desde la última ficha guardada de ese código en la copia; no se recuperan versiones históricas independientes de una misma ficha.

No se hacen consultas de productos durante la restauración. Funciona sin conexión si el archivo ya está disponible en el dispositivo y, en web, se ha cargado previamente la app. Un proveedor de archivos del sistema puede necesitar conexión para descargar un documento que todavía no esté guardado localmente.

## Contrato y compatibilidad

**Iteración 10:** [Totales y sucursales](TOTALES_Y_SUCURSALES.md) amplía el formato a v3, con `branches` y referencias confirmadas. Se mantienen importaciones v1/v2: la v1 recupera sin cesta/sucursales y la v2 conserva cesta pero no sucursales. Restaurar es sustitución completa y el resumen incluye el número de sucursales que se reemplazarán. Las nuevas exportaciones son v3; el contrato v2 descrito abajo corresponde a la iteración 9. Borrar todo incluye identificaciones/vínculos; vaciar cesta los conserva.

Desde la iteración 9 las exportaciones usan `format: "sin-gluten-library"`, `backupVersion: 2` y datos `version: 2`, con `basket` además de `exportedAt`, `history`, `favorites`, `cache`, `prices` y `products`. La revisión local no se exporta. Se aceptan copias v1 marcadas y exportaciones completas originales sin marcadores, migrándolas a v2 con cesta vacía; sustituir con v1 deja vacía la cesta actual, visible en el resumen. Las combinaciones incoherentes, v1 con cesta y versiones futuras se rechazan. Una app v1 rechaza copias v2; usar una versión compatible para recuperarlas.

`cloudOwner` se exporta como `null`, aunque la biblioteca estuviera vinculada a una cuenta. El valor que contenga una copia antigua se ignora. Nunca se heredan cuentas, sesiones, credenciales ni configuración. La restauración se rechaza si la biblioteca de destino está vinculada a una cuenta: primero hay que exportar y borrar sus datos locales mediante la acción ya existente. No se eliminan favoritos remotos ni se sincroniza automáticamente.

La restauración recupera favoritos activos. Las nuevas exportaciones omiten las marcas de favoritos borrados y, al importar una copia anterior, tampoco se recuperan esas marcas ni se resucita un favorito. Son información de sincronización. Los precios pueden existir sin ficha guardada, como sucede al anotarlos manualmente.

## Validación y límites

| Control | Comportamiento |
| --- | --- |
| Archivo | JSON UTF-8, con BOM opcional; máximo 20 × 1.024 × 1.024 bytes. La interfaz expresa este límite como 20 MB. No se admiten ZIP, scripts ni URLs de descarga. |
| Cantidades | Hasta 1.000 consultas, 250 favoritos activos, 1.000 precios, 2.500 fichas/códigos de caché y cesta de 100 GTIN distintos con 1–99 envases enteros por línea. Se acotan además a 10.000 las marcas de favoritos recibidas, incluidas las borradas. |
| Códigos | GTIN canónico de 8, 12, 13 o 14 dígitos, con dígito de control correcto y ceros iniciales conservados. |
| Referencias | Una ficha por código; caché y fichas coinciden en código y fecha. Toda consulta y favorito activo debe tener ficha. IDs de consultas y precios sin duplicados. |
| Productos | Esquema reconocido, límites de texto y listas, imágenes permitidas, proveedor Open Food Facts y URL exacta coherente con código y entorno. |
| Fechas y precios | Fechas UTC válidas, incluido día del calendario; importes enteros positivos, EUR y unidades/cantidades coherentes. Se admiten precios históricos de más de doce meses: no se aplica el plazo del formulario de nuevas observaciones. |
| Evidencia | Se recalcula la evaluación desde etiquetas, alérgenos, trazas e incidencias. No se confía en el estado ni en la versión de reglas que declare el archivo. Los resúmenes se reconstruyen desde las fichas. |
| Objetos | Se rechazan claves `__proto__`, `prototype` y `constructor`. Solo se conservan campos conocidos de productos y precios. |

Los adaptadores comprueban el tamaño antes de leer. Android limita también los bytes realmente leídos, sin confiar únicamente en el tamaño anunciado por el proveedor. Los descriptores se cierran incluso ante errores. En iOS se elimina la copia temporal creada por el selector del SDK; en Android nunca se borra el archivo original seleccionado. La validación automática de ese adaptador no equivale a una prueba nativa de iOS.

La exportación comparte la cola del repositorio con las escrituras para obtener metadatos y fichas de una misma instantánea. Comprueba su resultado con el mismo contrato de importación antes de ofrecerlo. Si falta una ficha o el resultado supera el límite, no se genera una copia incompleta o demasiado grande. No hay partición automática de archivos; conviene conservar las copias anteriores si aparece un error. En móvil se espera a que termine la escritura del temporal antes de abrir el menú para compartirlo, y se limpia después.

## Consistencia y conflictos

El resumen conserva la referencia a la versión de biblioteca que estaba abierta al seleccionar la copia. Al confirmar, el repositorio espera las escrituras pendientes y comprueba que esa versión sigue vigente. Si hubo un cambio, se cancela la restauración y se pide volver a seleccionar el archivo; no se sobrescribe silenciosamente el cambio.

Metadatos, nuevas fichas y eliminación de fichas anteriores se escriben en una sola transacción SQLite o IndexedDB. Solo se publica el nuevo estado al terminar. Un fallo de almacenamiento mantiene el estado anterior y permite reintentar. Repetir una restauración completa no duplica consultas ni precios.

Se conserva el esquema local 1: `source.restoredAt` es un campo opcional añadido a las fichas. La fecha `source.fetchedAt` sigue siendo la de la consulta original. No se requiere migración destructiva ni una dependencia nueva. La fusión selectiva y el cifrado de copias quedan como posibles ampliaciones, sujetas a necesidad real y diseño de recuperación de claves.

## Verificación

| Ámbito | Resultado |
| --- | --- |
| Tipos, lint y compatibilidad Expo | Correctos en `npm run check`. |
| App | 125 pruebas correctas: 88 anteriores y 37 nuevas de contrato, transacción, lectura nativa acotada y escritura previa al envío de la exportación. |
| Seguridad | 34 pruebas correctas. Se conservan las excepciones temporales de dependencias y el bloqueo de publicación. |
| Navegador | 19 recorridos correctos, incluidos cuatro nuevos: exportar/borrar/cancelar/restaurar sin red y recargar, rechazo de archivos, y resumen a 320 × 480 con texto al 200 % en claro y oscuro. |

La prueba web usa una respuesta de producto sintética y una descarga real de la app. Comprueba la importación mediante selector, la transacción IndexedDB, la persistencia después de recargar, las fechas originales, el precio privado y el aviso de ficha restaurada. No acredita la veracidad del catálogo ni una revisión experta sobre gluten.

## Android emulado

APK `artifacts/singluten-iteration-7-preview-universal.apk`, **71.375.595 bytes**, ARM64/x86_64, sin Metro y con nube desactivada. Compilación incremental correcta: **3 min 46 s**, 579 tareas, 37 ejecutadas y 542 reutilizadas. Firma de desarrollo; no es un paquete de tienda. SHA-256: `7ebc9ea2338009ab0f9db2e93527d89101eefb9635db0fbca888e68cd28db6ee`.

La inspección del ZIP confirma las dos arquitecturas y no encuentra archivos `.env` ni coincidencias del patrón de clave Google utilizado. Los artefactos se conservan localmente y no se suben a un servicio de almacenamiento.

Pruebas realizadas en Pixel 8 / Android 15 API 35, instancia `emulator-5582`, iniciada con `-read-only -no-snapshot -no-window`:

- Copia JSON descargada de la app web con producto y tienda sintéticos, trasladada a Descargas del emulador. Selección con el gestor de archivos real de Android, sin red ni conexión a Metro.
- Resumen con fecha y cantidades; cancelar conserva la biblioteca vacía. Volver a seleccionar y confirmar recupera una consulta, un favorito, una ficha y un precio privado de 2,49 €.
- La ficha muestra el aviso de recuperación y el precio aparece en `Tienda de copia · Madrid`.
- Reinicio completo del emulador, con identificadores de arranque diferentes: favorito, historial y precio siguen disponibles sin conexión.
- Cancelar el selector del sistema permite volver a abrirlo. Un JSON incompatible y un archivo de 20 MiB más un byte se rechazan; se conservan las cantidades y el precio restaurados.

La instancia se cierra al terminar, sin guardar modificaciones en el AVD original. Se guardan matriz, capturas y registros en `artifacts/iteration-7/`. [Captura del resumen nativo](diseno/iteracion-7-copias.png). En el primer arranque apareció un aviso de Android System UI; se eligió esperar y se realizaron después las comprobaciones anteriores. No se atribuye ese aviso a la app ni se usa esta muestra como una medida de estabilidad de dispositivos físicos.

## CI

La base `3bd1793` tiene los cinco jobs de CI correctos: [run 40215578049](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40215578049). Ese resultado corresponde a la iteración 6; la revisión actual necesita sus propios controles.

## Archivos y mantenimiento

- `src/data/local/backup.ts`: contrato, límites y validación de entrada no confiable.
- `src/data/local/library.ts`: exportación consistente y sustitución transaccional.
- `src/shared/importData.ts` / `.web.ts`: selección y lectura específicas de plataforma con el SDK y las APIs del navegador.
- `src/features/library/LibraryDataPanel.tsx`: acciones, resumen, cancelación y mensajes; descarta selecciones tardías al salir de Ajustes.
- `src/features/products/ProductCard.tsx`: procedencia visible de las fichas recuperadas.
- `src/data/local/__tests__/backup.test.ts`, `src/shared/__tests__/importData.test.ts` y `tests/e2e/backup.test.ts`: casos reproducibles.

Referencia pública del SDK utilizado: [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/). Las sobrecargas de selección, lectura y copias temporales se han contrastado además con el código instalado de `expo-file-system` 58.0.10.

Siguen pendientes los recorridos en dispositivos físicos, iOS nativo, lectores de pantalla, restauración de bibliotecas grandes en equipos modestos y validación con personas usuarias. La recuperación implementada no cierra esas tareas ni los bloqueos de seguridad y revisión experta de la hoja de ruta.

El almacén de destino debe poder abrirse. No se sobrescribe desde esta pantalla una base con esquema futuro o metadatos que la app no pueda interpretar; se mantiene la protección existente de datos desconocidos. Reparar un almacén inaccesible requiere un flujo de recuperación aparte.
