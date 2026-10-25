# Producto y experiencia de uso

**Especificación de producto**, 2026-10-23. Conserva los objetivos definidos antes de implementar. Las funciones ya entregadas y las validaciones pendientes están en [Implementación](IMPLEMENTACION.md); [Estado actual](ESTADO_ACTUAL.md) es la auditoría histórica del prototipo.

## 1. Visión y alcance

Ayudar a comprar alimentos consultando, de forma rápida y comprensible, la información disponible sobre gluten de un producto identificado por su código de barras.

La propuesta inicial es centrarse en España y en español, por el contexto del proyecto; mercado y público concretos quedan pendientes de validación. Android e iOS son los objetivos móviles propuestos. La web sirve inicialmente como apoyo, con entrada manual como alternativa si no dispone de lectura de códigos compatible.

La primera versión profesional debe resolver bien una tarea: **consultar un producto, entender la evidencia y recuperar la consulta después**. La comparación de precios se plantea como una segunda etapa, apoyada por los servicios incipientes del repositorio.

No debe presentar una etiqueta de una base de datos como certificación propia ni convertir información ausente en una conclusión sobre la composición. La experiencia debe explicar la fuente y permitir consultar el envase y los datos originales.

## 2. Alcance del MVP propuesto

| Capacidad | Resultado esperado |
| --- | --- |
| Escanear | Una lectura válida inicia una única consulta; cámara y linterna funcionan en los dispositivos soportados. |
| Introducir código | Consultar sin cámara o con etiqueta dañada; validar formato sin perder ceros iniciales. |
| Entender el resultado | Nombre, marca, imagen opcional, señales sobre gluten, ingredientes/alérgenos/trazas disponibles, fuente y fecha de consulta. |
| Recuperarse de errores | Distinguir código inválido, producto inexistente, sin red, timeout y fallo del proveedor. Reintentar o cambiar de producto. |
| Consultar historial | Recuperar consultas locales tras reiniciar; buscar por nombre o código y borrar el historial. |
| Favoritos | Marcar, desmarcar y consultar productos guardados localmente. |
| Usar datos guardados sin conexión | Mostrar una ficha previamente consultada con fecha y estado de actualización visibles. |
| Acceder de forma inclusiva | Español consistente, lector de pantalla, contraste, tipografía escalable y tamaños táctiles adecuados. |
| Confiar en el servicio | Información de origen, atribución, privacidad y canal para comunicar errores. |

Fuera del MVP: comparador de precios, colaboración pública, mapas, alertas de ofertas, recomendaciones personalizadas, extracción de ingredientes mediante IA y cuentas obligatorias. Las cuentas solo se justifican cuando exista sincronización u otra función que las necesite.

## 3. Pantallas y recorridos

### Inicio

Explicar la finalidad en una frase y ofrecer «Escanear producto» e «Introducir código». Mostrar accesos a favoritos y consultas recientes, con un estado vacío útil. Sustituir Lorem ipsum e imágenes de plantilla por contenido e identidad propios.

### Escáner

Mostrar por qué se pide acceso a la cámara antes o junto al permiso del sistema. Contemplar permiso pendiente, concedido, denegado y bloqueado. Si está bloqueado, ofrecer ajustes del dispositivo cuando proceda y entrada manual.

Mantener controles de linterna y entrada manual accesibles. Desactivar captura al perder foco, al pasar a segundo plano y cuando corresponda durante la presentación del resultado. No bloquear cada escaneo con un aviso modal del navegador.

El rectángulo visual debe ser una ayuda de encuadre honesta: si no se aplica una región de detección real, no prometer que solo se leen códigos dentro de él.

### Ficha del producto

Cabecera con nombre, marca, código e imagen opcional. Resumen de la información sobre gluten seguido de su explicación y evidencias. Ingredientes, alérgenos y trazas disponibles en secciones legibles, sin ocultar contradicciones.

Mostrar «Datos de Open Food Facts», enlace al producto y fecha de última consulta. Si se conoce la fecha de modificación de la fuente, mostrarla por separado: no equivale a fecha de verificación del producto. Incluir favorito, volver a escanear y comunicar un problema con los datos.

Si no hay nombre o imagen, mantener una ficha utilizable. Si no hay datos suficientes, mostrar qué falta. El panel debe poder desplazarse con textos largos y fuentes ampliadas.

### Historial y favoritos

Listas con nombre, marca, resumen informativo y fecha. Consulta local paginada, detalle accesible y eliminación sencilla. Diferenciar limpiar historial de eliminar favoritos. No sobrescribir el contexto de una consulta antigua al actualizar el catálogo: indicar cuándo la ficha mostrada es más reciente.

### Información y ajustes

Privacidad, atribución, versión de la app, permisos, gestión del almacenamiento y ayuda. Si se incorpora sincronización: estado de sincronización, cerrar sesión, exportar y eliminar datos de la cuenta.

## 4. Política de información sobre gluten

Esta política es una especificación funcional propuesta. Debe validarse con personas usuarias y revisión experta antes de publicar afirmaciones destinadas a población celíaca. Las etiquetas de interfaz describen datos de origen; no deben sugerir una evaluación clínica propia.

### Estados principales

| Estado interno propuesto | Texto de referencia | Condición |
| --- | --- | --- |
| `declared_gluten_free` | «Figura como sin gluten en la fuente» | Declaración reconocida por la taxonomía, sin evidencia explícita contradictoria detectada. |
| `declared_gluten` | «La fuente declara gluten» | Declaración explícita de gluten en los datos interpretados. |
| `unknown` | «Información insuficiente» | Faltan datos o no hay evidencia que sustente los otros estados. |
| `conflicting` | «Datos contradictorios: revisa el etiquetado» | Coexisten declaraciones incompatibles o la respuesta presenta inconsistencias relevantes. |

