# Validación Android · CAL-02

**Iteración 15. Ejecución nativa: 31-10-2026; cierre documental y revisión de seguridad: 03-11-2026.** Responsable técnico: Codex. Tramo emulado verificado; matriz física pendiente. Base de aplicación `c43bb24b9a78ade3d907c51f655857df7c102083` con el bloqueo de `SYSTEM_ALERT_WINDOW` en `app.json`. No cambia el esquema ni el contrato de copia v4. [Roadmap](HOJA_DE_RUTA.md) y [backlog](PLAN_MEJORAS.md).

## Paquete comprobado

| Dato | Resultado |
| --- | --- |
| APK local, ignorada por Git | `artifacts/singluten-iteration-15-preview-universal.apk` |
| SHA-256 | `b4790eab1737b8409679768a53d2acd5617fa2e139371c1688ca42d7f3da6997` |
| Tamaño | 71.509.695 bytes |
| Identificador | `com.tumarre.singluten` |
| Arquitecturas incluidas | ARM64 y x86_64; ejecución comprobada únicamente en x86_64 |
| JavaScript incorporado | Bundle Hermes de 3.996.076 bytes; arranque sin Metro |
| Configuración | Nube desactivada, firma de desarrollo de la plantilla; no apta para tiendas |
| Permisos presentes | Cámara, Internet, estado de red, vibración y permiso interno de receptor |
| Permisos ausentes | Micrófono, almacenamiento externo amplio y superposición sobre otras apps |
| Copia automática de Android | `allowBackup=false`; exportación manual de la app disponible |
| Inspección del ZIP | Cero archivos `.env*` y cero coincidencias del patrón de clave de API de Google |

Se contrastó también el hash de `base.apk` realmente instalado con el del archivo anterior. La APK no incorpora los datos de ensayo: se importaron únicamente en el almacenamiento del emulador aislado. Los informes, capturas, copias y binarios permanecen en `artifacts/`, fuera del repositorio.

## Entorno y aislamiento

Pixel 8 **emulado**, Android 15/API 35, x86_64, 1080 × 2400, densidad 420 y 2 GB de RAM. Instancia propia en `emulator-5582`, iniciada con `-read-only -no-snapshot-load -no-snapshot-save -no-window -no-audio`, cámara trasera emulada y sin webcam del equipo. Cada operación ADB se dirigió al serial explícito, tras verificar proceso, puerto y argumentos de la instancia.

Pruebas sin red activa, sin redirección ADB a Metro y sin Firebase. Los cambios de datos, permisos, fuente y tema afectaron solo a esa instancia temporal. Al cierre del 03-11 no quedan dispositivos ADB conectados ni esa instancia en ejecución. No se han efectuado pruebas ni borrados en un teléfono del propietario.

## Casos ejecutados y resultados

La muestra reutiliza la fixture sintética de [CAL-01](VALIDACION_COMPRA.md), definida en `tests/e2e/fixtures/shopping.ts`: tres productos, siete precios privados, tres sucursales y un grupo de alternativas. No representa tarifas reales ni certificaciones de gluten.

| Caso | Evidencia y resultado |
| --- | --- |
| Actualizar sin perder datos | Instalar la APK de iteración 11, importar copia v4 y actualizar sobre ella a la APK actual. Se conservan cesta, precios, sucursales y grupo. Total B 7,75 € frente a A 8,07 €; sucursal C parcial, sin completar faltantes con cero. Es una actualización v4 → v4, no una nueva migración de esquema. |
| Sustituir formato y reiniciar | Necesidad de 1,2 kg: dos envases de 750 g, total 1,5 kg y sobrante de 0,3 kg. Tras sustitución confirmada: B 7,60 €, A 7,80 €, diferencia 0,20 €. Se conserva tras cierre forzado y arranque en frío desde SQLite. |
| Entrada manual y ficha offline | Producto sintético previamente guardado legible sin red, con declaración de gluten y trazas. Código válido no guardado muestra error de conexión con reintento. No se consultó al proveedor para esos códigos de ensayo. |
| Permiso denegado | Primera denegación conserva entrada manual; denegación permanente ofrece abrir ajustes. Concesión realizada desde la pantalla real de permisos de Android y posterior apertura de cámara correctas. |
| Cámara y linterna | Servicio nativo con cliente de la app y producción de fotogramas; solicitud nativa con `android.flash.mode=TORCH`. Captura negra en emulación headless: no acredita decodificación óptica ni iluminación física. |
| Ciclo de cámara | Cambiar de pestaña libera la sesión; reapertura explícita correcta. Al ir a segundo plano se libera el cliente y al volver permanece la entrada manual con linterna apagada. Liberación asíncrona observada mediante sondeo: 2,265 s en la muestra final; no es una garantía de cierre instantáneo. |
| Exportación nativa | Selector Android de compartir y URI temporal `content://` hacia un receptor local de ensayo separado. Copia JSON v4 capturada y contrastada fuera de la app; no se envió a Drive, correo ni otros destinos. |
| Borrado y restauración | Cancelar borrado conserva colecciones; confirmar las vacía. Cancelar restauración mantiene biblioteca vacía. Confirmar importación mediante selector nativo y reiniciar recupera 7,60 € y diferencia 0,20 €. |
| Integridad de copia | Comparación independiente de todas las colecciones privadas, tres fichas en caché, siete precios, tres sucursales y un grupo. Fechas de observación y consulta originales, fuentes, declaraciones y trazas conservadas; avanza solo el sello de restauración. Propietario de nube nulo. |
| Texto y tema | Fuente Android al 200 % y tema oscuro; edición real de cantidad 2 → 3 → 2, guardado y recálculo correctos. Capturas revisadas sin recorte horizontal de entrada/acciones. No acredita narración TalkBack. |
| Acceso directo | Arranque en frío con `singluten://basket-comparison`, acción «Editar mi cesta» y apertura de la cesta correcta. |
| Errores de ejecución | Sin líneas de error en la captura filtrada `AndroidRuntime:E`/`ReactNativeJS:E` del recorrido; alcance limitado a esa observación. |

