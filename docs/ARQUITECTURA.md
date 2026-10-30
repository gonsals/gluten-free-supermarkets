# Arquitectura · Comparador local y evolución a cesta

Actualizada el **30-10-2026**. Distingue la base implementada en `638980a` del diseño pendiente para la [hoja de ruta](HOJA_DE_RUTA.md). El [diseño inicial](historico/ARQUITECTURA_ANTES_DEL_COMPARADOR.md) queda como histórico.

## Base implementada

| Capa / ubicación | Responsabilidad actual |
| --- | --- |
| `app/` | Rutas Expo Router: inicio, comparar, consultar, biblioteca y ajustes; rutas adicionales de ficha y nube opcional. |
| `src/features/` | Composición de pantallas, formularios, consulta y ciclo de cámara. `prices/PriceComparison.tsx` y `usePublicPrices.ts` coordinan comparación y fuente pública. |
| `src/domain/` | Códigos, producto, evidencia versionada, anotaciones, tiendas y comparación pura. `comparison.ts` distingue PriceQuote privada/pública; `stores.ts` normaliza sugerencias. |
| `src/data/open-food-facts/` | Contrato de fichas, normalización, campos acotados y errores de proveedor. |
| `src/data/open-prices/` | GET público validado y acotado, precios en EUR y mismo GTIN/envase. |
| `src/data/local/` | Repositorio y adaptadores transaccionales SQLite móvil / IndexedDB web. |
| `src/shared/` | Mesa, UI, configuración, exportación y observabilidad opcional. |
| `src/data/firebase/`, `functions/` | Cuentas, favoritos y contribuciones opcionales; desactivadas en la app y fuera del alcance local. |

Expo 58 / React Native 0.88 / React 19, TypeScript y Node/npm fijados. [Versiones y deuda de seguridad](DEPENDENCIAS.md). Las pantallas no interpretan directamente los JSON externos ni hacen de autoridad monetaria o de gluten; esas reglas pertenecen al dominio y a adaptadores comprobables.

## Persistencia y límites actuales — iteración 9

Biblioteca `LibraryData` **versión 4**, separada por entorno de Open Food Facts (`library:${offEnv}:v1`). Historial máximo de 1.000, 250 favoritos activos y 1.000 anotaciones privadas de precio. La retención de fichas se basa en referencias de historial/favoritos y un margen acotado; **la cesta y los precios privados ya se incorporan a esa política en la iteración 9**.

Las operaciones se serializan por instancia y leen la raíz actual antes de cada mutación. La comparación de raíz esperada y la escritura de metadatos/fichas son atómicas en SQLite/IndexedDB. Un conflicto se muestra sin sobrescribir; se comprueban además cantidades/cesta/snapshot de acciones destructivas. La iteración 9 prueba dos instancias y dos pestañas. El refresco al cambiar de ruta/foco no es sincronización instantánea entre ventanas.

Copias actuales: `format: sin-gluten-library`, `backupVersion: 4`, datos `version: 4`, cesta, sucursales y grupos incluidos e importación compatible con v1/v2/v3; validación de hasta 20 MiB, códigos, fechas, referencias y límites. Restauración completa confirmada, sin fusión; conserva fechas, recalcula evaluación y elimina vinculación de cuenta. [Contrato completo](COPIAS_LOCALES.md). El nombre del formato es un identificador técnico que no se cambia por decidir un nombre comercial.

Los precios públicos no se guardan en la biblioteca ni se incluyen en sus copias. Su caché actual vive en memoria cinco minutos, hasta cien páginas. Mantener el dato externo separado del contenido privado es un límite de arquitectura y de procedencia.

## Flujo de comparación actual

```text
Código válido → ficha/cache local y consulta de producto cuando corresponde
             → precios privados locales + lectura pública explícita
             → normalización de PriceQuote por origen
             → última observación por referencia → filtros de elegibilidad
             → ranking del mismo GTIN/envase → UI con fuente/fecha/límites
```

Unidades de cálculo: milésimas enteras de EUR; las anotaciones privadas en céntimos se multiplican por diez. No usar coma flotante como fuente de verdad ni redondear antes de ordenar. Una referencia pública de ubicación y una privada de tienda/localidad siguen separadas; no hay resolución automática entre orígenes.

Open Prices: solo GET, EUR, GTIN validado/equivalente, hasta 50 resultados por página y tres páginas, carga adicional por acción, timeout ocho segundos, cancelación, tratamiento de 429 y reintento explícito. Se valida respuesta y tamaño antes de interpretar; no se promete un límite de descarga por streaming que no está implementado. Descartar autor/comentarios en normalización, sin descargar pruebas o tickets. [Contrato y evidencia](COMPARADOR_DE_PRECIOS.md).

El fallo público no bloquea la biblioteca privada. El modo offline conserva las fichas y anotaciones guardadas; no hay caché pública persistente ni nuevos precios sin conexión. Fuente, fecha, condiciones y cobertura no pueden perderse al pasar del adaptador a la pantalla.

## Cesta y migración implementadas — CES-01/CES-02

