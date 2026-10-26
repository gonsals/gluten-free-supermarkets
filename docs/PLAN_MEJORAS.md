# Backlog de ejecución · Comparador de compra

Actualizado el **26-10-2026**, conforme al enfoque acordado. La [hoja de ruta](HOJA_DE_RUTA.md) es la única referencia de orden de entrega; [Producto](PRODUCTO.md) define reglas y [Calidad](CALIDAD_Y_OPERACION.md) las comprobaciones. La evidencia base es `638980a`, no una declaración de que las tareas pendientes estén implementadas.

## Convenciones y responsabilidad

- **P0:** bloqueo de seguridad/fiabilidad antes de la distribución afectada; **P1:** núcleo y beta; **P2:** mejora condicionada a validar el núcleo; **P3:** exploración.
- Estados: **verificada**, **pendiente**, **bloqueada** o **condicionada**. «Verificada» incluye el alcance y las limitaciones de su evidencia; no implica validación externa.
- Responsable por defecto: técnico que ejecute la tarea y documente resultado/commit. MAR-01 requiere decisión del propietario; GLU-01, revisión experta por designar; BET-01, coordinación y participantes por concretar. No son revisiones ya realizadas.
- Un hito de datos no se entrega a medias: cesta, migración, copias y borrado forman una sola entrega revisable. No hay estimaciones de calendario sin disponibilidad y muestra.

## Base y siguiente entrega

| ID | Prioridad / estado | Dependencias | Trabajo y aceptación |
| --- | --- | --- | --- |
| CMP-00 | P1 / verificada técnicamente | — | Iteración 8: comparación del mismo GTIN/envase, sugerencia de tienda, Open Prices separado de anotaciones, Mesa y biblioteca. 144 pruebas de app, 34 de seguridad y 23 recorridos web; [CI con cinco controles correctos](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028). Sin cesta, cobertura nacional demostrada ni validación física. [Contrato](COMPARADOR_DE_PRECIOS.md). |
| CES-01 | P1 / pendiente; siguiente | CMP-00 | Una cesta activa: añadir desde producto/biblioteca, editar número de envases, quitar y vaciar con confirmación. Propuesta: 100 líneas distintas y 1–99 envases enteros; agrupar mismo GTIN sin duplicados. Admitir falta de ficha o precio y explicar el dato ausente. Acciones accesibles y funcionamiento local. No mostrar todavía totales por tienda. |
| CES-02 | P1 / pendiente; misma entrega | CMP-00 | Versionar esquema y copia para la cesta, migrar v1 con cesta vacía, exportar/restaurar/borrar y conservar fichas referenciadas. Probar reinicio offline, archivo v1/v2, fallo de escritura, actualización y clientes incompatibles sin pérdida silenciosa. Documentar límites y política de concurrencia. CES-01 y CES-02 se cierran juntas. |

## Total por establecimiento y cobertura

| ID | Prioridad / estado | Dependencias | Trabajo y aceptación |
| --- | --- | --- | --- |
| TIE-01 | P1 / pendiente | CMP-00 | Definir cadena, sucursal y referencia sin ámbito suficiente. Vínculo explícito entre referencias privadas/públicas, con deshacer y procedencia; no inferir identidad por nombre/localidad. Los precios sin sucursal suficiente siguen anotados pero no completan una cesta física de otra tienda. Probar homónimos, dos sucursales y vínculo erróneo corregido. |
| CES-03 | P1 / pendiente | CES-01, CES-02, TIE-01 | Calcular total por establecimiento con cantidades y observaciones elegibles. Seleccionar la última antes de filtros, no rescatar un precio viejo al excluir una oferta nueva. Ranking solo con cobertura completa; incompletas muestran subtotal y faltantes, nunca cero. Con una sola completa no afirmar ahorro. Misma precisión y política de redondeo en dominio/UI; fuentes, antigüedad y condiciones por línea. |
| DAT-01 | P1 / pendiente; paralela a cesta | CMP-00 | Medir cobertura con lista y zona de prueba declaradas: N productos, fechas, referencias, observaciones elegibles, páginas consultadas y cestas completas. Consulta acotada, sin barrido de bibliotecas ni datos privados enviados. Separar ausencia de dato de fallo de proveedor. Registrar decisión de alcance o fuente antes de prometer cobertura. |
| DAT-02 | P2 / condicionada | DAT-01 | Si la medición justifica uso público offline, diseñar caché persistente separada, acotada, con origen/fecha/caducidad/borrado. No exportarla como anotación privada ni presentar un dato viejo como actual. Probar expiración, red caída, límites y atribución. Hoy la caché pública es solo de memoria. |
| DAT-03 | P2 / condicionada | DAT-01 | Investigar otro proveedor público que cubra una carencia medida. Documentar acceso, licencia/atribución, ámbito, formatos, frecuencia permitida y carga. Adaptador aislado con validación, cancelación, cuotas y pruebas de contrato antes de integrarlo. Sin claves de pago, scraping masivo ni backend contratado. |

