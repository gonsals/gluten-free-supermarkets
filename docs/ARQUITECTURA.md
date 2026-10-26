# Arquitectura · Comparador local y evolución a cesta

Actualizada el **26-10-2026**. Distingue la base implementada en `638980a` del diseño pendiente para la [hoja de ruta](HOJA_DE_RUTA.md). El [diseño inicial](historico/ARQUITECTURA_ANTES_DEL_COMPARADOR.md) queda como histórico.

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

## Persistencia y límites actuales

Biblioteca `LibraryData` **versión 1**, separada por entorno de Open Food Facts (`library:${offEnv}:v1`). Historial máximo de 1.000, 250 favoritos activos y 1.000 anotaciones privadas de precio. La retención de fichas se basa en referencias de historial/favoritos y un margen acotado; **la futura cesta debe incorporarse a esa política**, no asumir que ya está contemplada.

Las operaciones se serializan por instancia del repositorio y la escritura del snapshot es transaccional. La restauración comprueba el snapshot esperado dentro de ese alcance. Esto no garantiza por sí solo exclusión global entre pestañas o instancias; la evolución de datos debe definir y probar su política de concurrencia.

Copias actuales: `format: sin-gluten-library`, `backupVersion: 1`, datos `version: 1`; validación de hasta 20 MiB, códigos, fechas, referencias y límites. Restauración completa confirmada, sin fusión; conserva fechas, recalcula evaluación y elimina vinculación de cuenta. [Contrato completo](COPIAS_LOCALES.md). El nombre del formato es un identificador técnico que no se cambia por decidir un nombre comercial.

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

## Diseño objetivo: cesta y migración — CES-01/CES-02

Diseño pendiente, no contratos ya implementados. Una cesta activa con ID estable, líneas referenciadas por GTIN y cantidad entera de envases; propuesta inicial de 100 líneas y 1–99 envases. No duplicar fichas completas dentro de cada línea ni persistir totales como autoridad: derivarlos de líneas, observaciones y filtros.

La entrega debe introducir **esquema de datos y copia v2**, con migración probada desde v1 y cesta inicialmente vacía. La ubicación física y clave de almacenamiento se fijarán al implementar, con detección de versión que impida a un cliente antiguo sobrescribir el contenido nuevo. No basta con añadir una propiedad opcional que un importador antiguo pueda ignorar.

Requisitos de migración/recuperación:

1. Validar la versión antes de escribir; no modificar datos desconocidos. No migrar repetidamente en cada arranque.
2. Preparar transformación íntegra y confirmar en transacción. Un fallo conserva la versión anterior recuperable y muestra una salida útil.
3. Importar copias v1 crea cesta vacía; importar/exportar v2 preserva líneas, cantidades y referencias. Rechazar versiones desconocidas sin sustituir la biblioteca.
4. Una app antigua debe rechazar una copia v2; verificarlo con su lector real. Definir barrera entre clientes activos y plan de recuperación/actualización hacia delante; no recomendar downgrade que borre datos nuevos.
5. Incluir cesta en exportación, resumen de restauración y borrado completo; limpiar historial conserva lo aún referenciado por cesta/favoritos/precios según contrato de retención.
6. Probar dos instancias/pestañas, cambio durante un diálogo y fallo de almacenamiento. Elegir transacción con control de revisión o exclusión entre clientes según adaptador; no dar por suficiente la cola por instancia.

No subir cesta a Firebase. Cancelación, límites y política de borrado pertenecen al mismo contrato que el resto de datos privados.

## Identidad de establecimientos y motor de totales — TIE-01/CES-03

Introducir referencias tipadas para cadena, sucursal y ámbito desconocido. Un vínculo entre ubicación pública y anotación privada necesita evidencia/confirmación, procedencia y posibilidad de deshacer. Normalizar texto sirve para buscar, no para probar identidad. No convertir una anotación de cadena en observación nacional sin fuente que lo acredite.

Mantener funciones puras para: selección de observación, elegibilidad, resolución de fuentes vinculadas, cobertura por línea/cantidad y total completo/parcial. El resultado debe conservar las observaciones utilizadas y motivos de exclusión para explicar la pantalla y reproducir las pruebas.

La discrepancia entre fuentes debe tener regla determinista documentada y visible, sin seleccionar arbitrariamente el menor precio. Calcular en enteros con límites de producto/cantidad/importe y comprobar desbordamiento. Preservar milésimas y aplicar política única de presentación; solo cestas completas participan en el ranking. Un subtotal incompleto no es un total barato.

No hacer una petición por cada render, cada fila visible o cada cambio de cantidad. Consultas públicas desde cesta: acción explícita, presupuesto de productos/páginas/peticiones y concurrencia fijado antes de implementar, cancelación y 429; empezar por subconjunto acotado, sin recorrer automáticamente cien productos. Medir cobertura y límites del proveedor con DAT-01 antes de aumentar volumen.

## Proveedores y crecimiento — DAT/UNI/ALT

Cada proveedor aporta observaciones normalizadas con identidad, ámbito, importe/unidad, fecha y procedencia, además de paginación/errores. El motor de comparación no depende de nombres de campos HTTP. Datos inválidos, moneda incompatible, categoría a granel o stock desconocido no se completan mediante inferencias.

DAT-02 podría añadir caché pública persistente separada con retención, expulsión, atribución y borrado propios; excluirla de las copias privadas. No se activa por reorganizar este documento. DAT-03 exige revisar contrato y permisos de cada nueva fuente; no sustituir un error por scraping sin control o un catálogo ficticio.

UNI-01 añade conversión de unidades solo compatibles y cantidades conocidas; ALT-01, grupos de sustitución explícitos. Separar precio unitario, necesidad de envases enteros y sobrante. El módulo de evidencia sobre gluten conserva su independencia: no utiliza precio o supermercado para inferir composición.

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
