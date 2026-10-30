# Hoja de ruta · Comparar precios y planificar la compra

Actualizada el **30-10-2026**. Este documento fija el orden de entrega vigente. El [backlog](PLAN_MEJORAS.md) contiene las tareas y sus criterios; [Producto](PRODUCTO.md) define el comportamiento esperado. El [plan anterior](historico/README.md) se conserva como histórico y deja de ordenar el trabajo.

## Enfoque acordado

Ayudar a decidir **dónde hacer la compra con el menor coste entre las opciones que tienen datos comparables**. La comparación de precios es el núcleo; la información sobre gluten sigue disponible como función complementaria para consultar evidencia y contrastar alternativas.

- Empezar por España, EUR y español, con cobertura real por comprobar; no prometer todas las cadenas, precios en tiempo real ni existencias.
- Combinar anotaciones privadas con fuentes públicas investigadas. Open Prices ya está integrado en lectura; incorporar otras fuentes exige validar contrato, permisos de reutilización, cobertura y mantenimiento.
- Mantener almacenamiento local, uso sin cuenta y **sin contratar backend ni activar facturación**. No habilitar Blaze, Functions, sincronización o servicios de pago para completar estas fases.
- Conservar **B · Mesa**, elegida y aplicada. No reiniciar la exploración visual. SinGluten sigue siendo nombre de trabajo; el nombre comercial debe encajar con el nuevo enfoque antes de publicar.
- Mostrar fuente, sucursal o ámbito, fecha, condiciones y límites de la muestra. «Más barato» significa dentro de esa comparación, no en todo el mercado.
- Conservar los cuatro estados de evidencia sobre gluten, las trazas y el acceso a la ficha completa. Un precio bajo no convierte un producto en una alternativa adecuada.

## Punto de partida comprobado

Base de código: **`638980a`**, iteración 8, rama `gonsals/mejoras`. [CI: cinco controles correctos](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028): app, Firebase, dependencias, secretos y Android. Este resultado corresponde a ese commit; cada entrega posterior necesita sus propias comprobaciones.

| Disponible | Límite actual |
| --- | --- |
| Comparador por GTIN y envase, fuentes públicas y privadas separadas, filtros de edad/ofertas/ubicación. | Cesta, totales por sucursal y alternativas explícitas disponibles; medición inicial entregada y sin cobertura suficiente en la muestra; utilidad en compras reales pendiente. |
| Supermercado sugerido y editable al anotar un precio. | No acredita sucursal, stock ni precio nacional. |
| Open Prices en lectura, sin cuenta ni clave; carga acotada. | Cobertura colaborativa sin garantía por zona; caché pública solo en memoria. |
| Biblioteca local, favoritos, historial, precios privados, exportación y restauración. | Iteración 11: esquema/copia v4 con cesta, sucursales, vínculos y grupos; importación v1/v2/v3. Validación física pendiente. |
| Mesa, escáner, entrada manual y evidencia de gluten. | Naming, cámara física, revisión experta y accesibilidad nativa pendientes. |
| 144 pruebas de app, 34 de seguridad, 23 recorridos web y APK Android emulada. | No equivalen a beta, iOS nativo ni validación con compras reales. |

**Actualización de iteración 9:** CES-01/CES-02 implementadas técnicamente: cesta local, cantidades, migración y copias v2, borrado y protección entre clientes. 164 pruebas de app y 35 de seguridad; recorridos y límites en [Cesta local](CESTA_LOCAL.md). La CI enlazada arriba sigue acreditando solo `638980a`.

**Iteración 10:** TIE-01/CES-03 entregadas técnicamente: sucursales confirmadas, totales completos/parciales, discrepancias de fuente y copias v3. 183 pruebas de app, 35 de seguridad y 36 recorridos web. [Contrato y evidencia](TOTALES_Y_SUCURSALES.md). La nueva revisión necesita su propia CI; no se atribuyen a ella resultados de commits anteriores.