Evidencia local principal en `artifacts/iteration-15/`: `installed-apk.json`, `native-upgrade.log`, `native-substitution-final.log`, `native-recovery-final.log`, `native-json-comparison.json`, `native-font-dark-final.log`, `native-deeplink.log`, `camera-cycle-final.log` y `runtime-errors.log`. Las capturas de totales y texto ampliado se revisaron visualmente. Los intentos descartados por navegación del helper o por comprobar la liberación antes de terminar no se contabilizan como casos aprobados; el resultado final se obtiene repitiendo el caso completo o completando la comprobación por condición.

## Mejoras incorporadas a construcción y CI

La inspección del manifiesto fusionado detectó un permiso de superposición innecesario. Ahora se bloquea en la configuración reproducible; Android documenta que [`SYSTEM_ALERT_WINDOW`](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW) permite dibujar sobre otras aplicaciones. Se conservan los bloqueos de audio y almacenamiento amplio.

`scripts/inspect-android-apk.py` comprueba hash frente al JSON lateral, paquete, permisos, copia automática desactivada, arquitecturas, bundle incorporado, archivos de entorno y patrón común de clave de Google. Limita tamaños de entrada/expansión y solo escribe informes JSON en `artifacts/`. El campo `signingMetadata` valida la etiqueta del metadato, **no realiza una verificación criptográfica del certificado**. Tampoco demuestra la ausencia de cualquier posible secreto; complementa el escaneo de código/historial con Gitleaks.

El builder de Windows ejecuta esa inspección para `preview`; el job Android de CI también la ejecuta sobre su APK ARM64. La herramienta tiene diez casos Python con SDK simulado, incluidos rechazos de permisos, configuración, hash, copia automática, claves sintéticas, bundle y ABI. Se integran como una prueba Node en `npm run test:security`, sin SDK, emulador, dependencias nuevas ni red.

Se añade `--incremental`: Expo SDK 58 limpia por defecto la generación nativa; esta opción solicita `--no-clean`. En este equipo, compilación corregida limpia **11 min 34 s** e incremental **1 min 10 s** (579 tareas: 33 ejecutadas y 546 actualizadas), con APK de hash idéntico. Es una medida de construcción local, no de velocidad de la app. Usar solo si no cambian SDK, plugins o configuración nativa; ante esos cambios, reconstruir sin la opción.

```powershell
npm.cmd run build:android:windows -- --variant preview --architecture universal
npm.cmd run build:android:windows -- --variant preview --architecture universal --incremental
python scripts/inspect-android-apk.py artifacts/singluten-preview-universal.apk --report artifacts/android-inspection.json
node --test tests/security/android-apk-inspection.test.mjs
```

El [receptor de ensayo](../tests/native/README.md) se compila aparte, no tiene permisos de red ni almacenamiento externo y nunca entra en la APK de producto. Sirve para comprobar el contrato de compartir, **no añade una función de guardado al producto**. Los destinos locales disponibles dependen de las apps del teléfono; hay que verificar que se puede guardar y recuperar una copia sin nube en la matriz física. Un selector de guardado directo puede evaluarse si esa prueba revela fricción.

## Comprobaciones y seguridad al cierre

