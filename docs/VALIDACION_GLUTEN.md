# Validación del lenguaje y la evidencia sobre gluten

> **Planificación actualizada 26-10-2026.** Preparación técnica del paso 3 del plan anterior. Gluten es ahora complementario; GLU-01 mantiene pendiente la revisión experta y de comprensión. [Hoja de ruta vigente](HOJA_DE_RUTA.md) · [Backlog](PLAN_MEJORAS.md).

Iteración 3, **25 de octubre de 2026**. Corresponde a la preparación técnica del paso 3 de la [hoja de ruta anterior](historico/HOJA_DE_RUTA_ANTES_DEL_COMPARADOR.md). **La revisión experta y las pruebas de comprensión con personas usuarias siguen pendientes.** Las pruebas automáticas de este documento verifican el contrato del software; no acreditan aptitud clínica ni certifican alimentos.

## Mejoras entregadas

- Fuente, condición de ficha guardada y fecha de consulta junto al resumen del producto, antes del detalle extenso de ingredientes.
- Aviso de trazas inmediatamente después del resumen, antes de los datos ausentes y las acciones.
- Lista explícita de información no disponible. Un campo vacío no se presenta como ausencia del ingrediente o alérgeno.
- Sección de trazas dentro de las evidencias, diferenciando datos ausentes de una declaración de ninguna en la fuente.
- Guía local de los cuatro estados, trazas y fechas. Accesible desde la ficha y Ajustes, con recorrido sin conexión probado.
- Corrección técnica: `labels_hierarchy` ahora se valida igual que los demás campos de etiquetas. Antes, un valor con formato incorrecto podía descartarse mientras otra etiqueta producía un resultado positivo. Ahora se conserva la señal de formato incorrecto y se aplica el tratamiento de inconsistencias ya existente.
- Ingredientes en español y etiquetas obtenidas de una jerarquía válida dejan de figurar como campos ausentes en los metadatos de normalización.

La lista de declaraciones interpretadas y la política de trazas no se amplían. El clasificador mantiene `RULES_VERSION = 1.0.0`; se corrige la validación de su entrada. No se añaden inferencias sobre cereales o derivados a partir de texto libre.

Las fichas antiguas contienen datos normalizados, no la respuesta original completa. La corrección del formato de la jerarquía se aplica al recibir una respuesta nueva: no puede reconstruir elementos que un normalizador anterior descartó. Las fichas guardadas conservan fuente y fecha, y pueden refrescarse con Actualizar información; las consultas también renuevan la caché cuando supera su plazo vigente. La presentación de evidencias usa el contenido conservado y no depende de indicadores antiguos de campos ausentes.

## Casos reproducibles

Datos sintéticos: [catálogo de casos](../tests/review/product-cases.ts). Ejecución automática: [contrato de revisión](../src/domain/__tests__/review.test.ts). No se utilizan productos comerciales como prueba de seguridad alimentaria.

| ID | Situación | Resultado técnico esperado | Punto que debe validar la revisión externa |
| --- | --- | --- | --- |
| G-01 | No hay datos. | Información insuficiente. | Se entiende que no equivale a «contiene» ni «sin gluten». |
| G-02 | Declaración sin gluten reconocida. | Figura como sin gluten, atribuida a la fuente. | No se interpreta como certificación de la app. |
| G-03 | Gluten explícito. | Gluten declarado. | Se entiende la procedencia del dato. |
| G-04 | Declaraciones incompatibles. | Datos contradictorios. | La contradicción se detecta sin ocultar evidencias. |
| G-05 | Solo trazas declaradas. | Información insuficiente y aviso de trazas. | La señal adicional resulta comprensible. |
| G-06 | Declaración sin gluten y trazas. | Se conservan ambos datos y el aviso. | El diseño no lleva a ignorar las trazas. |
| G-07 | Alérgenos con formato incorrecto junto a una etiqueta positiva. | Inconsistencia visible; resultado contradictorio. | Se distingue un problema de datos de una conclusión sobre el alimento. |
| G-08 | Jerarquía de etiquetas con formato incorrecto. | Mismo tratamiento de inconsistencias. | El lenguaje explica el error sin inducir una falsa certeza. |
| G-09 | Ingredientes en español y jerarquía válida. | Se conserva la evidencia y no se indica que falta. | Terminología y presentación adecuadas al público objetivo. |
| G-10 | Texto de alérgenos sin taxonomía reconocida. | Texto conservado; no se inventa una clasificación. | Es visible que la interpretación es limitada. |
| G-11 | La fuente declara ninguna traza, sin otra declaración. | Se muestra esa declaración; estado insuficiente. | No se confunde con una garantía de ausencia verificada. |
| G-12 | Ficha guardada desde 2024. | Conserva su declaración y su fecha antigua. | Se distingue guardado de verificado o actualizado. |

Para repetir únicamente el catálogo:

```bash
npm test -- --runTestsByPath src/domain/__tests__/review.test.ts
```

Para el conjunto de app y navegador:

```bash
npm run check
npm run test:e2e
```

El segundo comando necesita la exportación actualizada si ya existe un servidor local reutilizable; generar antes `npm run export:web`. En CI el servidor de pruebas realiza la exportación automáticamente.

## Protocolo de revisión experta

