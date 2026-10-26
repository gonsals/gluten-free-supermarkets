# Próximos pasos y mejoras futuras

Actualización: **26 de octubre de 2026**, nueva prioridad de comparación de precios en la iteración 8, conservando Mesa, gluten, biblioteca y recuperación local.

Fecha de referencia: **24 de octubre de 2026**. Guía del trabajo pendiente desde el MVP implementado hasta una app profesional y mantenible. El [plan inicial](PLAN_MEJORAS.md) conserva la trazabilidad histórica; esta hoja indica qué hacer ahora.

## Decisiones vigentes

- **Cambio de prioridad del 26-10-2026:** comparación de precios como núcleo y gluten como función adicional. Entrega y nuevo orden de trabajo en [Comparador de precios](COMPARADOR_DE_PRECIOS.md). La cesta completa y las alternativas por unidad pasan a ser las siguientes iteraciones de producto; Open Prices ya aporta una primera fuente pública sin backend contratado.

- **B · Mesa es la dirección elegida por el propietario el 25-10-2026.** Sustituye al branding inicial que no le convencía. La elección autoriza aplicarla a la app; no equivale a validar disponibilidad del nombre, accesibilidad nativa ni publicación en tiendas.
- Mantener la versión local **sin costes de backend**: sin cuenta obligatoria, nube desactivada en todos los perfiles y sin activar Blaze ni contratar servicios para completar este alcance.
- Priorizar comparación por producto/tienda y evolución a cesta económica, manteniendo evidencia de gluten y biblioteca sin conexión. No existen integraciones de precios oficiales ni existencias de supermercados; Open Prices proporciona aportaciones públicas separadas de las anotaciones privadas.
- Mostrar procedencia, incertidumbre y antigüedad de la información sobre gluten. La marca y el diseño tampoco deben sugerir certificación o garantía de aptitud.
- Avanzar con autonomía en documentación, código y comprobaciones. La decisión estética requiere propuestas concretas: la ausencia de comentarios no supone aprobación de una identidad.

## Base disponible y pendientes

| Área | Qué tenemos | Qué falta |
| --- | --- | --- |
| Producto local | Comparación por código y envase, precios privados y públicos separados, supermercado sugerido, gluten adicional, biblioteca, copias y borrado. | Cesta completa, alternativas por unidad y validación durante compras reales. |
| Persistencia | SQLite móvil, IndexedDB web, esquema versionado y límites de datos. | Migraciones con datos anteriores y recuperación en dispositivos físicos. |
| Plataforma | Expo 58, React 19, React Native 0.88; APK Android interna sin necesidad de Metro. | Firma de publicación, dispositivos físicos e iOS nativo si se incluye en el lanzamiento. |
| Calidad | Iteración 8: 144 pruebas de app, 34 de seguridad y veintitrés recorridos web correctos. [Matriz y alcance](COMPARADOR_DE_PRECIOS.md). | Cesta completa, revisión experta, cámara física, accesibilidad asistiva nativa, beta y métricas con muestra declarada. |
| CI | Los cinco jobs del [run de la iteración 7, `ac48ca0`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40219646093) pasaron: secretos, dependencias, Firebase, Android y app. | Revisar protección de rama y mantener controles por cambio. Ese resultado acredita esa revisión, no commits futuros. |
| Seguridad | Clave expuesta revocada, archivos privados excluidos y escaneo de archivos e historial. | Resolver avisos transitivos antes de publicar y mantener controles. |
| Identidad | B · Mesa elegida: tema cálido claro/oscuro, titulares editoriales y recursos propios. | Validación física, comprensión con público objetivo y confirmación del nombre antes de publicar. |
| Nube | Código opcional probado en emuladores; infraestructura Firebase parcialmente configurada. | Fuera del lanzamiento local; no activar cuentas o sincronización como requisito. |

La base está en `gonsals/mejoras`. Una APK interna no equivale a una publicación terminada. Detalle en [Implementación](IMPLEMENTACION.md), [Dependencias](DEPENDENCIAS.md) y [Seguridad de credenciales](SEGURIDAD_CREDENCIALES.md).

## Orden de ejecución

Prioridades relativas al trabajo pendiente: **P0**, bloqueo de lanzamiento; **P1**, necesario para beta; **P2**, mejora posterior a validar; **P3**, exploración sin compromiso de implementación. El orden depende de criterios de salida, no de fechas ficticias.

### Paso 1 · Preparar alternativas de branding

**P1. Completado: propuestas verificadas el 24-10-2026; B · Mesa elegida el 25-10-2026.**

Objetivo: transformar el desacuerdo con el branding actual en opciones evaluables sobre el producto. No se conocen preferencias concretas de color, estilo o nombre: no deben inventarse.

