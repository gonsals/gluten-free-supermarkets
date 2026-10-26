# Revisión de branding · Paso 1

> **Planificación actualizada 26-10-2026.** Evidencia histórica de exploración (paso 1 del plan anterior). Mesa ya fue elegida; el seguimiento vigente es MAR-01 para naming y CAL-02 para validación física. [Hoja de ruta vigente](HOJA_DE_RUTA.md) · [Backlog](PLAN_MEJORAS.md).

**Actualización 25-10-2026: el propietario ha elegido B · Mesa y autorizado su aplicación.** Ver [sistema aplicado](BRANDING_MESA.md). El brief y las comprobaciones siguientes documentan la exploración del día 24.

Fecha: **24 de octubre de 2026**. Entregable de la [hoja de ruta anterior](historico/HOJA_DE_RUTA_ANTES_DEL_COMPARADOR.md), paso 1. El propietario ha indicado que **no le encanta el branding generado**. La identidad actual queda provisional y no aprobada; no se interpreta su implementación técnica como aceptación estética.

## Brief

La app ayuda a consultar información sobre gluten durante la compra y a recuperar productos guardados. Debe sentirse clara, útil y cuidada, tanto ante un resultado conocido como ante información incompleta. La confianza debe provenir de la explicación y de la fuente, no de una apariencia de certificación.

Hay que explorar personalidad, símbolo, color, composición, tipografía e iconos. No se han comunicado preferencias concretas de estilo: ninguna se atribuye al propietario. El verde y la hoja actuales no se toman como requisito. **SinGluten se mantiene solo como nombre de trabajo**; no se ha validado su disponibilidad ni se propone registrarlo todavía.

## Comparativa visual

Abrir [propuestas-branding.html](diseno/propuestas-branding.html) en un navegador. Es un archivo autocontenido que funciona sin servidor, recursos externos, cuenta ni servicios de pago. En Windows puede abrirse desde el repositorio con:

```powershell
Start-Process .\docs\diseno\propuestas-branding.html
```

Permite comparar las tres direcciones con el mismo contenido; alternar inicio, ficha y estados; cambiar tema; y mostrar las cuatro clases de resultado. Los botones dentro de las maquetas simulan abrir la ficha y marcar un favorito. No activan la cámara, no consultan Open Food Facts ni guardan datos. Las fichas están identificadas como ficticias.

| Dirección | Personalidad y sistema | Colores principales claros | Qué aporta / qué comprobar |
| --- | --- | --- | --- |
| **A · Tinta** | Digital y serena; sans de sistema; símbolo de encuadre y lectura. | Azul `#233FBA`, fondo `#F7F8FC`, superficie suave `#E9EDFB`. | Jerarquía directa y marca discreta. Comprobar que tenga suficiente personalidad frente a una app genérica. |
| **B · Mesa** | Editorial y cercana; Georgia en titulares y sans en lectura; M abierta como símbolo exploratorio. | Terracota `#A43F28`, papel `#FCF8F0`, arena `#F3E5D4`. | Calidez y cercanía con la compra cotidiana. Comprobar legibilidad de titulares y si el símbolo aporta identidad al nombre final. |
| **C · Pulso** | Gráfica y expresiva; sans de peso alto, formas más rectas y barras en movimiento. | Grafito `#232724`, lima `#D5ED57`, fondo `#F4F6EF`. | Mayor presencia visual. Comprobar que el acento no compita con avisos y evidencias. |

Los nombres Tinta, Mesa y Pulso identifican direcciones de diseño, no nombres nuevos aprobados para la aplicación. Los símbolos son SVG realizados para esta exploración; no son sellos de certificación. Las tipografías de sistema permiten una revisión local sin descargas; su apariencia exacta varía entre sistemas y debe concretarse para la implementación nativa final.

## Qué se conserva entre propuestas

- Información insuficiente, contradicciones, gluten declarado y declaración sin gluten con textos e iconos explícitos.
- Colores semánticos independientes de los acentos de marca; una combinación decorativa no altera la interpretación del producto.
- Fuente y fecha visibles, sin presentar el dato como una evaluación propia.
- Acceso local sin cuenta y biblioteca sin conexión.
- Mismos contenidos y controles para poder comparar decisiones visuales.

## Recomendación inicial del 24-10-2026

**A · Tinta como punto de partida**, por la prioridad de lectura durante una compra y su jerarquía directa. Es una recomendación del implementador, no una preferencia inferida del propietario ni un resultado de pruebas de uso. Mesa es la alternativa si se busca más calidez; Pulso si se quiere una presencia gráfica más marcada.

El 25-10-2026 el propietario eligió **B · Mesa**, por encima de la recomendación inicial del implementador. Se ejecuta el paso 2 con esa dirección; la elección es la referencia vigente.

## Criterios de revisión y aceptación

| Criterio | Comprobación del paso 1 | Pendiente para aplicar a la app |
| --- | --- | --- |
| Alternativas concretas | Tres propuestas sobre inicio, ficha y estados. | B · Mesa elegida por el propietario el 25-10-2026. |
| Lectura | Contraste calculado para textos de paleta y avisos en ambos temas; revisión visual a móvil y escritorio. | TalkBack, VoiceOver y fuente ampliada en dispositivos soportados. |
| Honestidad del resultado | Misma evidencia, fuente y fechas; muestras ficticias identificadas. | Validación experta y comprensión con público objetivo. |
| Interacción | Cambio de pantalla, resultado y tema; simulación de favorito. | Implementación y comprobación del recorrido real en React Native. |
| Reproducibilidad | HTML/CSS/SVG local versionado y sin red. | Tokens nativos, recursos de icono/splash y especificación tipográfica final. |

## Verificación realizada

Revisión del 24-10-2026 en Chromium: las tres propuestas, las tres pantallas y ambos temas se comprobaron a **320, 390, 1024 y 1440 píxeles** de ancho. Se verificaron los cuatro resultados, el cambio de tema y la simulación de favorito. Sin errores de JavaScript, peticiones HTTP externas ni desbordamiento horizontal en esa matriz.

El contraste de los textos renderizados se calculó contra su fondo en las tres pantallas y ambos temas a 1440 píxeles. El mínimo observado fue **5,38:1 en claro** y **7,97:1 en oscuro**, por encima del umbral de revisión inicial de 4,5:1. Se revisaron visualmente capturas de inicio y ficha en escritorio, estados en oscuro e inicio en móvil oscuro. Las capturas e informes locales permanecen en `artifacts/branding-review/`, excluidos de Git; el prototipo reproducible sí se versiona.

**Paso 1 ejecutado; elección B · Mesa registrada el 25-10-2026.** La comprobación del prototipo no es una certificación completa de accesibilidad; las pruebas nativas y con personas usuarias siguen pendientes.
