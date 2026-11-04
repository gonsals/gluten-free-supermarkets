# Iteración 5 · Accesibilidad y conservación de datos

> **Planificación actualizada 26-10-2026.** Evidencia del paso 5 del plan anterior. Las pruebas físicas y asistivas pendientes siguen en CAL-02; el orden actual prioriza cesta y comparación de totales. [Hoja de ruta vigente](HOJA_DE_RUTA.md) · [Backlog](PLAN_MEJORAS.md).

Fecha: **25 de octubre de 2026**. Continúa la preparación técnica del paso 5 de la hoja de ruta. Se conserva B · Mesa, el funcionamiento local y la nube desactivada.

## Recorrido verificado

Una persona consulta o guarda datos en su biblioteca y puede revisar, cancelar o confirmar su borrado desde una pantalla pequeña, con texto ampliado o teclado. El diálogo comunica la operación, conserva el foco y permite alcanzar sus acciones; cancelar mantiene el contenido guardado. El borrado confirmado sigue llegando al repositorio transaccional y se comprueba tras recargar en el recorrido de privacidad.

## Problemas encontrados y cambios

| Hallazgo | Corrección |
| --- | --- |
| Diálogo de borrado sin desplazamiento. A 320 × 480 con texto al 200 %, Cancelar empezaba en `y=456,8` y Confirmar en `y=545,6`: sus acciones quedaban fuera de la ventana. | Contenido desplazable dentro de una zona segura. La tarjeta crece según el texto y conserva sus controles, sin limitar la escala de fuente. |
| La confirmación carecía de título/nombre accesible. | Títulos específicos para biblioteca local, historial, precio privado y cuenta. La ventana expone su nombre y muestra un encabezado. |
| Atrás/Escape podía cerrar la confirmación mientras se ejecutaba el borrado. | El cierre se bloquea durante la operación, igual que las pulsaciones repetidas. Vuelve a estar disponible cuando termina. |
| Selección de favoritos/historial y unidades comunicada solo mediante aspecto visual. | Estado seleccionado nativo y `aria-pressed` en botones web. Nombres completos «Unidad», «Kilogramos» y «Litros». Los iconos decorativos de las acciones quedan fuera del árbol accesible. |
| La revisión Android al 200 % detectó etiquetas inferiores truncadas («Consu…», «Bibliot…»). | Etiquetas con varias líneas y barra cuya altura depende de escala y anchura disponible; se conserva el nombre accesible completo. |
| La CI de `ed32725` detectó un test que recargaba la página antes de confirmar el guardado del favorito. | El recorrido de exportación espera a «Quitar de favoritos» antes de cambiar de página. Tres repeticiones locales consecutivas correctas; no se añaden pausas fijas para ocultar la carrera. |

No cambian las reglas del dominio, esquema de biblioteca, límites, permisos ni dependencias. No se añaden cuentas obligatorias ni servicios remotos.

## Matriz de pruebas

| Verificación | Evidencia y alcance |
| --- | --- |
| Diálogo con teclado web | Abre con Enter, enfoca Cancelar, contiene Tab/Shift+Tab, cierra con Escape y devuelve el foco al control de origen. |
| Texto ampliado web | Dos recorridos en 320 × 480, claro y oscuro: encabezado, explicación y botones alcanzables con desplazamiento y sin desbordamiento horizontal. Es una simulación de texto al doble de tamaño, no una prueba nativa de fuente. |
| Selección accesible | El cambio de biblioteca y unidades actualiza el estado de sus botones. Se comprueba en el DOM, sin deducir el resultado solo por el color. |
| Confirmación nativa en pruebas de componente | Dos pruebas verifican título, acciones distintas, cancelación, prevención de doble envío y bloqueo de cierre durante una operación. Se usa el adaptador de áreas seguras de la librería; no acredita TalkBack real. |
| Regresión web | **12 recorridos correctos**: los ocho existentes y cuatro de accesibilidad. Incluye persistencia, funcionamiento sin conexión, exportación y borrado. |
| Regresión de app | **75 pruebas correctas**, seis suites, incluidas las dos nuevas de confirmación. `npm run check` correcto: tipos, lint, pruebas de app, seguridad y compatibilidad Expo. |
| Seguridad de las herramientas | Las **34 pruebas de seguridad** permanecen dentro de `npm run check`. Los tres avisos externos conservan el bloqueo de publicación descrito en [Dependencias](DEPENDENCIAS.md). |
| Android | Preview universal compilada y ejecutada sin red ni Metro en Pixel 8 / Android 15 API 35. Resolución de prueba 1080 × 1920, densidad 540 (**320 dp de ancho**) y `font_scale=2.0`. Navegación sin etiquetas truncadas, acciones de confirmación alcanzables en ambos temas, cancelación y selección nativa verificadas. |

