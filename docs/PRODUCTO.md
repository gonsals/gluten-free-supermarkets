# Producto · Comparar precios para decidir la compra

Especificación vigente del **26-10-2026**. Sustituye el enfoque inicial centrado en consulta de gluten. [Hoja de ruta](HOJA_DE_RUTA.md) para orden de entrega; [backlog](PLAN_MEJORAS.md) para estados; [comparador actual](COMPARADOR_DE_PRECIOS.md) para el contrato implementado.

## Propuesta y público inicial

Ayudar a preparar una compra, comparar cuánto costaría en distintos establecimientos y elegir entre opciones con datos suficientes. Escanear o introducir un código facilita identificar el producto, anotar un precio y compararlo. La información sobre gluten es una función complementaria para quien la necesite.

Contexto inicial: compra cotidiana en España, EUR y español. El público prioritario son personas que quieren controlar el coste de la compra; incluye a quienes buscan productos con declaración sin gluten y desean contrastar sus precios. Validar utilidad con compras reales antes de ampliar mercado o prometer cobertura nacional.

Funcionamiento local sin cuenta obligatoria ni costes de backend contratado. Open Food Facts aporta fichas; Open Prices, observaciones públicas; la persona puede anotar precios privados. Ninguna de esas fuentes acredita existencias actuales ni acceso oficial a todos los supermercados.

## Alcance real y siguiente objetivo

| Capacidad | Estado al 26-10-2026 |
| --- | --- |
| Comparar mismo GTIN/envase con fuentes, fechas, tienda y filtros | Implementado, iteración 8. |
| Proponer supermercado desde datos explícitos o asociaciones acotadas de marca | Implementado; editable y sin deducir sucursal o disponibilidad. |
| Guardar precios privados y consultar Open Prices | Implementado; datos públicos separados y no incluidos en copias privadas. |
| Consultar ficha, gluten, trazas y procedencia | Implementado técnicamente; revisión experta/comprensión pendientes. |
| Biblioteca offline, favoritos, copias y restauración | Implementado; esquema/copia v1, sin cesta. |
| Cesta persistente con cantidades, copias y borrado | Siguiente entrega CES-01/CES-02; pendiente. |
| Totales por establecimiento y cobertura completa | CES-03, pendiente tras cesta e identidad de tienda. |
| Equivalencia por formato/unidad y alternativas | UNI-01/ALT-01, pendientes; no se equiparan productos por nombre. |
| Cobertura suficiente por zona y uso durante compras reales | DAT-01/CAL-01/BET-01, pendientes de medir. |

El MVP objetivo del nuevo enfoque incluye cesta, totales comparables y cobertura explícita. La app actual es su base por producto, no un comparador de cestas ya terminado. Alternativas amplían el núcleo en la fase siguiente. Mapas, publicación propia de precios, sincronización, alertas e IA quedan condicionados a demanda y viabilidad; no son requisitos para activar servicios.

## Reglas de precio y de comparación

Cada referencia debe mantener producto/código y envase, importe y moneda, fecha de observación, procedencia, tienda/sucursal o ámbito, y condiciones relevantes. Distinguir fecha de observación, recepción y consulta; consultar hoy no actualiza un precio observado hace un mes.

Actualmente se compara el **mismo GTIN y envase**. Los precios privados se guardan en céntimos enteros y se convierten a milésimas de EUR en el comparador; los públicos admiten hasta tres decimales. El cálculo no usa importes binarios de coma flotante como autoridad monetaria. No mezclar precio de envase con precio por kg/l de una categoría a granel.

Seleccionar primero la observación más reciente por referencia de sucursal y origen; después filtrar edad, condiciones y ubicación. Si la más reciente es una oferta excluida, no reaparece una antigua más barata como precio actual. Por defecto: siete días y sin ofertas ni notas privadas sin revisar; las ofertas privadas vencidas no entran en el ranking. El historial conserva los registros originales.

El ranking actual se limita a referencias cargadas, sin unión automática de la sucursal privada con la pública. España es filtro local sobre datos públicos; el país de una anotación privada no se inventa. Un error, dato descartado o límite de paginación debe distinguirse de «no hay precios».

## Cesta y totales — contrato objetivo pendiente