Una cesta activa con líneas referenciadas por GTIN, nombre de resumen, fecha de alta y cantidad entera de envases; límites de 100 líneas y 1–99 envases. No duplicar fichas completas dentro de cada línea ni persistir totales como autoridad: derivarlos de líneas, observaciones y filtros.

La iteración 9 introdujo cesta/copia v2. La iteración 10 añade sucursales y vínculos en **esquema/copia v3**, migrando v1 con cesta vacía y v2 conservando su cesta. Se conserva la clave física histórica `library:${offEnv}:v1` y las fichas; el campo interno marca versión 4 desde la iteración 11; migrar v3 conserva cesta/sucursales y crea grupos vacíos. SQLite incorpora triggers contra regresión de versión; IndexedDB se abre con versión física 4, bloqueando clientes v1/v2/v3 y mostrando salida útil si mantienen conexiones abiertas. [Contrato, política y evidencia](CESTA_LOCAL.md).

Contrato de migración/recuperación implementado, con verificación técnica en [Cesta local](CESTA_LOCAL.md) y validación física pendiente:

1. Validar la versión antes de escribir; no modificar datos desconocidos. No migrar repetidamente en cada arranque.
2. Preparar transformación íntegra y confirmar en transacción. Un fallo conserva la versión anterior recuperable y muestra una salida útil.
3. Importar v1 crea cesta vacía; v2 conserva su cesta sin sucursales; v3 conserva también identificaciones/vínculos. v4 añade grupos explícitos. Exportar usa v4, hasta 3.000 fichas y 20 MiB; el margen contempla referencias de los grupos. Rechazar versiones desconocidas sin sustituir la biblioteca.
4. Una app anterior a v4 rechaza la nueva copia/raíz; se verifica con el lector real de `3270728`. Mantener barrera entre clientes activos y recuperación hacia delante; no recomendar downgrade que borre datos nuevos.
5. Incluir cesta, sucursales y grupos en exportación, resumen de restauración y borrado completo; limpiar historial conserva lo referenciado por grupos/cesta/favoritos/precios según contrato de retención.
6. Probar dos instancias/pestañas, cambio durante un diálogo y fallo de almacenamiento. Comparar la raíz serializada en la transacción de cada adaptador; la cola por instancia se mantiene, pero no es la única protección.

No subir cesta a Firebase. Cancelación, límites y política de borrado pertenecen al mismo contrato que el resto de datos privados.

## Identidad y totales implementados — TIE-01/CES-03

La iteración 10 distingue el texto de cadena de la fuente, una referencia sin confirmar y la sucursal física local confirmada. `branches.ts` valida 50 sucursales y 20 referencias por cada una; no hay catálogo canónico de cadenas ni inferencia de ámbito nacional. Un vínculo entre ubicación pública y anotación privada necesita evidencia/confirmación, procedencia y posibilidad de deshacer. Normalizar texto sirve para buscar, no para probar identidad. No convertir una anotación de cadena en observación nacional sin fuente que lo acredite.

`basketComparison.ts` implementa funciones puras para: selección de observación, elegibilidad, resolución de fuentes vinculadas, cobertura por línea/cantidad y total completo/parcial. El resultado debe conservar las observaciones utilizadas y motivos de exclusión para explicar la pantalla y reproducir las pruebas.

La discrepancia entre fuentes debe tener regla determinista documentada y visible, sin seleccionar arbitrariamente el menor precio. Calcular en enteros con límites de producto/cantidad/importe y comprobar desbordamiento. Preservar milésimas y aplicar política única de presentación; solo cestas completas participan en el ranking. Un subtotal incompleto no es un total barato.

No hacer una petición por cada render, cada fila visible o cada cambio de cantidad. Consultas públicas desde cesta: acción explícita, máximo diez productos por acción, secuenciales y una primera página de cincuenta resultados por código; cancelación, 429 y resultados solo en memoria. No se recorre automáticamente la cesta ni se siguen páginas. Medir cobertura y límites del proveedor con DAT-01 antes de aumentar volumen.

Contrato, desempates, copias v3 y evidencia en [Totales y sucursales](TOTALES_Y_SUCURSALES.md). Los vínculos guardan clave/origen, nunca una copia del precio público.

## Proveedores y crecimiento — DAT/UNI/ALT

Cada proveedor aporta observaciones normalizadas con identidad, ámbito, importe/unidad, fecha y procedencia, además de paginación/errores. El motor de comparación no depende de nombres de campos HTTP. Datos inválidos, moneda incompatible, categoría a granel o stock desconocido no se completan mediante inferencias.

DAT-02 podría añadir caché pública persistente separada con retención, expulsión, atribución y borrado propios; excluirla de las copias privadas. No se activa por reorganizar este documento. DAT-03 exige revisar contrato y permisos de cada nueva fuente; no sustituir un error por scraping sin control o un catálogo ficticio.

