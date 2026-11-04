> **Documento historico.** Copia del contenido en `638980a`, archivada el 26-10-2026 antes de reorganizar el plan. No define prioridades ni estado vigentes. Consultar la [hoja de ruta actual](../HOJA_DE_RUTA.md). Los enlaces relativos se han adaptado a esta carpeta.

# Arquitectura y modelo de datos propuestos

**Diseño de referencia**, 2026-10-23. El MVP posterior está descrito en [Implementación](../IMPLEMENTACION.md), incluidas sus decisiones concretas: SQLite transaccional en móvil, IndexedDB web, sincronización manual de favoritos y precios públicos separados de sus originales privados. Las propuestas de caché de catálogo compartida y sincronización permanente siguen sujetas a demanda y medición. [Estado actual](../ESTADO_ACTUAL.md) conserva la auditoría histórica.

## 1. Decisiones de base

| Decisión propuesta | Motivo y límite |
| --- | --- |
| Mantener React Native, Expo, Expo Router y TypeScript | Aprovechar el trabajo existente y una base móvil común. Actualizar SDK y módulos como conjunto compatible. |
| Mantener Firebase inicialmente | Ya existe integración; evita una migración sin una necesidad demostrada. Validar consultas, reglas, costes y experiencia de desarrollo antes de ampliarlo. |
| Organizar por funcionalidades y capas | Separar cámara, producto, historial y precios permite cambiar un proveedor sin reescribir pantallas. |
| Un módulo puro para interpretar gluten | La UI y la persistencia deben compartir reglas reproducibles. |
| Historial y favoritos locales en el MVP | Menor fricción; utilidad sin red ni cuentas. Incorporar sincronización como fase separada. |
| Backend gestionado cuando haya datos compartidos | Validación, moderación, cuotas y caché compartida requieren un punto de confianza. Candidato coherente: funciones gestionadas junto a Firebase, por evaluar. |

Una app escalable necesita límites, contratos, permisos y medición. No requiere microservicios en esta etapa.

## 2. Separación de responsabilidades

```text
Rutas y pantallas Expo Router
  ↓
Casos de uso: consultar, guardar favorito, registrar consulta
  ↓
Dominio: Product, GlutenAssessment, reglas puras y errores tipados
  ↓
Interfaces: ProductRepository, HistoryRepository, FavoritesRepository
  ↓
Adaptadores: Open Food Facts / almacenamiento local / Firebase
```

La pantalla no conoce las claves del JSON de Open Food Facts. Los adaptadores validan datos externos, normalizan ausencias y traducen fallos. Los repositorios devuelven resultados de dominio. La interpretación no hace peticiones ni depende de React o Firestore.

Estructura posible, a introducir gradualmente:

```text
app/                          Rutas finas; composición de pantallas
src/features/scanner/         Cámara, permisos y captura de códigos
src/features/products/        Ficha y casos de consulta
src/features/history/         Historial local y su búsqueda
src/features/favorites/       Gestión de favoritos
src/features/prices/          Solo cuando entre en alcance
src/domain/                   Tipos y reglas de interpretación
src/data/open-food-facts/      Cliente, validación y normalización
src/data/local/               Repositorios locales y migraciones
src/data/firebase/            Repositorios remotos cuando se activen
src/shared/ui/                Componentes y tokens visuales
src/shared/config/            Configuración validada por entorno
src/shared/observability/     Errores y mediciones sin datos personales
tests/fixtures/               Respuestas representativas de API
```

No mover todos los archivos de golpe: primero extraer el cliente y reglas, después adelgazar la pantalla y finalmente agrupar funciones al crecer.

## 3. Contratos de producto

Ejemplo conceptual de TypeScript; no es un contrato existente:

```ts
type GlutenState =
  | 'declared_gluten_free'
  | 'declared_gluten'
  | 'unknown'
  | 'conflicting';

interface Product {
  barcode: string;
  name: string | null;
  brands: string[];
  imageUrl: string | null;
  ingredientsText: string | null;
  labels: string[];
  allergens: string[];
  traces: string[];
  missingFields: string[];
  source: {
    provider: 'open_food_facts';
    productUrl: string;
    sourceUpdatedAt: string | null;
    fetchedAt: string;
    environment: 'staging' | 'production';
  };
  assessment: {
    state: GlutenState;
    reasons: string[];
    traceWarnings: string[];
    rulesVersion: string;
    assessedAt: string;
  };
  schemaVersion: number;
}
```