1. Documentar un brief centrado en compra cotidiana, claridad, confianza basada en evidencia y personalidad propia.
2. Preparar tres direcciones distintas: símbolo, paleta, tipografía, composición y tono, con justificación. Mantener SinGluten como nombre de trabajo evita mezclar decisión visual y naming.
3. Aplicarlas al mismo contenido de inicio y ficha, incluidos datos insuficientes y contradicciones.
4. Entregar una comparativa navegable con tema claro/oscuro y adaptación a móvil, utilizable localmente sin servicios externos.
5. Registrar la recomendación del implementador y las decisiones pendientes. Una recomendación no equivale a aprobación del propietario.

Entregables: brief, prototipo comparativo y registro de decisiones. Cierre: tres propuestas concretas revisadas visualmente, interacciones verificadas y contraste inicial comprobado. **No exige elegir todavía la identidad definitiva ni aplicarla a producción.**

Entregados: [brief y decisiones de branding](BRANDING.md) y [comparativa navegable](diseno/propuestas-branding.html). Tinta, Mesa y Pulso muestran inicio, ficha y los cuatro estados, en claro/oscuro. Se han comprobado los controles y la adaptación a 320, 390, 1024 y 1440 píxeles, sin peticiones externas ni desbordamiento horizontal. Verificación visual y de contraste registrada en el brief.

### Paso 2 · Aplicar la dirección visual elegida

**P1. Implementación técnica de B · Mesa entregada el 25-10-2026, con verificación web y compilación Android correctas.** Detalle y evidencia en [Branding Mesa](BRANDING_MESA.md). Las pruebas físicas y con fuentes ampliadas nativas permanecen dentro del paso 5; la confirmación del nombre y registro de tienda, dentro del paso 6.

Crear el sistema de diseño: colores semánticos separados de los de marca, tipografía escalable, espaciados, iconos, botones, campos, avisos y estados. Aplicarlo a inicio, escáner, ficha, biblioteca, precios y ajustes en ambos temas.

Archivos de referencia: `src/shared/theme.ts`, `src/shared/ui.tsx`, `assets/brand/logo.svg`, `scripts/generate-brand.mjs` y `app.json`. Revisar nombre visible, permisos, iconos adaptativos, splash, favicon y ayuda. Comprobar disponibilidad del nombre antes de adoptarlo públicamente y confirmar identificadores antes de registrarlos.

Cierre: dirección elegida registrada, recursos regenerables y pantallas coherentes con textos largos, tamaños pequeños y fuente ampliada. Conservar reglas del dominio y datos locales durante el rediseño.

### Paso 3 · Validar lenguaje y reglas sobre gluten

**P0 antes de una beta dirigida al público objetivo. Puede avanzar en paralelo al diseño.**

Preparación técnica de la iteración 3 entregada: guía offline, procedencia y fecha junto al resultado, trazas destacadas, campos ausentes y doce casos reproducibles. [Protocolo y evidencia](VALIDACION_GLUTEN.md). **La revisión experta y las sesiones con personas usuarias siguen pendientes; el paso 3 no se considera cerrado.**

Revisar [Producto](PRODUCTO.md) con una persona experta en el dominio y comprobar comprensión con personas usuarias. Preparar casos reproducibles: declaración sin gluten, gluten declarado, datos ausentes, trazas, contradicciones y ficha antigua.

Cierre: revisión registrada, correcciones aplicadas y personas usuarias capaces de distinguir una declaración de la fuente de una certificación propia. Las pruebas automáticas no sustituyen esta revisión.

### Paso 4 · Resolver bloqueos de seguridad de publicación

**P0 para publicación general. Próxima revisión de excepciones: 22 de noviembre de 2026.**

Revisar las cadenas transitivas de Zod, node-forge y OpenTelemetry descritas en [Dependencias](DEPENDENCIAS.md). Actualizar consumidores cuando exista un conjunto compatible. La base del 24 de octubre conserva ocho entradas afectadas en herramientas de app y ninguna en `functions/`; es un resultado fechado.

**Revisión del 25-10-2026 realizada en la iteración 4:** los consumidores siguen sin aportar una solución compatible y el informe mantiene ocho entradas de app y cero de servidor. Se ha reforzado la validación del control de auditoría y añadido 34 pruebas de seguridad a `npm run check`. `audit:release` continúa fallando como debe. No se amplían excepciones ni se da por cerrado este paso; [pruebas y límites](PRUEBAS_ITERACION_4.md).

Cierre: `npm run secrets:check` y `npm run audit:release` pasan, además de las comprobaciones funcionales apropiadas. `audit:security` admite excepciones exactas y temporales: que pase no desbloquea la publicación. Si no hay solución compatible, mantener el bloqueo documentado; no ocultar hallazgos ni ampliar excepciones para simular un resultado limpio.

### Paso 5 · Verificar dispositivos, accesibilidad y datos