UNI-01/ALT-01 implementadas: `measure.ts` normaliza millonésimas enteras de kg/l/unidad y multipacks, usando BigInt para parseo/redondeo. `alternatives.ts` valida 20 grupos de hasta 10 GTIN, con necesidad y envase explícitos. Se conservan las fichas referenciadas por grupos al limpiar historial. Las sustituciones comprueban revisión completa y grupo antes del commit atómico; no fusionan silenciosamente una alternativa ya presente. La pantalla solo usa precios privados recientes sin oferta/notas, paginando sucursales de diez en diez; no llama al proveedor público. [Contrato](FORMATOS_Y_ALTERNATIVAS.md). Separar precio unitario, necesidad de envases enteros y sobrante. El módulo de evidencia sobre gluten conserva su independencia: no utiliza precio o supermercado para inferir composición.

## Seguridad, privacidad y operación

- Validar API, archivos, códigos, URLs, importes, cantidades y tamaños al entrar; errores tipados y sin volcar respuestas, credenciales o historiales.
- Mantener secretos administrativos fuera de `EXPO_PUBLIC_*`, repositorio y bundle. [Seguridad de credenciales](SEGURIDAD_CREDENCIALES.md).
- Las consultas públicas transmiten código y datos de conexión, no anotaciones ni lista de compra completa. La búsqueda local de tienda/localidad no se envía al proveedor actual.
- Respetar atribución de Open Food Facts, Open Prices y OpenStreetMap, separando sus datos de los privados. Revisar condiciones si cambia la reutilización.
- Firebase permanece opcional y desactivado en todos los perfiles. No desplegar Functions, activar Blaze ni contratar infraestructura para estas fases. Su modelo remoto histórico no se convierte en dependencia de la cesta.
- Si se retoma FUT-03: exigir presupuesto expreso, aislamiento, validación, moderación, conflictos, borrado, cuotas y pruebas remotas antes de activación; el código existente no acredita operación real completa.

## Escalabilidad comprobable

Medir tamaño local, latencia de arranque/listas/cálculo, memoria de caché, peticiones por acción, cancelaciones/429 y cobertura útil. Registrar equipo, SO, versión, red, muestra y caché fría/caliente; no prometer capacidad global a partir de tests locales.

Conservar paginación, límites y migraciones ensayadas. Añadir índices o consultas específicas cuando el perfilado lo justifique; no hacer crecer snapshots, copias o refrescos sin límites. La capacidad de APIs externas sigue siendo una restricción aunque no contratemos backend. [Calidad y operación](CALIDAD_Y_OPERACION.md) concreta verificaciones y límites de entrega.

## Iteración 12 · Medición pública DAT-01

[Informe, muestra y decisión](COBERTURA_PRECIOS_PUBLICOS.md): diez GTIN fijados antes de consultar, 20 GET de precios a producción más uno de preproducción. 33 observaciones compatibles y cero elegibles para la muestra Madrid; sin cestas completas ni errores de proveedor. Plan, instantánea pública y resumen ODbL separados de la biblioteca y de la caché de la app. Reproducción offline con `npm run coverage:prices -- --replay`; nuevas consultas acotadas con `--collect`, sin subir anotaciones ni activar servicios.

Comprobaciones: 220 pruebas de app, 42 de seguridad, tipos, lint y compatibilidad Expo. Las pruebas del colector simulan red, presupuesto, 429 y preproducción; no repiten la consulta pública. No se cambia el contrato v4. DAT-03 pasa a P1 para evaluar una fuente adecuada antes de integrarla; DAT-02 sigue condicionada. El control de dependencias sigue bloqueado por deepmerge, sin ampliar excepciones.

## Iteración 13 · Viabilidad de otras fuentes

[DAT-03 investigada](FUENTES_PUBLICAS.md): Carrefour, FACUA y el conjunto MAPA de origen/mayorista. La evidencia no permite aprobar otro proveedor; permisos/contrato no acreditados o ámbito incompatible. No se descargan catálogos, incorporan precios ni crean adaptadores internos sin contrato. Integración condicionada; siguiente entrega CAL-01 técnica con anotaciones sintéticas declaradas. No acredita compra física, accesibilidad nativa ni revisión experta.

Entrega de documentación y corrección del selector ambiguo de avisos en la prueba web de alternativas, sin cambios de runtime, dependencias, almacenamiento v4 o nube. Se validan enlaces, tareas, históricos y secretos; se repiten tipos, lint, compatibilidad Expo, 220 pruebas de app, 42 de seguridad y 42 recorridos web. La auditoría actual mantiene el bloqueo por deepmerge, sin ampliar excepciones.

## Iteración 14 · Aceptación entre funcionalidades

La [validación integrada CAL-01](VALIDACION_COMPRA.md) recorre UI, IndexedDB, cálculo y copia/restauración sin inyectar directamente el almacenamiento. Las fixtures y los importes esperados no importan calculadores ni normalizadores de app. Solo se corrige navegación explícita desde totales a cesta; almacenamiento/copia v4, proveedores y modelo monetario permanecen iguales. Las pruebas web usan respuestas HTTP controladas y el shell offline real; no acreditan Android físico.