Las **trazas se conservan como una señal adicional**, visible incluso si existe una declaración sin gluten. Por sí solas no se convierten en una conclusión binaria ni se descartan. Un resultado sin declaración concluyente pero con trazas debe destacarlas claramente.

### Reglas de interpretación

1. Preservar campos originales relevantes y distinguir ausente, vacío y valor conocido cuando el contrato lo permita.
2. Normalizar etiquetas mediante un adaptador versionado. `en:no-gluten` es la entrada canónica observada; tratar variantes heredadas explícitamente cuando estén acreditadas, sin comparar textos libres de forma indiscriminada. Fuente: [taxonomía oficial](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/labels.txt).
3. Considerar etiquetas, alérgenos y trazas como señales diferentes. No inferir automáticamente que un producto sin alérgenos declarados es sin gluten.
4. Dar prioridad a mostrar contradicciones sobre una presentación positiva. Una declaración sin gluten junto con gluten declarado no debe producir una tarjeta verde sin explicación.
5. Mostrar ingredientes como evidencia de la fuente. La interpretación automática de cereales, derivados y tratamientos requiere reglas revisadas; una búsqueda de palabras no basta para certificar aptitud.
6. La falta de ingredientes, etiquetas o alérgenos nunca equivale a una declaración de ausencia.
7. La antigüedad es una dimensión aparte. Un dato guardado no se presenta como recién verificado ni como seguro por haber sido un favorito.
8. La valoración calculada debe almacenar versión de reglas y motivos, para poder reproducirse y actualizarse.

### Casos de aceptación mínimos

| Entrada | Comportamiento esperado |
| --- | --- |
| Etiquetas ausentes, resto de datos ausente | Información insuficiente; sin excepción y sin «contiene gluten» inventado. |
| Declaración reconocida sin gluten | Mostrar declaración atribuida a la fuente y sus evidencias. |
| Gluten declarado sin declaración sin gluten | Mostrar presencia declarada y campo de origen. |
| Declaración sin gluten y declaración explícita de gluten | Estado contradictorio, sin ocultar ninguna evidencia. |
| Solo trazas declaradas | Información insuficiente con aviso de trazas visible. |
| Declaración sin gluten y trazas | Conservar ambos datos; mostrar trazas junto a la declaración. |
| Alérgenos en texto libre no reconocible | Preservar texto; no convertirlo en una ausencia confirmada. |
| Datos guardados antiguos o sin red | Mostrar fecha y condición de dato guardado; permitir actualizar cuando haya red. |

## 5. Segunda etapa: precios y supermercados

La utilidad propuesta sería responder «¿dónde se ha observado este producto y a qué precio?». Un precio observado no acredita disponibilidad actual.

Cada observación necesita producto, sucursal o ámbito de la cadena, importe, moneda, cantidad/envase, fecha de observación, fecha de recepción y procedencia. Las ofertas requieren condiciones y vencimiento. Comparar el mismo código y formato; el precio por unidad necesita cantidades y unidades compatibles.

Mostrar antigüedad y ámbito geográfico. No mezclar una observación de una sucursal con un precio nacional. La colaboración pública necesita autenticación, validación, control de abuso y moderación antes de activarse.

No se ha demostrado acceso a catálogos, stock ni precios oficiales de supermercados. Esas integraciones deberán estudiarse y acordarse; no forman parte de lo implementado.

## 6. Objetivos de calidad propuestos

Son metas iniciales para medir en beta, no resultados actuales ni compromisos validados con el proveedor.

| Área | Meta inicial |
| --- | --- |
| Claridad | Todos los resultados muestran fuente, motivo y estado de información; ningún dato ausente se transforma en Sí/No. |
| Respuesta | p95 inferior a 3 s con caché o red de referencia; separar tiempo de detección, consulta y renderizado. |
| Recuperación | Timeout visible, objetivo inicial de 8 s por intento; límite de reintentos y cancelación al cambiar de producto. |
| Estabilidad | Objetivo de al menos 99,5 % de sesiones sin cierre inesperado en beta, con muestra y versión registradas. |
| Accesibilidad | Flujos principales comprobados con VoiceOver/TalkBack y fuente ampliada; información nunca basada solo en color. |
| Sin conexión | Historial y favoritos consultables tras reinicio sin red; fecha visible y actualización sin perder contenido. |
| Privacidad | Consulta e historial local sin cuenta; analítica no incluye el historial de compra identificable. |

Antes de ampliar alcance: validar con pruebas de uso si las personas entienden «información insuficiente», si distinguen fuente y certificación, y si el historial resuelve una necesidad real.

## 7. Decisiones pendientes

- Público prioritario y validación experta del lenguaje sobre gluten.
- Mercado inicial, nombre definitivo, dispositivos soportados y papel de la versión web. La dirección visual B · Mesa fue elegida por el propietario el 25-10-2026; ver [sistema aplicado](BRANDING_MESA.md).
- Reglas definitivas, taxonomías admitidas y revisión de contradicciones.
- Tiempo de refresco y retención del historial; valores iniciales propuestos en arquitectura.
- Presupuesto operativo, responsables de soporte y cadencia de publicación.
- Si los precios son realmente una prioridad tras validar el escáner.

Estas decisiones no impiden estabilizar el código ni implementar manejo de errores y pruebas.