Detalle: [Implementación](IMPLEMENTACION.md), [contrato del comparador](COMPARADOR_DE_PRECIOS.md), [copias locales](COPIAS_LOCALES.md). La APK interna usa firma de desarrollo. La nube opcional queda fuera del alcance local.

## Orden de entrega

**P0**: bloqueo de seguridad o fiabilidad que debe resolverse antes de la distribución afectada. **P1**: núcleo del comparador y condiciones de beta. **P2**: ampliación tras validar el núcleo. **P3**: exploración sin compromiso. No hay fechas de entrega inventadas; el cierre exige criterios y evidencia.

### Fase 1 · Cesta local persistente — implementada técnicamente

Tareas **CES-01 y CES-02**, P1, entregadas en la iteración 9. [Contrato y evidencia](CESTA_LOCAL.md). Las pruebas físicas siguen en CAL-02. Partir de productos consultados o guardados, añadir/quitar líneas y cambiar el número de envases. Admitir productos sin precio; explicar qué falta sin impedir preparar la lista. Límites implementados: una cesta activa, hasta 100 productos distintos y cantidades enteras de 1 a 99 envases. Su utilidad sigue pendiente de contrastar en uso.

La cesta forma parte de los datos personales: persistencia tras reinicio, exportación, restauración, borrado y migración desde v1 deben entregarse juntos. Mantener las fichas referenciadas por la cesta aunque se limpie el historial. No cambiar ni perder favoritos o precios existentes.

**Cierre:** recorrido añadir → editar → cerrar → abrir sin red → exportar/restaurar → borrar probado en web y Android, con datos v1 y fallos de escritura. Los totales de la fase 2 se entregan en la iteración 10. Contrato y recuperación en [Arquitectura](ARQUITECTURA.md).

### Fase 2 · Comparar el total por establecimiento — implementada técnicamente

Tareas **TIE-01 y CES-03**, P1, implementadas en iteración 10. [Identidad, totales y pruebas](TOTALES_Y_SUCURSALES.md). Las validaciones físicas/de uso siguen en CAL-02/BET-01. Distinguir cadena, sucursal física y observación sin localización suficiente. Asociar referencias privadas y públicas solo mediante vínculo explícito verificable; no agrupar por un nombre parecido.

Calcular cantidades × precios elegibles y mostrar cobertura, fecha y condiciones por línea. Solo las cestas con todos los productos y cantidades cubiertos entran en el ranking de totales. Las incompletas muestran **subtotal y faltantes**, nunca un total bajo que parezca una compra completa. Si solo hay una cesta completa, mostrar su estimación sin afirmar ahorro frente a opciones incompletas.

**Cierre:** mismo resultado en dominio, pantalla y restauración; pruebas de faltantes, sucursales distintas, última observación, ofertas, caducidad, filtros y precisión monetaria. Explicar «menor total de la muestra completa», sin prometer stock. Ejemplo numérico en [Producto](PRODUCTO.md).

### Línea paralela desde la fase 1 · Cobertura útil de precios

**DAT-01**, P1, medición inicial entregada en iteración 12. [Informe reproducible](COBERTURA_PRECIOS_PUBLICOS.md): diez GTIN, Madrid, 33 observaciones compatibles y ninguna elegible; ninguna cesta completa. La tarea de medir se cierra, no el objetivo de cobertura suficiente. Para ampliar la muestra, declarar de nuevo productos, zona y fechas: observaciones utilizables, antigüedad, sucursales identificables y proporción de cestas completas. No confundir una petición correcta con cobertura suficiente en España.

**DAT-02** sigue P2 condicionada: persistir la caché no soluciona los huecos medidos. **DAT-03**, investigación de iteración 13 entregada: [tres candidatos revisados](FUENTES_PUBLICAS.md), sin fuente nueva aprobada. La integración sigue condicionada a acceso/reutilización y datos adecuados; no hay piloto iniciado. La app mantiene las anotaciones privadas útiles cuando falla el proveedor. No barrer catálogos, subir bibliotecas ni montar un backend para llenar huecos.

