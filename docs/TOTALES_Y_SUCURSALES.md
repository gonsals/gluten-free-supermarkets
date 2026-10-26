# Totales de cesta por sucursal

Iteración 10 · **26-10-2026**. Entrega técnica de **TIE-01 y CES-03** de la [hoja de ruta](HOJA_DE_RUTA.md): identificar establecimientos y comparar el coste estimado de la misma cesta. Continúan Mesa, gluten complementario, anotaciones privadas y nube desactivada.

## Uso y alcance

En **Mi cesta → Comparar total por tienda**, la app muestra cantidades, cobertura y estimación por sucursal. Solo los establecimientos que cubren todas las líneas participan en el ranking de totales completos. Los demás muestran subtotal y faltantes; cuando no se cubre ninguna línea se indica que no hay importe calculable.

Ejemplo sintético probado: dos envases de leche y uno de pasta. A tiene total **4,50 €**; C, **4,75 €**. B solo tiene precio de leche: subtotal **2,10 €**, cobertura 1/2 productos y 2/3 envases. B queda fuera del ranking completo. Con una sola cesta completa no se anuncia ahorro frente a opciones incompletas.

Cada desglose conserva referencia, fecha, fuente, precio por envase, cantidad y condiciones. Los faltantes distinguen falta de precio, antigüedad, oferta/notas excluidas, vencimiento, fecha futura, país, datos inválidos y consulta pública sin completar. No se asigna cero a un producto sin precio. Una diferencia estimada de esta muestra no es ahorro de una compra realizada ni prueba de stock o precio de caja.

## Identidad de sucursal

**Gestionar sucursales y referencias** permite crear, editar y borrar identificaciones, vincular referencias a una sucursal y deshacer o corregir vínculos. Se exige nombre, dirección concreta y confirmación de que la referencia corresponde a una sucursal física. Una localidad o una cadena no bastan para asociarlas automáticamente.

Todas las anotaciones que comparten una referencia privada quedan bajo la misma identificación confirmada. Si mezclan sucursales, hay que corregir su localización o dejarlas sin vincular. Las referencias sin confirmar se conservan para consulta por producto, pero no completan una cesta de otro establecimiento. Los vínculos reflejan la decisión de la persona, no una verificación geográfica del proveedor.

| Origen | Identidad de referencia |
| --- | --- |
| Privado | Tupla JSON de tienda y localización normalizadas, con prefijo `private:`. Se evitan colisiones por separar textos con dos puntos; no se usan similitudes de nombre para probar identidad física. |
| Open Prices | ID de ubicación `open_prices:<id>`, separado de la referencia privada. |
| Sucursal confirmada | ID local estable, nombre y dirección aportados por la persona, con referencias vinculadas explícitamente. |

Límites: **50 sucursales, 20 referencias por sucursal**, sin duplicar una referencia entre establecimientos. Reasignar pide confirmación; una modificación externa invalida el vínculo esperado o el registro que se pretendía sustituir. Borrar identificación/vínculo no elimina precios originales ni productos de la cesta.

## Selección y cálculo

1. Indexar observaciones por GTIN equivalente y referencia, conservando la más reciente antes de aplicar filtros.
2. Para una sucursal y producto, elegir la observación más reciente entre sus referencias vinculadas. Desempatar por fecha de recepción, prioridad privada en empate exacto entre orígenes e ID estable. **Nunca desempatar por el menor precio.**
3. Aplicar filtros comunes: últimos siete días por defecto, ofertas/notas excluidas y España solo para aportaciones públicas. No se inventa país para precios privados; las ofertas vencidas siempre se excluyen.
4. Si la observación elegida queda excluida, explicar el motivo sin recuperar un precio anterior ni otro origen vinculado más barato. Si las referencias difieren en importe, mostrar la discrepancia y sus fechas.
5. Multiplicar milésimas enteras de EUR por envases enteros. Conservar precisión al sumar/ordenar; la UI muestra hasta tres decimales si hacen falta, sin sumar importes ya redondeados.
6. Ordenar primero cestas completas por total. Las incompletas quedan aparte y se ordenan por cobertura; sus subtotales no compiten con un total completo. El filtro de sucursal usa el nombre/dirección confirmados.

El motor es puro e indexa primero los precios para evitar recorrer toda la muestra por cada sucursal y línea. La pantalla reevalúa el tiempo al recuperar foco y cada minuto. Cambiar cantidades/filtros recalcula; cambiar el conjunto de productos reinicia resultados públicos transitorios y cancela peticiones anteriores.

## Consultas públicas y privacidad

No hay barrido automático de la cesta. **Consultar hasta 10 productos pendientes** hace como máximo diez peticiones secuenciales de primera página, hasta cincuenta registros por producto, por acción explícita. No sigue páginas adicionales. Una nueva acción continúa con productos no consultados y después permite reintentar errores; un 429 detiene el lote y respeta la espera del cliente compartido.