1. Registrar persona revisora, ámbito de conocimiento, fecha, versión de reglas y commit evaluado. Revisar los textos reales de la ficha, guía y ayuda, además de la tabla anterior.
2. Recorrer los doce casos y anotar por separado corrección de la regla, claridad de su explicación y prioridad de cada incidencia.
3. Revisar las etiquetas reconocidas y su procedencia; evaluar expresamente cómo presentar cereales, derivados, avena y declaraciones que coexisten con otros alérgenos. Estos asuntos permanecen abiertos y no reciben nuevas conclusiones automáticas en esta iteración.
4. Decidir si los fallos de formato deben conservar la denominación «datos contradictorios» o diferenciarse de las contradicciones de contenido. El software actual conserva el tratamiento previo; la ampliación de validación hace más visible esta decisión pendiente.
5. Registrar cambios solicitados, responsable de aplicarlos y evidencia de la nueva revisión. Cualquier cambio de reglas necesita versión, regresiones y revisión de la caché.

Material de referencia consultado el 25-10-2026: [documentación oficial de la API de Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) y [taxonomía oficial de etiquetas](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/labels.txt). Documentan el proveedor y sus etiquetas; no sustituyen la revisión experta del lenguaje ni la comprobación del envase.

## Protocolo de comprensión con personas usuarias

Usar exclusivamente ejemplos ficticios y registrar versión, tema, tamaño de texto y dispositivo. Propuesta inicial: 5–10 participantes; no constituye una muestra suficiente para certificar seguridad o fiabilidad estadística.

Mostrar los casos sin explicar previamente su resultado y preguntar:

- ¿Qué información ofrece la ficha y de dónde procede?
- ¿Qué diferencia hay entre una etiqueta de la fuente y una certificación de esta app?
- ¿Qué entiendes cuando faltan datos? ¿Y si aparecen trazas junto a una declaración sin gluten?
- ¿La fecha corresponde a la consulta o a una verificación del producto?
- ¿Dónde buscarías los ingredientes, las trazas y los datos originales?

Registrar respuestas anonimizadas, dudas y errores de interpretación. No pedir datos de salud, correos ni historiales de compra para esta revisión. Una confusión sobre ausencia de información, certificación o trazas debe quedar como incidencia de lanzamiento hasta revisarse y corregirse.

## Registro de aprobación

| Área | Responsable | Estado / evidencia |
| --- | --- | --- |
| Contrato técnico y recorrido | Implementación del proyecto. | 73 pruebas de app y siete recorridos web correctos en esta iteración. |
| Lenguaje y reglas del dominio | Persona experta por designar. | **Pendiente. Sin aprobación registrada.** |
| Comprensión con personas usuarias | Responsable de beta por designar. | **Pendiente. No se ha realizado la sesión.** |
| Cámara y accesibilidad nativa | Responsable de pruebas de dispositivos. | Pendiente dentro del paso 5. |
| Publicación dirigida al público objetivo | Responsable de producto. | Condicionada a cerrar estas validaciones y los demás criterios de lanzamiento. |

No registrar las revisiones externas como completadas porque los tests pasen. La firma de desarrollo de una APK tampoco es una aprobación de publicación.

## Verificación y artefactos de la iteración

Tipos, ESLint y compatibilidad Expo correctos. Los 73 tests incluyen doce casos de revisión y regresiones del formato de jerarquías, datos localizados y evidencias ausentes. Los siete recorridos web verifican también la guía sin conexión y el rechazo de una jerarquía malformada como resultado positivo.

Revisión visual de la guía en claro/oscuro a 320, 390 y 1024 píxeles, sin errores JavaScript ni desbordamiento horizontal en esa matriz. Se confirmó el aviso de trazas anterior a los metadatos en la ficha. Capturas versionadas de [guía clara](diseno/iteracion-3-guia.png) y [ficha oscura](diseno/iteracion-3-ficha.png); los demás informes permanecen en `artifacts/iteration-3/`, excluidos de Git. El contenido de ejemplo es ficticio.

APK incremental **compilada correctamente** desde el proyecto nativo ya generado: esta iteración solo modifica código de app y pruebas, sin cambios en configuración nativa, plugins, paquetes ni lockfiles. La comprobación de esos archivos precedió a `:app:assembleRelease`. La compilación final tardó 1 min 3 s, con 579 tareas (37 ejecutadas y 542 actualizadas). Se comprobó la ruta de la guía dentro del bundle y la coincidencia del checksum; no se detectaron archivos `.env` ni patrones de clave Google en el paquete. Gitleaks de archivos publicables e historial también correcto, con la excepción histórica exacta de la clave revocada.

Archivo local ignorado por Git: `artifacts/singluten-iteration-3-preview-universal.apk`, **71.358.559 bytes**, ARM64/x86_64, sin Metro, nube desactivada y firma de desarrollo para pruebas internas. Manifiesto JSON junto al archivo. SHA-256:

```text
49087d296ef6f549449ebf3e532bbcd1891cb68dc26b045e03b3fa4a3628e282
```

La compilación y los controles por patrones no acreditan una auditoría completa de binario ni pruebas físicas o iOS nativo. La APK anterior de Mesa se conserva separada con el nombre y checksum registrados en su documento.