## Formatos, alternativas y evidencia

| ID | Prioridad / estado | Dependencias | Trabajo y aceptación |
| --- | --- | --- | --- |
| UNI-01 | P1 / pendiente | CES-03 | Normalizar cantidades conocidas en masa, volumen o unidades compatibles. Probar multipacks, cantidad ausente y unidades incompatibles; conservar precisión sin dividir por cero. Mostrar precio unitario separado del coste de envases enteros, redondeo y cantidad sobrante. |
| ALT-01 | P1 / pendiente | UNI-01 | Grupos de sustitución explícitos y revisables; confirmar cada alternativa y sus cantidades. Declaración sin gluten como criterio opcional, con acceso a trazas/fuente/fecha y exclusión de contradicciones del filtro positivo. No tratar ausencia de información o nombre parecido como equivalencia ni confirmar aptitud propia. |
| GLU-01 | P1 / pendiente; bloqueo antes de beta dirigida | CMP-00 | Revisar con persona experta los cuatro estados, trazas, contradicciones y lenguaje; comprobar comprensión con participantes, registrar hallazgos/correcciones y versión. La preparación técnica de [Validación gluten](VALIDACION_GLUTEN.md) ya está entregada; la revisión externa no. |

## Fiabilidad, beta y publicación

| ID | Prioridad / estado | Dependencias | Trabajo y aceptación |
| --- | --- | --- | --- |
| SEG-01 | P0 / bloqueada para publicación general | CMP-00 | Resolver cadenas de Zod, node-forge y OpenTelemetry con conjunto compatible; no ampliar excepciones ni usar actualizaciones forzadas. Vencimiento actual 22-11-2026. Cierre: secretos y `audit:release` correctos, controles de runtime pertinentes y registro de resolución. [Estado](DEPENDENCIAS.md). No impide desarrollar la cesta local. |
| CAL-01 | P1 / pendiente; incremental | CES-03, UNI-01, ALT-01, DAT-01 | Verificar el recorrido de compra integrado: códigos, cantidades, identidad de tienda, precios, filtros, cobertura y totales contra casos reproducibles y muestra real declarada. Diferenciar precio observado, estimación y ahorro comprobado. Tests de cada tarea se ejecutan antes de cerrar esa tarea; esta dependencia corresponde al cierre integral. |
| CAL-02 | P1 / pendiente; incremental | CES-02, CES-03 | Matriz Android física: cámara/linterna, permisos, segundo plano, offline, texto ampliado, TalkBack, almacenamiento, migración y recuperación. Registrar modelo/SO/commit. Sin fallos críticos. iOS físico/VoiceOver y build nativa obligatorios si se incluye iOS en distribución. |
| MAR-01 | P1 / pendiente de decisión | CMP-00 | Revisar nombre y textos de tienda conforme a compra/precios, conservando Mesa. Presentar propuesta concreta y registrar decisión del propietario y comprobaciones de disponibilidad antes de registro público. SinGluten continúa como nombre de trabajo. No reabrir tres direcciones visuales ya elegidas. |
| REL-01 | P1 / pendiente | CES-03, MAR-01 | Preparar distribución local: firma y custodia fuera de Git, versión/commit, privacidad, licencias/atribución de datos, soporte y mecanismo de detener/corregir entrega. Ensayar recuperación con datos migrados. Elegir canal sin contratar nada por defecto; requisitos de seguridad según alcance en Calidad. |
| BET-01 | P1 / pendiente | CAL-01, CAL-02, GLU-01, REL-01 | Beta controlada propuesta de 5–10 personas; consentimiento, preguntas, muestra, versión y métricas definidos. Observar preparación de cesta, comparación y anotación. Registrar cobertura y comprensión sin recoger historiales identificables por defecto. Corregir bloqueos antes de ampliar. No es evidencia de estabilidad porcentual por sí sola. |
| REL-02 | P1 / pendiente | BET-01, SEG-01 | Publicación controlada: criterios de Calidad cumplidos, controles sobre revisión final, recuperación ensayada y soporte asignado. Revisar protección de rama y flujo de integración. La nube opcional permanece desactivada; no publicar por el simple hecho de hacer push. |

