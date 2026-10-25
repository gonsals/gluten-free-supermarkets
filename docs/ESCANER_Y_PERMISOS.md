# Iteración 6 · Escáner, permisos y reanudación

Fecha: **25 de octubre de 2026**. Continúa el paso 5 de la hoja de ruta sobre B · Mesa. La nube permanece desactivada y no se añaden dependencias, permisos ni servicios.

## Recorrido y cambios

Una persona abre Consultar y decide si permite la cámara. Denegar o no poder comprobar el permiso permite continuar mediante el código manual. Una respuesta pendiente no debe activar la cámara después de abandonar esa pantalla. Al volver de Ajustes se consulta el permiso actual; volver de segundo plano mantiene la entrada manual y la linterna apagada hasta una nueva acción.

Se extrae el ciclo de cámara a `src/features/scanner/useScannerCamera.ts`, separado de la consulta de productos. La pantalla mantiene la normalización de códigos, los límites del proveedor y las evidencias de gluten existentes.

| Problema revisado | Implementación |
| --- | --- |
| Promesas de permiso rechazadas sin tratamiento en la pantalla anterior. | La lectura inicial, refresco y solicitud manejan fallos y muestran una alternativa manual. |
| Respuesta de permiso después de salir de Consultar o desmontar. | Generación de solicitudes y control de vida de la pantalla; se descarta una respuesta obsoleta. |
| Pulsaciones repetidas mientras se decide el permiso. | Una solicitud activa; botón ocupado y bloqueo inmediato antes de esperar a la API. |
| Permiso cambiado desde Ajustes. | Se vuelve a consultar al enfocar la pantalla y al regresar a primer plano. Un permiso concedido no inicia por sí solo la cámara. |
| Cámara/linterna conservadas al salir o abrir el panel de notificaciones Android. | Apagado y vuelta a modo manual al salir de pantalla, pasar a segundo plano con la cámara activa o recibir `blur` Android. Al iniciar una consulta se apaga la linterna. |
| Diálogos del sistema que interrumpen temporalmente la app. | Se conserva una solicitud explícita pendiente durante esa interrupción; solo puede activar la cámara si su respuesta llega con la app activa y en la misma pantalla. Una concesión recibida mientras sigue en segundo plano no abre la cámara al regresar. |
| Fallo al montar la vista de cámara o abrir Ajustes. | Mensaje específico, entrada manual disponible y opción de volver a intentarlo. |

## Pruebas automáticas

| Área | Resultado |
| --- | --- |
| Ciclo de cámara | **13 pruebas nuevas**: autorización explícita, fallos de API, denegación permanente, doble pulsación, cambio de pantalla, segundo plano, interrupciones de permisos Android/iOS, respuestas antiguas, Ajustes, fallo de vista, limpieza y panel de notificaciones. Son simulaciones de las APIs; no acreditan un dispositivo iOS. |
| App completa | **88 pruebas correctas**, siete suites, tras ejecutar tipos, lint y pruebas con `npm run check`. |
| Seguridad | **34 pruebas correctas** dentro del mismo control. Los avisos externos pendientes conservan la política y el bloqueo de publicación. |
| Navegador | **15 recorridos**: doce anteriores y tres nuevos de denegación/manual, permiso tardío tras cambiar de pestaña y cancelación de consulta lenta. El último espera a que empiece la petición antes de cancelarla. |
| Compatibilidad | Expo compatible y exportación web de producción correcta. Sin cambios de módulos nativos ni esquema de datos. |

Una ejecución local coincidió con compilación y emulador en paralelo y agotó el límite de cinco segundos de una prueba de Confirm. La suite completa se repitió correctamente sin cambiar sus plazos. No se atribuye ese resultado a un fallo de permisos ni se oculta el intento.

Las respuestas de productos en navegador son controladas. Se comprueba el recorrido UI → cliente → respuesta/aborto → UI; no se valida todo el catálogo externo. Las pruebas de cámara no introducen consultas reales adicionales a Firebase.

