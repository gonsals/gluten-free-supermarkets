# Iteración 4 · Seguridad y pruebas

> **Planificación actualizada 26-10-2026.** Evidencia del paso 4 del plan anterior. El bloqueo de seguridad continúa con ID SEG-01; este informe conserva resultados y fecha de su iteración. [Hoja de ruta vigente](HOJA_DE_RUTA.md) · [Backlog](PLAN_MEJORAS.md).

Fecha: **25 de octubre de 2026**. Base de producto: `068c58f`, identidad B · Mesa y guía de resultados de la iteración 3. Las modificaciones de esta iteración afectan a controles y pruebas; no cambian el runtime, los datos locales ni las reglas de interpretación.

## Objetivo y corrección

Revisar el paso 4 de la hoja de ruta y ejecutar las verificaciones disponibles de forma autónoma. Se corrigió el control de auditoría para que una fecha inválida, un informe incompleto o una excepción perteneciente a otro ámbito no permita aprobar dependencias. La revisión de los proveedores no aporta un conjunto actualizado compatible que elimine los tres avisos existentes. Se mantiene bloqueada la publicación general.

La nube continúa desactivada. Los emuladores Firebase utilizan exclusivamente `demo-sin-gluten`. No se despliega infraestructura, no se activa Blaze ni se contratan servicios.

## Matriz ejecutada

| Comprobación | Resultado y alcance |
| --- | --- |
| Tipos y lint | Correctos en app y servidor. |
| Dominio, cliente de productos y biblioteca | **73 pruebas correctas**, cinco suites. Incluye respuestas inválidas, recuperación, almacenamiento y casos sintéticos de evidencia. |
| Control de seguridad | **34 pruebas correctas** con el ejecutor de Node; incluye cinco pruebas del CLI en procesos y carpetas aislados. Avisos nuevos, ámbitos distintos, caducidad, fechas inexistentes, errores de proceso, JSON roto y recuentos/cadenas incoherentes bloquean. |
| Compatibilidad Expo | `expo install --check` correcto. No se cambia ninguna versión del runtime en esta iteración. |
| Exportación web de producción | Correcta; service worker regenerado antes de probar. |
| Navegador | **Ocho recorridos correctos** en Chromium con dimensiones móviles. Consulta, favoritos, recarga, modo offline, errores, trazas, guía, jerarquía malformada, precios, privacidad y actualización entre versiones. |
| Exportación y borrado | El nuevo recorrido descarga JSON y comprueba producto, favorito, historial y precio exacto de 249 céntimos. Cancelar conserva los datos. Confirmar borra fichas, caché, favoritos, historial y precios; otra exportación después de recargar confirma que permanecen vacíos. Solo se usan datos sintéticos en un contexto de navegador independiente. |
| Servidor | Lint y compilación correctos. |
| Reglas Firestore | **Siete pruebas correctas** en emulador local. Los mensajes `PERMISSION_DENIED` de los casos negativos son esperados: se comprueba que el acceso se rechaza. |
| Integración de nube opcional | **Cinco pruebas correctas** en emuladores locales: sincronización, autenticación, validación, autoría/moderación, cuota y borrado. No acredita un despliegue remoto. |
| Secretos | Gitleaks: **cero hallazgos no aceptados** en archivos publicables y diez commits de historial anteriores al commit de esta iteración. Sigue existiendo únicamente la excepción exacta de la clave histórica revocada. |
| Auditoría real | `audit:security` correcto con las tres excepciones existentes; ocho entradas afectadas de app y ninguna de servidor. |
| Bloqueo de publicación | `audit:release` devuelve **1**, esperado por las dependencias vulnerables. El bloqueo se conserva y no se amplía la fecha 22-11-2026. |

Los tests web usan respuestas controladas de Open Food Facts. Acreditan los flujos y la persistencia, sin afirmar que todo su catálogo esté validado. Los límites de los avisos se detallan en [Dependencias](DEPENDENCIAS.md).

## Android

Se utiliza la APK de la iteración 3, porque no hay cambios del runtime que justifiquen regenerar el binario: `artifacts/singluten-iteration-3-preview-universal.apk`, SHA-256 `49087d296ef6f549449ebf3e532bbcd1891cb68dc26b045e03b3fa4a3628e282`. Preview universal con firma de desarrollo y sin Metro.

La prueba utiliza Pixel 8 / Android 15, API 35, en `emulator-5582`, iniciado con `-read-only -no-snapshot -no-window`. Los cambios y datos de prueba pertenecen a esa instancia efímera. Se deshabilitan wifi/datos y se comprueba la ausencia de red activa y redirecciones ADB a Metro.

**Resultado correcto:** arranque sin conexión, apertura de la guía desde Ajustes y navegación hasta el estado contradictorio. Se guardó desde la interfaz una observación de **2,49 €**, `MesaIteracion4 · Madrid`, mediante SQLite. Después se reinició el dispositivo emulado y se volvió a abrir la app sin red: el proceso cambió de PID **3522 a 2085** y la observación seguía visible. Cerrar o poner en segundo plano la app no había terminado el proceso; esas comprobaciones no se contabilizaron como arranque en frío.

Capturas y metadatos locales: `artifacts/iteration-4/native-home.png`, `native-guide.png`, `native-price.png`, `native-persisted.png` y `native-verification.json`. Se ha comprobado el SHA-256 del binario instalado. Los artefactos permanecen fuera de Git. La instancia efímera se cierra al finalizar, conservando el AVD original.

La CI de la base de producto `068c58f` finalizó con **los cinco jobs correctos**, incluida la compilación Android: [run 40147533263](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40147533263). Este resultado corresponde a ese commit; la siguiente revisión ejecuta sus propios controles.

## Límites y siguiente trabajo

- La revisión de seguridad mejora el control; los tres avisos de terceros permanecen abiertos. El paso 4 no está cerrado para publicar.
- Un emulador no acredita lectura de envases reales, luz baja, linterna, rendimiento en un Android modesto ni recuperación en dispositivos físicos.
- No se ha compilado ni probado iOS nativo desde Windows.
- TalkBack/VoiceOver y comprensión con personas usuarias y revisión experta continúan pendientes. Las pruebas automáticas no se presentan como validación clínica.

No es necesario que el propietario ejecute los comandos anteriores para acreditar esta iteración. Esta matriz registra las comprobaciones realizadas; la validación física y experta se mantiene como trabajo específico anterior a la beta.