**P1 para beta; cualquier fallo crítico del recorrido bloquea su distribución.**

Probar al menos un Android de recursos modestos y otro representativo del público, registrando modelo, sistema, versión y resultado. Incluir cámara con envases reales, luz baja, linterna, permisos denegados/bloqueados, segundo plano, lectura repetida y entrada manual.

**Avance técnico de la iteración 5:** corregidos diálogos que dejaban sus botones fuera de la ventana con texto ampliado, títulos y estados accesibles, bloqueo de cierre durante el borrado y etiquetas de navegación truncadas. Doce recorridos web, 75 pruebas de app y 34 de seguridad. [Matriz de accesibilidad y datos](ACCESIBILIDAD_Y_DATOS.md). Las pruebas físicas, con lectores de pantalla y con personas usuarias siguen pendientes; el paso no se considera cerrado.

**Avance técnico de la iteración 6:** ciclo de cámara separado de las consultas, errores de permisos tratados, respuestas tardías descartadas al salir y linterna/cámara desactivadas al interrumpir una sesión. Trece casos nuevos de ciclo y tres recorridos web nuevos; [escáner, pruebas y límites](ESCANER_Y_PERMISOS.md). No se da por validada la lectura física por probar permisos en un emulador.

Completar red lenta/sin red, producto inexistente, favoritos y precios tras reiniciar, actualización de fichas, exportación, borrado y migración. Revisar TalkBack, fuente ampliada, contraste y controles táctiles. Mantener fuente y fecha visibles en datos guardados.

**Avance técnico de la iteración 7:** recuperación de copias JSON mediante resumen y sustitución transaccional, con validación de formato, tamaño, códigos, referencias y evidencia. Mantiene las fechas originales y marca las fichas restauradas. [Contrato, pruebas y límites](COPIAS_LOCALES.md). La fusión selectiva no está implementada; la política de conflictos es sustituir toda la biblioteca tras confirmación explícita.

Cierre: matriz con evidencia, sin bloqueos del recorrido y resto de incidencias priorizadas. Si se ofrece iOS, añadir compilación nativa, dispositivo físico y VoiceOver antes de declararlo compatible. La exportación JavaScript no sustituye esas pruebas.

### Paso 6 · Preparar distribución y beta local

**P1. Dependencias: diseño aplicado y validaciones críticas anteriores.**

Crear una build nueva desde el commit elegido, nube desactivada y configuración pública mínima. La APK disponible usa firma de desarrollo: preparar la firma de publicación, su custodia y recuperación fuera de Git. Registrar versión, notas y canal de distribución.

Revisar privacidad, atribución, soporte y ayuda según el comportamiento real. Registrar cualquier coste de distribución antes de elegir canal: backend gratuito no implica cuentas de tiendas gratuitas. No contratar servicios ni activar facturación como parte de esta preparación.

Propuesta de beta inicial: 5–10 personas, con consentimiento para recoger comentarios y sin pedir historiales de compra. Medir sesiones observadas, problemas, comprensión y utilidad. Son metas propuestas, no una beta realizada.

Cierre: paquete identificable, instrucciones breves, soporte y feedback registrado. Revisar las metas de respuesta y estabilidad de [Producto](PRODUCTO.md) con muestra suficiente; no deducir porcentajes de fiabilidad de unas pocas sesiones.

### Paso 7 · Publicar de forma controlada y mantener

**P1 tras cerrar la beta.**

Revisar e integrar la rama mediante el flujo de Git acordado, con comprobaciones correctas sobre la revisión a integrar. Comprobar protección de rama: un workflow no la activa por sí solo.

Preparar checklist, versión etiquetada, notas y procedimiento ensayado para detener distribución y entregar una corrección. Verificar compatibilidad de datos antes de recomendar una reinstalación o retroceso de versión.

Cierre: criterios de [Calidad y operación](CALIDAD_Y_OPERACION.md) aplicables a la versión local cumplidos, responsable de soporte y mantenimiento definidos. La nube fuera de alcance permanece desactivada.

## Mejoras futuras después de validar el núcleo