- `npm run check` del 31-10: 220 pruebas de app en 20 suites, 43 pruebas Node de seguridad, tipos, lint y compatibilidad Expo correctos. Los diez casos Python están incluidos dentro de una de esas 43 pruebas; no se suman como pruebas Node adicionales.
- Inspección repetida sobre la APK congelada y diez casos del inspector correctos el 03-11. Sintaxis YAML del workflow y Python de su paso de inspección comprobadas.
- Gitleaks sobre archivos publicables e historial: cero hallazgos no aceptados el 03-11, conservando únicamente la excepción histórica exacta de la clave revocada. Documentación: 35 archivos Markdown, 301 enlaces locales, 23 tareas sin ciclos y cinco documentos históricos intactos.
- Los 46 recorridos web son evidencia de CI de la base `c43bb24`; no se han vuelto a ejecutar localmente en esta iteración, que no modifica componentes ni JavaScript de la app.
- Auditoría npm del 03-11: **60 entradas afectadas en app** (1 baja, 57 moderadas, 2 altas), **6 moderadas en functions**. Son entradas del informe, no 66 vulnerabilidades independientes ni evidencia de explotación. También se rechazan cadenas incompletas del informe. `audit:security` devuelve 1; no se amplían excepciones, cuyo vencimiento sigue siendo 22-11-2026. [Detalle y siguiente trabajo SEG-01](DEPENDENCIAS.md).

No se modifican paquetes/lockfiles, se activan servicios de pago o se publica en tiendas. En [CI de `6eb647e`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/41613962094), el 03-11 pasan secretos y Firebase; el job app vuelve a aprobar tipos, lint, 220 pruebas de app y 43 de seguridad, pero falla después en `expo install --check`: ahora recomienda cinco parches compatibles (`@expo/metro-runtime` 58.0.16, Expo 58.0.22, Router 58.0.29, SQLite 58.0.15 y screens 4.30.1). Es una diferencia respecto al catálogo de compatibilidad consultado el 31-10, no una aprobación completa de `check` el 03-11. No se alcanza Playwright en esa ejecución. Esos parches deben alinearse y validarse en SEG-01 antes de dar por verde el job; la APK nativa congelada conserva las versiones realmente probadas. El job de dependencias también falla por los avisos anteriores; la aprobación funcional no levanta ese bloqueo.

Expo Go restaurado el 03-11 por LAN en `exp://192.168.1.200:8081`: estado `packager-status:running`, manifiesto Android HTTP 200 y bundle de 6.472.165 bytes HTTP 200, con nube desactivada. Esto comprueba la entrega del código desde este equipo; no sustituye una prueba en el teléfono. La nueva compilación Android remota sigue en curso al registrar este cierre; el paso nuevo de inspección en Linux no se declara aprobado hasta que termine, aunque la herramienta y la APK universal local ya estén verificadas.

## Matriz física preparada, pendiente de ejecución

Registrar para cada sesión: modelo, RAM aproximada, SO, arquitectura, commit/hash de APK, fecha, escenario, resultado y evidencia sin datos personales. No asignar un modelo no probado como aprobado.

| Plataforma/escenario | Criterio pendiente |
| --- | --- |
| Android ARM64 representativo y otro de recursos modestos | Instalar/actualizar, conservar biblioteca, arranque sin Metro, respuesta y almacenamiento con datos de ensayo. La inclusión ARM64 en el ZIP no prueba ejecución ARM64. |
| Cámara física, envases y distintas luces | Decodificación real, enfoque, linterna, repetir escaneo y alternativa manual. |
| Permisos y fabricantes | Denegar/bloquear, volver desde ajustes, pestañas, segundo plano y retorno en variantes reales de Android. |
| Presión del sistema y red | Cierre por el SO, reinicio, red lenta/ausente y caché; ninguna pérdida de datos ni precio faltante convertido en cero. |
| Exportación/restauración local | Guardar en destino local disponible sin cuenta/nube; localizar archivo, cancelar y restaurar, conservar origen/fechas/importes. Evaluar necesidad de selector directo de guardado. |
| Accesibilidad | TalkBack real, orden/nombres/estados, teclado y fuente ampliada; tema oscuro, contraste y comprensión con personas. |
| iOS, si se distribuye | Build nativa, instalación, almacenamiento, permisos, cámara/linterna, copia local y VoiceOver en dispositivo; no comprobados desde Windows. |
| Compra y gluten | Tickets/precios equivalentes, cobertura útil y sesiones de comprensión; revisión experta del lenguaje de gluten. Pendientes CAL-01 real, GLU-01 y BET-01. |

CAL-02 queda **verificada en su tramo emulado**, abierta en físico. Siguiente iteración técnica: **SEG-01**, resolver avisos mediante versiones compatibles y revisar las cadenas incompletas de auditoría, conservando los bloqueos mientras falte evidencia.