## APK y actualización conservando datos

Artefacto: `artifacts/singluten-iteration-5-preview-universal.apk`, **71.359.307 bytes**, ARM64/x86_64, firma de desarrollo. SHA-256: `16f9797359c6ab912efb18bb7dc2ca9b91e0670d7dc65394e9f5cc996cc47c48`. Compilación final correcta: 579 tareas, 37 ejecutadas y 542 reutilizadas, 2 min 30 s. Se conservan los binarios de iteraciones anteriores.

Se guardó una observación de 2,49 € con la APK de la iteración 3 en una instancia aislada; se instaló encima la nueva preview. La anotación `MesaIteracion4 · Madrid` siguió visible después de actualizar y después de cancelar el borrado en ambos temas con fuente ampliada. Se comprobó además el atributo `selected` nativo al cambiar entre Favoritos e Historial. La actualización no modifica el esquema y esta prueba no acredita migraciones de formatos diferentes.

El AVD se inicia con `-read-only -no-snapshot -no-window`; los cambios de resolución, fuente y datos son exclusivos de esa instancia efímera. Se cierra al terminar, conservando el AVD original. Se verificó ausencia de red activa y redirecciones ADB a Metro. El ZIP de la APK no contiene archivos `.env` ni coincidencias del patrón de clave Google inspeccionado; el bytecode incluye el diálogo y los nombres accesibles nuevos.

Evidencia local: `artifacts/iteration-5/native-final.json`, `native-tabs-font-200-final.png`, `native-modal-final-{yes,no}-{heading,actions}.png`, `native-library-selection-final.png` y `native-upgrade-data-final.png`. `yes/no` identifica el modo nocturno Android activado/desactivado. Las capturas web `modal-after-{light,dark}-{heading,actions}.png` muestran el diálogo a 320 × 480, con cero excepciones JavaScript registradas.

Se conserva también una [captura Android del diálogo al 200 %](diseno/iteracion-5-dialogo.png) dentro del repositorio para revisar que ambas acciones son alcanzables al desplazarse.

Los tests web y de componentes usan perfiles/datos sintéticos. Los artefactos de diagnóstico se guardan localmente en `artifacts/iteration-5/`, fuera de Git. No se borran datos de una instalación personal para verificar estas operaciones.

La [CI de la iteración 4](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40148432392) pasó secretos, dependencias, Firebase y Android; el job de app falló en el recorrido de exportación anterior. Se conserva esa evidencia y se corrige la sincronización del test en esta iteración. No se presenta aquel run como completamente correcto.

## Criterios de implementación

Se mantienen componentes compartidos y cambios explícitos de estado, sin efectos de sincronización ni listeners globales añadidos. El foco web se apoya en la implementación de `Modal` de React Native Web y se prueba desde el navegador. Los estilos conservan alturas mínimas y permiten crecer y desplazarse. No se desactiva el escalado tipográfico para hacer pasar las comprobaciones.

Referencias: [accesibilidad de React Native](https://reactnative.dev/docs/accessibility), [Modal](https://reactnative.dev/docs/modal) y [patrón de diálogos de WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Estas referencias guían los cambios; su uso no equivale a una certificación de conformidad.

## Pendientes antes de beta

- Android físicos: cámara, linterna, permisos, baja luz, reanudación y rendimiento en un dispositivo modesto.
- Lectura y navegación con TalkBack; VoiceOver y compilación iOS si se incluye esa plataforma.
- Comprobaciones con personas usuarias sobre comprensión de resultados y revisión experta del dominio.
- Recuperación entre teléfonos: existe exportación, pero la importación sigue pendiente. Esta iteración no se presenta como una migración de esquema ni una recuperación completa de copias.

El paso 5 permanece abierto hasta completar las pruebas físicas y asistivas aplicables. Los pasos de revisión de dominio y seguridad tampoco se cierran mediante estas mejoras.