Una primera cesta activa contiene productos identificados y número entero de envases. Propuesta inicial: hasta 100 líneas distintas y 1–99 envases por línea; peso variable y fracciones se diseñarán después con su contrato. Cambiar cantidades o filtros invalida/recalcula las estimaciones. Las líneas sin precio permanecen visibles.

Comparar por **establecimiento o ámbito verificado**, sin sumar el precio de una sucursal y otro de otra para crear una cesta de cadena ficticia. Una observación sin localización suficiente puede conservarse, pero no cubre silenciosamente una línea de cualquier sucursal. Los vínculos entre referencias de distinto origen requieren confirmación y pueden deshacerse.

Para cada establecimiento:

1. Resolver precio elegible por línea y conservar sus referencias/condiciones. Si dos fuentes vinculadas discrepan, aplicar una regla determinista documentada y mostrar el conflicto; no elegir siempre la más barata para ocultarlo.
2. Multiplicar el precio por el número de envases con precisión entera. Los totales calculados son estimaciones basadas en observaciones, no un ticket garantizado.
3. Indicar cobertura por líneas distintas y cantidades, productos faltantes y motivo: sin dato, antiguo, oferta excluida, formato incompatible o proveedor fallido.
4. Ordenar por total solo establecimientos con cobertura completa bajo los mismos filtros. Mostrar aparte subtotales incompletos, nunca cero para un faltante.
5. Mostrar diferencia frente a otras cestas completas de la muestra. Con una sola completa no hay base para afirmar ahorro comparativo.

Ejemplo sintético: cesta de **2 envases de leche + 1 de pasta**, mismo código por producto en cada tienda.

| Establecimiento | Leche por envase | Pasta por envase | Resultado |
| --- | --- | --- | --- |
| A | 1,20 € | 2,10 € | Completa: 2 × 1,20 + 2,10 = **4,50 €**. |
| B | 1,05 € | Sin dato | Parcial: **2,10 €**, 1/2 líneas y 2/3 envases; falta pasta. Fuera del ranking de totales. |
| C | 1,35 € | 2,05 € | Completa: 2 × 1,35 + 2,05 = **4,75 €**. |

A tiene el menor total **entre las cestas completas de esta muestra**, con diferencia estimada de 0,25 € frente a C. B no puede presentarse como la compra más barata. Los ejemplos no son precios reales ni cobertura de cadenas.

La implementación de CES-03 debe fijar y probar redondeo de presentación: conservar milésimas en operaciones, mostrar precisión suficiente cuando afecte al orden y redondear el total mostrado de manera consistente. No derivar un ahorro distinto por sumar importes ya redondeados. Gastos de envío/desplazamiento, fidelidad y stock solo se incorporan si hay datos y condiciones explícitos; inicialmente se excluyen del total y se explica.

## Formatos y alternativas — fase posterior

Separar tres preguntas: cuánto cuesta el envase, cuánto cuesta por unidad compatible y cuántos envases hacen falta para una cantidad requerida. Un multipack barato por kg puede exigir más desembolso y dejar sobrante. Mostrar ambos efectos.

Convertir solo unidades compatibles con cantidades conocidas: masa con masa, volumen con volumen y unidades con unidades equivalentes. No convertir gramos a mililitros sin datos específicos ni asumir formatos por el nombre. Los productos con códigos distintos requieren un grupo de equivalencia explícito y confirmación de sustitución.

La declaración sin gluten puede filtrar alternativas cuando haya evidencia compatible; no convierte versiones con/sin gluten en sustitutos automáticos ni permite asegurar aptitud. Comparar coste respetando la selección de la persona y conservar los avisos de la ficha.

## Recorridos y presentación