Conservar evidencia original relevante o una representación trazable de ella. `fetchedAt` significa consulta y `assessedAt` ejecución de reglas; ninguna equivale a certificación o inspección. El adaptador debe distinguir `labels` vacío de campo ausente mediante `missingFields`.

El resultado de consulta debe diferenciar `found`, `not_found` y errores como `invalid_barcode`, `offline`, `timeout`, `rate_limited`, `provider_error`, `invalid_response`. El repositorio devuelve también si el dato es de caché y si se considera pendiente de refresco.

Los códigos se almacenan como cadenas. Las reglas de normalización de EAN/UPC y su dígito de control deben ser explícitas y probadas; no eliminar ceros indiscriminadamente. Los QR quedan fuera del flujo de producto salvo que se defina y valide un formato soportado.

## 4. Consulta y caché

1. Validar y normalizar código.
2. Reutilizar la petición en curso para el mismo código; bloquear eventos repetidos del escáner.
3. Leer caché local y presentar el dato guardado con fecha.
4. Si hay red y corresponde refrescar, consultar al proveedor o a una caché gestionada cuando exista.
5. Validar respuesta, interpretar con la versión actual de reglas y actualizar caché.
6. Registrar la consulta en historial sin duplicados causados por callbacks.

La nueva petición cancela o invalida la anterior. Una respuesta antigua nunca sustituye al producto activo. Reiniciar el escáner limpia el estado de error de la operación anterior.

Política inicial a validar: refresco tras 24 h, caché negativa de producto no encontrado de 5 min, tamaño acotado y expulsión por uso. Estos tiempos controlan consultas; no acreditan vigencia del etiquetado. Favoritos e historial conservan su referencia aunque se expulse una imagen o una entrada de caché.

Respetar `429` y `Retry-After` cuando estén disponibles; reintentos limitados con espera creciente y variación aleatoria solo para fallos transitorios. No reintentar códigos inválidos ni producto inexistente. Solicitar únicamente los campos necesarios. Directrices: [API oficial de Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/).

Para almacenamiento local, evaluar SQLite por consultas, migraciones y límites de volumen. Verificar soporte web por separado; el contrato del repositorio permite una implementación distinta en navegador. No usar el mecanismo local de secretos como almacén masivo de productos.

## 5. Modelo remoto evolutivo

No crear estas colecciones hasta que la función correspondiente esté en alcance. Es una propuesta que sustituiría gradualmente al esquema actual.

| Recurso | Campos principales | Escritura prevista |
| --- | --- | --- |
| `products/{barcode}` | Producto normalizado, evidencia, versión de esquema/reglas y fechas de origen/recepción. | Importador o backend controlado; clientes sin edición arbitraria del catálogo. |
| `users/{uid}` | Preferencias mínimas y fechas técnicas. | Usuario sobre campos permitidos. |
| `users/{uid}/favorites/{barcode}` | Código, fecha de guardado y versión de sincronización. | Propietario; solo si activa sincronización. |
| `users/{uid}/scanHistory/{scanId}` | Código, fecha de consulta y resumen/versiones consultadas. | Propietario; colección opcional, no subir historial por defecto. |
| `supermarkets/{chainId}` | Nombre y ámbito de la cadena. | Administración/importación validada. |
| `stores/{storeId}` | Cadena, nombre, localidad y ubicación comercial si se necesita. | Administración/importación validada. |
| `priceObservations/{observationId}` | Código, sucursal o ámbito, importe, moneda, cantidad, autor, fechas y estado de moderación. | Ingreso validado; publicación controlada. |
| `productReports/{reportId}` | Referencia del producto, motivo y estado de revisión. | Alta limitada; lectura restringida al remitente/moderación según política. |

### Reglas de integridad

- Importes en unidades monetarias menores enteras, por ejemplo céntimos; moneda explícita. Rechazar importes no finitos, negativos y valores fuera de límites definidos.
- Precio de artículo separado del precio normalizado por kg/l/unidad; solo calcular cuando cantidad y unidad sean conocidas y compatibles.
- `observedAt` informa de cuándo se vio el precio; `createdAt` del servidor informa de cuándo se recibió. No confiar en la fecha del cliente para establecer autoridad.
- Observaciones de precio nuevas en lugar de sobrescribir la única observación del supermercado. Promociones con fechas y condiciones propias.
- Autor y estado de moderación no pueden ser elegidos arbitrariamente por el cliente.
- Validar tamaños de texto, formatos, referencias, listas y campos permitidos en el punto de ingreso.
- Identificadores de operación idempotentes para que reintentar una escritura no duplique contribuciones.
- Versiones de esquema y migraciones probadas; no actualizar todos los documentos al arrancar cada móvil.