Se puede cancelar y salir; no se inicia otra petición del lote ni se aplica una respuesta tardía tras cancelar. Un error público se distingue de un resultado vacío y mantiene disponibles las estimaciones privadas. Se muestran consultas correctas y errores por código, junto con el alcance de la muestra.

El proveedor recibe los códigos consultados y datos técnicos de conexión; no recibe precios privados, notas, direcciones confirmadas ni una exportación de la biblioteca. Los precios públicos siguen **solo en memoria**, separados de copias y anotaciones. Los vínculos guardan únicamente clave/origen; no copian importes públicos a una anotación privada. Se mantiene atribución de Open Prices/ODbL y OpenStreetMap/ODbL, con acceso a fuentes/privacidad en Ajustes.

## Datos y copias v3

`LibraryData` y `backupVersion` pasan a **3**, añadiendo `branches` con IDs, nombre, dirección y referencias. La clave física histórica `library:${offEnv}:v1` se mantiene; la versión interna gobierna el formato. La revisión de concurrencia no se exporta.

- Datos locales v1 migran con cesta/sucursales vacías; v2 conserva cesta y precios, añadiendo sucursales vacías. Migración atómica, sin publicar un estado nuevo si falla el almacenamiento.
- Se importan copias v1/v2/v3: v1 sin cesta ni sucursales; v2 con cesta y sin sucursales; v3 con ambas. El resumen muestra cuántas identificaciones se sustituirán. Restaurar sigue siendo reemplazo completo confirmado.
- Se rechazan versiones desconocidas, referencias inválidas, duplicadas, límites excedidos y sucursales bajo un marcador antiguo. Se seleccionan solo campos permitidos y no se heredan cuentas.
- SQLite mantiene el guard contra regresión, ahora también comprobado de v3 a v2. IndexedDB usa versión física 3: las conexiones anteriores deben cerrarse o permiten bloquear la actualización de forma visible; una app antigua no abre esa versión.
- Borrar todos los datos incluye sucursales y vínculos. Vaciar solo cesta conserva identificaciones, favoritos y precios. Se mantiene control transaccional de raíz esperada y confirmaciones obsoletas.

No se habilitan Firebase, Functions, cuentas obligatorias, mapas ni servicios de pago para este alcance.

## Verificación y límites

**183 pruebas de app / 16 suites**, **35 de seguridad**, **36 recorridos web**, tipos/lint/compatibilidad Expo y **cinco pruebas de integración en emuladores locales** correctos. Nuevos casos: suma/cobertura, milésimas, fechas/ofertas, empate y discrepancia entre fuentes, identidad sin inferencias, vínculo/deshacer, copias/migración, límite de diez consultas, cancelación y accesibilidad a 320 × 480 con texto ampliado.

La CI anterior de `fa39afb` pasó secretos, dependencias, Firebase y Android; falló una prueba web porque comprobaba el valor editado antes de esperar la confirmación del guardado. Esta iteración añade esa espera sobre el estado real, sin ampliar timeouts; el recorrido vuelve a pasar. Cada nuevo commit requiere su propio resultado de CI.

## Android y paquete local

APK final: `artifacts/singluten-iteration-10-preview-universal.apk`, **71.463.875 bytes**, ARM64/x86_64, JavaScript incorporado, sin Metro y con nube desactivada. SHA-256: `c772ee051574cbb3e4d241de35735dc4a1d8d6ad1b37cfd7c0eeda2237dd6ef1`. Compilación correcta en **3 min 10 s**, 579 tareas, 37 ejecutadas y 542 reutilizadas. Firma de desarrollo, no de tienda.

En Pixel 8 / Android 15 API 35 emulado, instancia propia de solo lectura `emulator-5582`, se restaura primero una cesta v2 con cinco precios en la APK de iteración 9. Se actualiza a iteración 10 sin red ni redirección ADB a Metro y se conservan cesta y precios. Desde la UI se identifican A y B: A completa da **4,50 €**; B parcial, **2,10 €**, fuera del ranking completo. Se detiene la app y otro arranque en frío recupera identificaciones y total.

Se restaura además una copia v3 con referencia vinculada y se verifica su total de 4,50 €. La actualización a la APK final conserva esa sucursal restaurada y su resultado. [Captura Android del total recuperado](diseno/iteracion-10-total.png). Matriz, archivos sintéticos y manifiestos en `artifacts/iteration-10/`. La inspección del ZIP comprueba ambas arquitecturas y no encuentra archivos `.env` ni coincidencias del patrón de clave Google probado; no es una prueba universal de ausencia de cualquier secreto. El emulador se cierra al terminar sin guardar su estado en el AVD original.

La muestra de pruebas es sintética: **DAT-01** sigue pendiente para medir cobertura real por producto/zona/fecha. También siguen pendientes revisión experta de gluten, dispositivos físicos/TalkBack, iOS nativo y beta. Los avisos transitivos y el bloqueo de publicación de [Dependencias](DEPENDENCIAS.md) no se dan por resueltos.

Siguiente iteración de producto: **UNI-01/ALT-01**, formatos y alternativas explícitas. Unidades distintas o códigos diferentes todavía no se equiparan automáticamente.