| Pantalla | Comportamiento vigente / previsto |
| --- | --- |
| Inicio | Compra económica como propósito y acceso principal a comparar. En la entrega de cesta, añadir acceso a cesta activa con estado y faltantes. |
| Comparar | Código → referencias públicas/privadas → filtros, fuente, fecha y ranking del mismo envase. Futuro acceso a totales sin confundir ranking de producto y cesta. |
| Consultar | Escáner o entrada manual, validación EAN/UPC y recuperación de permisos/errores. Cámara/linterna se desactivan al salir o pasar a segundo plano. |
| Ficha | Identidad, comparar/anotar, tiendas declaradas y evidencia de gluten completa; ingredientes, alérgenos, trazas, fuente/fechas. El acceso desde comparar debe preservar todo ese contexto. |
| Anotar precio | Proponer supermercado cuando haya base; permitir corregir o vaciar sin sobrescribir la edición al llegar metadatos. Fecha, envase, oferta, notas y localidad explícitos. |
| Biblioteca | Productos guardados y precios privados, historial y favoritos. Próxima entrega permite añadir a cesta; limpiar historial no elimina productos aún referenciados. |
| Cesta, pendiente | Añadir/editar/quitar, cantidades y persistencia; después, comparación completa/parcial con faltantes y condiciones. No se presenta como pantalla ya construida. |
| Ajustes | Privacidad, atribución, versión, ayuda, exportación, restauración y borrado. La incorporación de cesta amplía todos los controles de datos. |

Mantener Mesa en claro/oscuro, textos comprensibles, etiquetas accesibles, fuente ampliada y acciones alcanzables. Ningún resultado depende solo del color. No añadir cuentas o detalles de implementación a una compra que no los necesita.

## Información sobre gluten — función complementaria conservada

| Estado | Significado |
| --- | --- |
| `declared_gluten_free` | Figura como sin gluten en la fuente, sin declaración explícita contradictoria detectada por las reglas. |
| `declared_gluten` | La fuente declara gluten. |
| `unknown` | Información insuficiente para los estados anteriores. |
| `conflicting` | Datos contradictorios; mostrar las evidencias y pedir revisar etiquetado. |

Las trazas son una señal adicional visible incluso junto a una declaración sin gluten. Datos ausentes, alérgenos vacíos o un nombre de producto no equivalen a ausencia confirmada de gluten. Las etiquetas se interpretan mediante reglas versionadas y taxonomías admitidas; una búsqueda libre de ingredientes no certifica aptitud.

Conservar evidencia, campos ausentes, motivos y versión de reglas. Diferenciar fecha de modificación de la fuente, consulta y evaluación automática. Una ficha favorita, restaurada o antigua no se presenta como verificada recientemente. La app muestra información de la fuente, no una certificación propia. [Protocolo experto y casos](VALIDACION_GLUTEN.md); revisión experta y comprensión siguen pendientes antes de beta dirigida a ese público.

## Privacidad, fuentes y costes

Precios privados, notas, cesta e historial permanecen locales por defecto. Abrir una consulta pública envía el código y datos técnicos de conexión al proveedor; no envía anotaciones privadas ni la biblioteca completa. La futura consulta desde cesta debe ser explícita, acotada y cancelable; no una descarga automática de todo el catálogo.

Mantener Open Food Facts, Open Prices/ODbL y OpenStreetMap/ODbL atribuidos según los datos utilizados. Las copias privadas no convierten datos públicos en aportaciones propias. La caché pública persistente es una propuesta condicionada; hoy solo existe en memoria.

No activar servicios de pago, facturación, cuentas obligatorias, mapas alojados o IA para cumplir el núcleo. Los posibles costes de distribución se revisan al elegir canal; la ausencia de backend contratado no acredita que publicar en cualquier tienda sea gratuito.

## Qué validar y medir

| Pregunta | Evidencia necesaria; todavía pendiente |
| --- | --- |
| ¿Se entiende qué cesta es comparable? | Sesiones con completas/parciales; identificar faltantes y no elegir un subtotal como menor total. |
| ¿Hay datos útiles en una zona? | N productos y fechas declarados, proporción con precio elegible y de cestas completas; errores de proveedor separados. |
| ¿Ayuda a decidir la compra? | Compra equivalente o sesión observada con cantidades y condiciones; diferencia estimada separada del ahorro efectivamente comprobado. |
| ¿Es usable y estable? | Matriz física/accesibilidad y fallos/tiempos por versión y entorno, con denominadores; sin porcentajes deducidos de unas pocas pruebas. |
| ¿Se comprende gluten como evidencia? | Revisión experta y participantes que distinguen declaración de certificación, trazas y desconocido. |

No hay métricas de ahorro, cobertura, p95 o estabilidad de beta demostradas. [Calidad y operación](CALIDAD_Y_OPERACION.md) define cómo obtenerlas. Quedan por decidir nombre definitivo, alcance de plataformas/distribución, responsables y umbrales tras medir la línea base; la prioridad de precios ya está decidida.