### Consultas e índices

Diseñar índices a partir de pantallas: historial por propietario y fecha descendente; favoritos por propietario y fecha; observaciones publicadas por código/sucursal y fecha. Versionar los índices necesarios.

Paginar por cursor y limitar tamaños, con propuesta inicial de 20 elementos por página. Evitar listeners globales al catálogo, lectura de todos los precios para cada ficha y patrones de una petición adicional por cada fila de lista.

Una búsqueda por nombre o múltiples filtros necesita un diseño específico. Validar lo que permite el proveedor; si se añade un motor de búsqueda, hacerlo tras medir volumen y relevancia. No asumir que Firestore ofrece búsqueda de texto completa.

## 6. Seguridad, sincronización y límites

En MVP: consultas sin cuenta, historial y favoritos locales. Si se incorpora una cuenta, separar identidad de datos de producto y enlazar el contenido local solo con una acción explícita de sincronización.

Las reglas remotas deben negar por defecto, aislar datos por `uid`, proteger roles y restringir catálogo/precios públicos. Verificar en emulador lecturas, escrituras y consultas entre dos usuarios. App Check y cuotas complementan la autorización; no la sustituyen. Las claves públicas de Firebase no autorizan por sí mismas: [documentación oficial](https://firebase.google.com/docs/projects/api-keys).

Para sincronización: favoritos como conjunto con operaciones de alta/baja y marcas de borrado; historial como eventos idempotentes; contribuciones como cola local validada al llegar al servidor. Separar errores temporales de rechazos definitivos y mostrar operaciones pendientes. Probar conflictos entre dispositivos, cierre de sesión y eliminación de cuenta.

La caché compartida y el backend se introducen cuando hagan falta control global del tráfico, normalización central, moderación o contribuciones. Antes, fijar presupuesto y evaluar mantenimiento. Un backend con credenciales administrativas debe validar identidad y permisos: no puede delegar toda la seguridad en reglas que ese acceso administrativo omita.

## 7. Escalado y control de costes

| Riesgo | Control propuesto | Medición |
| --- | --- | --- |
| Muchas consultas repetidas | Caché local, deduplicación en curso y posteriormente caché compartida. | Aciertos de caché, consultas externas por sesión y `429`. |
| Coste creciente en Firestore | Paginación, índices adecuados, listeners acotados y resúmenes cuando se justifiquen. | Lecturas/escrituras por flujo y coste por 1.000 consultas. |
| Catálogo divergente | Normalización única, refrescos controlados y versiones de reglas. | Edad del dato y fallos de normalización. |
| Abuso de contribuciones | Identidad, límites por usuario/origen, validación y revisión. | Rechazos, duplicados y tiempo de moderación. |
| Datos locales crecientes | Límite configurable, política de limpieza y migraciones. | Tamaño local y latencia de listas. |
| Cambios de proveedor | Interfaces de repositorio y pruebas de contrato. | Errores de contrato por versión. |

Simular carga de 1× y 10× la beta esperada antes de ampliar usuarios. El volumen base y el presupuesto mensual aún no están definidos, por lo que no se promete un número de usuarios soportados. Establecer alertas de gasto y un mecanismo para desactivar contribuciones o funciones costosas manteniendo la lectura local.

## 8. Retención y procedencia

Propuesta inicial: historial local limitado a las últimas 1.000 consultas con opción de borrar; favoritos no se eliminan automáticamente. Validar estos límites con uso real. Si se sincroniza, definir la misma política remota y el borrado de copias derivadas.

Para precios, definir antigüedad visible, caducidad de ofertas y política de archivo antes de publicarlos. Las evidencias fotográficas, si se añaden, necesitan límites de almacenamiento, eliminación de metadatos no necesarios y permisos propios.

Preservar atribución y separar datos importados de datos aportados por usuarios. Revisar las condiciones de reutilización antes de publicar un catálogo derivado: [licencias de Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).