SEG-01 debe revisarse en cada entrega: un hallazgo nuevo que afecte al funcionamiento local puede bloquear también una beta. Su estado actual no autoriza a ignorar un fallo nuevo. Antes de BET-01, registrar esta revisión además de las dependencias de la tabla.

## Evolución condicionada

| ID | Prioridad / estado | Dependencias | Trabajo y condición de salida |
| --- | --- | --- | --- |
| CES-04 | P2 / condicionada | CES-03, BET-01 | Repartir cesta entre tiendas si mejora una compra real. Comparar visitas, cobertura y costes extra aportados; explicar límites y evitar promesas de óptimo global sin todos los datos. |
| FUT-01 | P2 / condicionada | BET-01 | Biblioteca, filtros, avisos de antigüedad y optimización de listas/arranque/APK: solo con problema o perfilado previo y medición antes/después. |
| FUT-02 | P3 / condicionada | DAT-01, BET-01 | Búsqueda externa, alertas, idiomas o mercados: demanda y contrato/cuotas probados antes de comprometer integración. |
| FUT-03 | P3 / fuera de alcance actual | BET-01 | Sincronización/contribuciones propias: solo tras decisión expresa de presupuesto y demanda; aislamiento, abuso, moderación, conflictos, borrado y coste validados. El código Firebase opcional no exige activarlo. |
| FUT-04 | P3 / condicionada | BET-01 | Mapas/OCR/IA: demostrar utilidad frente a complejidad, revisar privacidad y recursos; confirmar textos extraídos y no inferir certificación ni datos de precio inexistentes. |

## Trazabilidad del plan anterior

Los IDs de este backlog tienen prefijos nuevos para evitar reutilizar los del [plan inicial archivado](historico/PLAN_MEJORAS_ANTES_DEL_COMPARADOR.md). Los documentos de iteraciones conservan sus referencias históricas.

| Referencia anterior | Situación y seguimiento vigente |
| --- | --- |
| Pasos 1–2, branding | Mesa ya elegida/aplicada; solo queda MAR-01 para nombre y presentación comercial, más CAL-02 para validación física. |
| Paso 3 / G-01 a G-06 | Implementación técnica disponible; GLU-01 y CAL-02 cierran validación externa y de plataforma. |
| Pasos 4–7 / B-02, R-01 a R-06 | SEG-01, CAL-01/CAL-02, REL-01, BET-01 y REL-02. |
| F-01 y F-04 / P-01 a P-05 | CMP-00 ya disponible; cesta elevada a CES-01/CES-02/CES-03, tiendas TIE-01, cobertura DAT-01 y formatos UNI-01/ALT-01. |
| F-03, importación de copias | Implementada en iteración 7; CES-02 amplía el contrato a cesta. No rehacer importación desde cero. |
| F-02, F-05 y F-06 | FUT-01, condicionadas a evidencia de uso/rendimiento. |
| C-01 a C-05 y P-03 del plan inicial | Nube/contribuciones opcionales, fuera del MVP local; FUT-03. No preceden ni bloquean el comparador. |
| F-07 a F-11 | FUT-02/FUT-03/FUT-04 y DAT-03 según fuente y demanda; sin compromiso de contratación. |

## Regla de cierre

Registrar por tarea: responsable real, commit, criterio cumplido, comprobaciones, límites y fecha. Cambiar el estado solo tras revisar esa evidencia. La próxima entrega técnica concreta es **CES-01 + CES-02**; DAT-01 puede investigarse en paralelo. Este documento no da por comenzada una implementación por haberla planificado.