| ID / prioridad | Mejora | Qué justifica construirla | Criterio de entrega |
| --- | --- | --- | --- |
| F-01 / P1 tras cambio de foco | Cesta local desde productos y favoritos. | Nueva prioridad de compra económica del propietario. | Persistencia y copias, cantidades y comparación de totales por sucursal con faltantes explícitos. |
| F-02 / P2 | Filtros y organización de biblioteca. | La búsqueda actual resulta insuficiente con datos reales. | Filtros comprensibles y rendimiento medido cerca de los límites actuales. |
| F-03 / P2 | Importación de copias locales. | Recuperación o cambio de teléfono sin nube. | Implementada técnicamente en la iteración 7: formato versionado, validación y límites, resumen, sustitución completa y transacción. [Evidencia](COPIAS_LOCALES.md); validación física y con personas usuarias pendiente. |
| F-04 / P1 tras cambio de foco | Comparación de precios y cesta económica. | Prioridad explícita del propietario el 26-10-2026. | Iteración 8: comparador por producto y fuente pública. Siguiente: total por cesta con cobertura y alternativas por unidad; sin prometer stock. |
| F-05 / P2 | Avisos locales de antigüedad de fichas. | Confusión observada entre dato guardado y actualizado. | Umbral explicado y refresco voluntario respetando red y límites del proveedor. |
| F-06 / P2 | Optimizar arranque, listas y tamaño de Android. | Un perfilado detecta cuellos de botella. | Medición antes/después con mismo equipo y datos, sin degradar accesibilidad u offline. |
| F-07 / P3 | Búsqueda externa por nombre o categoría. | Demanda y contrato/cuotas del proveedor revisados. | Cancelación, paginación y límites; sin consultas masivas ni fuentes ficticias. |
| F-08 / P3 | Otros idiomas y mercados. | Uso demostrado fuera del público inicial. | Textos, formatos y evidencia revisados por idioma. |
| F-09 / P3 | Sincronización opcional entre dispositivos. | Demanda y presupuesto explícitamente aprobados. | Aislamiento, conflictos, borrado, abuso y costes probados. Fuera de la decisión actual de no contratar backend. |
| F-10 / P3 | Precios compartidos, supermercados y mapas. | Fuente legítima, cobertura y operación viables. | Sucursal, procedencia, fecha y moderación; disponibilidad solo con fuente que la acredite. |
| F-11 / P3 | Extraer ingredientes desde una foto. | Beneficio demostrado frente a errores, privacidad y coste. | Confirmación del texto extraído y límites visibles; OCR o IA no certifican aptitud. |

## Escalabilidad sin infraestructura prematura

Mantener límites explícitos, migraciones comprobadas, contratos claros y proveedores desacoplados. La versión local no necesita un servidor compartido por cada persona; el proveedor externo de productos sí tiene límites que deben respetarse.

Conservar los repositorios y adaptadores para poder cambiar almacenamiento o fuente sin reescribir pantallas. Medir antes de añadir caché compartida, colas, búsqueda alojada o telemetría externa. Su inclusión como opción futura no autoriza contratarlos.

## Mantenimiento y seguimiento

| Momento | Trabajo | Evidencia |
| --- | --- | --- |
| Cada cambio | Tipos, lint, pruebas relevantes y secretos en CI. | Resultado asociado al commit. |
| Semanal | Dependabot y avisos de seguridad. | Actualizaciones compatibles revisadas; cambios de runtime con validación nativa. |
| Antes del 22-11-2026 | Excepciones de auditoría vigentes. | Resolución o revisión explícita, sin renovación automática. |
| Cada versión | Dispositivos, textos, privacidad, firma y recuperación. | Checklist y notas con limitaciones reales. |
| Tras beta | Feedback, métricas y prioridades. | Decisiones con muestra y versión declaradas. |

Cada tarea necesita ID, responsable, estado, dependencia, criterio y evidencia. Estados: pendiente, en curso, pendiente de decisión, bloqueada o verificada. Responsable técnico: quien ejecute el cambio; aprobación de marca: propietario; revisión de dominio: persona experta por designar. No registrar revisiones externas como realizadas ni asignar fechas sin disponibilidad.

## Registro de decisiones

| Fecha | Decisión / evidencia | Estado |
| --- | --- | --- |
| 24-10-2026 | Mantener versión local y perfiles con nube desactivada. | Vigente. |
| 24-10-2026 | Clave antigua revocada y CI de la base `f2f5c42` correcta. | Verificado, ver documentos enlazados. |
| 24-10-2026 | Al propietario no le encanta el branding generado. | **Identidad provisional y no aprobada; rediseño prioritario.** |
| 24-10-2026 | Tres direcciones entregadas: Tinta, Mesa y Pulso, con comparativa local verificada. | Paso 1 ejecutado; paso 2 pendiente de elección de dirección. Ninguna identidad aprobada todavía. |
| 25-10-2026 | El propietario elige B · Mesa e indica continuar el desarrollo. | Elección registrada; paso 2 autorizado. La decisión posterior sustituye la falta de aprobación del día 24. |
| 25-10-2026 | Mesa aplicada a la app, recursos regenerados, pruebas web y APK universal correctas. | Implementación técnica del paso 2 entregada; validaciones externas y publicación pendientes según los pasos siguientes. |
| 25-10-2026 | Iteración 3: claridad del resultado, guía offline, validación de jerarquía y catálogo de revisión. | Preparación técnica del paso 3 entregada; aprobación externa pendiente. |