**Cierre:** informe reproducible de cobertura y decisión de continuar, acotar zona o incorporar una fuente. Si no hay datos suficientes, ajustar la promesa y facilitar anotaciones; no simular precios. Esta línea acompaña la cesta, no espera a una fase de nube.

### Fase 3 · Comparar formatos y alternativas — implementada técnicamente

**UNI-01 y ALT-01**, P1 implementadas técnicamente en iteración 11. [Contrato, evidencia y límites](FORMATOS_Y_ALTERNATIVAS.md). Comparación de alternativas con anotaciones privadas elegibles; no es optimización automática de la cesta completa. Calcular €/kg, €/l o €/unidad solo con cantidades conocidas y unidades compatibles. Separar el indicador unitario del coste de comprar envases enteros para cubrir una necesidad.

Definir grupos de alternativas explícitos, revisables por la persona; nombres similares no prueban equivalencia. Incluir la consulta y filtro por declaración sin gluten, conservando trazas, contradicciones y datos insuficientes. No sustituir automáticamente un producto por otro por ser más barato.

**Cierre:** formatos, multipacks, redondeos, cantidad sobrante y restricciones probados; la persona entiende qué se compara y confirma las sustituciones. La revisión del lenguaje de gluten sigue siendo un control independiente (**GLU-01**).

### Fase 4 · Validar el comparador en una compra real

**CAL-01, CAL-02 y GLU-01**, P1. CAL-01 técnica está verificada en iteración 14 con [muestra sintética y recuperación integrada](VALIDACION_COMPRA.md); la compra real sigue pendiente. Las pruebas se añaden durante cada fase; aquí se cierra el recorrido integrado y la matriz física. Contrastar cesta, tickets o precios observados, faltantes, filtros y utilidad con muestra y versión registradas. No atribuir diferencias a ahorro real si no se ha hecho una compra equivalente.

Probar Android físico, cámara, permisos, red lenta/sin red, accesibilidad con TalkBack, fuente ampliada, restauración y actualización. iOS exige compilación y dispositivo con VoiceOver antes de declararlo soportado. La revisión experta sobre gluten y las sesiones de comprensión siguen pendientes.

**Cierre:** sin bloqueos del recorrido, matriz con evidencia y limitaciones visibles. El objetivo de beta es validar decisiones de compra y claridad del dato, además del escaneo.

### Fase 5 · Beta y distribución controladas

**MAR-01, REL-01, BET-01 y REL-02**, P1. Revisar nombre comercial con el nuevo enfoque preservando Mesa; preparar firma, privacidad, atribución, soporte y recuperación. Ninguna cuenta de tienda o servicio de pago se contrata por aparecer en el plan.

Propuesta de beta: 5–10 personas con consentimiento, versiones identificables y comentarios sin exigir historiales privados. Definir métricas y denominadores antes de evaluar resultados. No hay beta realizada ni objetivos de estabilidad demostrados.

**Cierre:** criterios de [Calidad y operación](CALIDAD_Y_OPERACION.md) cumplidos para la plataforma y canal elegidos. Integrar/publicar requiere el flujo de revisión correspondiente; push a la rama no equivale a publicación en tiendas.

## Seguridad y mantenimiento durante todas las fases

**SEG-01 es P0 antes de publicación general.** El 29-10 la auditoría registra tres avisos de origen actuales (Zod, OpenTelemetry y deepmerge), 19 entradas afectadas de app y cero en `functions/`. node-forge 1.4.2 elimina su aviso anterior. deepmerge es nuevo y no está exceptuado: `audit:security` y el job de dependencias quedan bloqueados; el desarrollo local sigue sujeto a revisión de exposición documentada. Excepciones exactas con vencimiento **22-11-2026**; no se renuevan automáticamente. Las excepciones anteriores permanecen exactas y sin ampliación; ambos controles de auditoría quedan bloqueados por los avisos que correspondan. [Dependencias](DEPENDENCIAS.md).