## Android emulado

Preview universal final: `artifacts/singluten-iteration-6-preview-universal.apk`, **71.362.531 bytes**, ARM64/x86_64, sin Metro, nube desactivada y firma de desarrollo. SHA-256: `643f9819a9d78ba19afe363f12046cc86dc1723ed922e6d5e04f9216957db829`. Compilación final correcta: **3 min 20 s**, 579 tareas, 37 ejecutadas y 542 reutilizadas. Se comprueba el checksum antes de ejecutar. La inspección del ZIP no encuentra archivos `.env` ni coincidencias del patrón de clave Google utilizado.

La prueba utiliza un AVD Pixel 8 / Android 15 API 35 iniciado con `-read-only -no-snapshot -no-window`, en una instancia propia. La revocación y restablecimiento de indicadores de permiso afectan únicamente a esa copia efímera. Los artefactos locales se guardan en `artifacts/iteration-6/` y no se suben a servicios de almacenamiento.

Resultados correctos sobre esa APK instalada:

- El diálogo de permiso aparece tras pulsar «Usar cámara». Denegarlo mantiene disponible el campo de código y permite consultar manualmente; sin red se muestra el aviso correspondiente, sin emitir una conclusión sobre gluten.
- La segunda denegación deja el permiso bloqueado y muestra «Abrir ajustes de cámara». Se abre la pantalla de permisos del sistema, se concede el acceso y se vuelve a la app; la vista de cámara se inicia tras una nueva pulsación.
- El estado del botón de linterna cambia al activarlo. Después de ir al inicio de Android y regresar, vuelve el modo manual y desaparece el estado «Apagar linterna». No se acredita el encendido de una luz física.
- Tras restablecer únicamente el permiso en la instancia de prueba, se concede desde el diálogo inicial del sistema. La vista de cámara se abre también por ese recorrido, sin depender de haberlo concedido en Ajustes.
- Abrir y cerrar el panel de notificaciones con la cámara iniciada devuelve el modo manual; se comprueba también en la instancia Android, además del caso de prueba de `blur`.

Se mantiene el dispositivo sin red activa y sin redirecciones ADB a Metro. La instancia efímera se cierra al terminar y conserva el AVD original. Evidencia local: `native-permission-prompt.png`, `native-permission-denied.png`, `native-manual-offline.png`, `native-permission-blocked.png`, `native-camera-preview.png`, `native-resume-manual.png`, `native-first-grant-preview.png`, `native-notification-return.png` y `native-verification.json` dentro de `artifacts/iteration-6/`. [Captura del permiso bloqueado y alternativa manual](diseno/iteracion-6-permisos.png).

## CI y alcance pendiente

La base `1458428` de la iteración 5 tiene sus **cinco jobs correctos**, incluida la compilación Android: [run 40149791699](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40149791699). Ese resultado corresponde a la base, no a modificaciones posteriores.

Actualización al continuar con la iteración 7: el commit final de esta iteración 6, `3bd1793`, también tiene sus **cinco jobs correctos**, incluida la compilación Android: [run 40215578049](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40215578049).

La [documentación de Camera de Expo](https://docs.expo.dev/versions/latest/sdk/camera/) identifica el uso de cámara nativa como propio de dispositivos. El emulador sirve para verificar permisos, controles y recuperación; la lectura de códigos en envases reales y la luz física de la linterna continúan pendientes. [AppState de React Native](https://reactnative.dev/docs/appstate) describe las interrupciones del sistema y el evento `blur` Android utilizados en este ciclo.

Antes de cerrar el paso 5 siguen pendientes Android físicos, luz baja, reflejos, lectura repetida de envases, consumo/rendimiento, TalkBack y comprensión con personas usuarias. iOS requiere compilación, dispositivo y VoiceOver. Se conservan además la revisión experta sobre gluten y los avisos de dependencias como bloqueos independientes.