| Momento | Control |
| --- | --- |
| Cada cambio | Pruebas adecuadas al riesgo, tipos/lint cuando hay código y escaneo de secretos; evidencia por commit. |
| Cada cambio de datos | Migración, copia/restauración, borrado y recuperación ante fallo, sin pérdida silenciosa. |
| Cada actualización de runtime | Matriz compatible y comprobación nativa; no forzar versiones mayores aisladas. |
| Semanal y antes del 22-11-2026 | Revisar actualizaciones y avisos; mantener el bloqueo si no hay solución compatible. |
| Cada distribución | Canal, firma, versión, dispositivos, atribución, privacidad, soporte y recuperación. |

## Después de validar el núcleo

| ID / prioridad | Evolución | Condición para abordarla |
| --- | --- | --- |
| CES-04 / P2 | Repartir una cesta entre varias tiendas. | Totales completos validados; mostrar número de visitas y costes de desplazamiento solo si se aportan. |
| FUT-01 / P2 | Organización de biblioteca, avisos de antigüedad y rendimiento. | Problema observado o perfilado con datos cercanos al límite. |
| FUT-02 / P3 | Búsqueda por nombre/categoría, alertas y otros mercados. | Fuente, cuotas, cobertura, mantenimiento y utilidad comprobados. |
| FUT-03 / P3 | Sincronización o contribuciones propias. | Demanda y presupuesto explícitos; aislamiento, abuso, conflictos y borrado probados antes de activar. Fuera del alcance actual. |
| FUT-04 / P3 | Mapas, OCR o IA. | Beneficio demostrado, procedencia, privacidad y coste aceptables; sin certificar aptitud ni inventar precios. |

La escalabilidad se prepara con contratos de proveedores, cálculos puros, límites, almacenamiento versionado y medición. No se presupone infraestructura compartida, catálogo completo ni capacidad ilimitada de una API gratuita.

## Seguimiento y decisiones

Cada tarea del [backlog](PLAN_MEJORAS.md) tiene ID estable, prioridad, estado, dependencias y aceptación. Responsable técnico: quien implemente y registre evidencia; naming: propietario; revisión de gluten: persona experta por designar. No se consideran realizadas revisiones externas por completar código.

| Fecha | Decisión vigente |
| --- | --- |
| 24-10-2026 | Versión local sin costes de backend; cuentas y nube fuera del alcance obligatorio. |
| 25-10-2026 | B · Mesa elegida y aplicada; sustituye el desacuerdo con la identidad inicial. |
| 26-10-2026 | Precio y compra económica como núcleo, gluten complementario y supermercado sugerido editable. |
| 26-10-2026 | Investigar también fuentes públicas; Open Prices integrado con límites y separación de datos privados. |
| 30-10-2026 | CAL-01 técnica verificada con muestra sintética; corregir acceso a editar cesta desde enlace directo y continuar CAL-02 emulada/preparación física. |
| 30-10-2026 | DAT-03 revisa Carrefour, FACUA y MAPA sin aprobar un nuevo proveedor; continuar con CAL-01 técnica y mantener la integración condicionada. |
| 26-10-2026 | Nuevo orden: cesta segura → total por establecimiento → formatos/alternativas → validación → beta. Cobertura y seguridad acompañan todas las fases. |

**Siguiente iteración: CAL-02**, verificación Android emulada y preparación de la matriz física de la versión vigente. [CAL-01 técnica verificada en iteración 14](VALIDACION_COMPRA.md): cuatro casos integrados y resultados independientes; la compra real sigue pendiente y no se cierra con datos sintéticos. DAT-03 entrega la investigación de tres fuentes; no se aprueba otra integración. Compra física y sesiones reales siguen pendientes. DAT-01 ya entrega la medición de Madrid, cuyo resultado no acredita cobertura suficiente. UNI-01/ALT-01 entregadas técnicamente en iteración 11. Validación física, experta y de uso siguen pendientes. SEG-01 mantiene el bloqueo de publicación y ahora también el control de dependencias por deepmerge.
