# Despliegue y pruebas

Estado de referencia: 2026-10-24. Auth y Firestore ya están preparados en el proyecto existente; Functions y TTL siguen pendientes y la nube de la app está desactivada. No se ha publicado en tiendas. Las comprobaciones y sus límites se registran en [Implementación](IMPLEMENTACION.md) y [Firebase real](FIREBASE_REAL.md).

## Entorno reproducible

Usar Node de `.nvmrc` y npm 11. Instalar con `npm ci` en la raíz y `npm --prefix functions ci` para el servidor. Los dos archivos `package-lock.json` forman parte del proyecto; no usar opciones que ignoren conflictos de dependencias.

La aplicación local puede usarse sin cuenta. Copiar `.env.example` a `.env.local` si se necesitan ajustes. Los nombres `EXPO_PUBLIC_*` se incluyen en el cliente: no son secretos. Mantener claves administrativas, cuentas de servicio y contraseñas fuera de estos archivos y del repositorio. Reiniciar el servidor de desarrollo después de cambiar configuración.

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_APP_ENV` | `development`, `test`, `beta` o `production`. |
| `EXPO_PUBLIC_OFF_ENV` | Catálogo `production` (`.org`) o `staging` (`.net`). Bibliotecas locales separadas por entorno. |
| `EXPO_PUBLIC_CLOUD_ENABLED` | `false` por defecto. Requiere configuración Firebase y despliegue previo para activarse. |
| `EXPO_PUBLIC_PROJECT_ID`, `EXPO_PUBLIC_API_KEY`, `EXPO_PUBLIC_FIREBASE_APP_ID` | Configuración pública del cliente Firebase. |
| `EXPO_PUBLIC_USE_EMULATORS` | Solo admite proyectos `demo-` y entornos no productivos. |
| `EXPO_PUBLIC_EMULATOR_HOST` | `127.0.0.1` en navegador local; un dispositivo necesita una dirección accesible del equipo. |
| `EXPO_PUBLIC_TELEMETRY_URL` | Endpoint HTTPS opcional; vacío no envía eventos. El receptor y su retención requieren configuración operativa aparte. |

La configuración antigua de `.env` deja de seguirse por Git. Revisar también el historial del repositorio si alguna vez se almacenaron credenciales privadas; una configuración pública de Firebase no concede permisos administrativos.

## Comprobaciones

```bash
npm run check
npm run lint:server
npm --prefix functions run build
npm run audit:security
npm run export:web
npx playwright install chromium
npm run test:e2e
npm run test:rules
npm run test:cloud
```

`test:e2e` construye y sirve la exportación de producción en el puerto 4173. Usa respuestas controladas de Open Food Facts y tamaño móvil en Chromium. No necesita escribir datos externos. Las pruebas de persistencia incluyen recarga sin red después de cargar el service worker.

Las pruebas Firebase usan Auth en 9099, Firestore en 8080 y Functions en 5001, exclusivamente en `demo-sin-gluten`. Los puertos deben estar libres. Necesitan Java 21; Java 8 no es suficiente. Las funciones se compilan antes de ejecutar su integración y el script aumenta el tiempo de descubrimiento local.

En PowerShell, preparar Java portátil sin cambiar el sistema:

```powershell
$env:JAVA_HOME = (python scripts/prepare-java.py).Trim()
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm.cmd run test:rules
npm.cmd run test:cloud
```

El script descarga Temurin del proveedor y comprueba SHA-256. No hace falta ejecutarlo si ya hay un JDK 21 configurado. En CI se instala Java mediante `setup-java`.

El workflow de GitHub comprueba app, servidor, APK Android interna con JavaScript incorporado y dependencias. La APK de CI usa firma de desarrollo y nube desactivada; no se publica en tiendas. La exportación web se realiza dentro del recorrido Playwright para evitar construirla dos veces. Su existencia no activa por sí sola la protección de la rama: configurar las comprobaciones obligatorias y revisar una ejecución remota antes de integrar. Los avisos transitivos conocidos tienen excepciones temporales exactas; un aviso nuevo o una excepción vencida hace fallar el control. `npm run audit:release` es más estricto y falla mientras quede cualquier aviso. Véase [Dependencias](DEPENDENCIAS.md).

Para respetar el criterio de coste cero, CI utiliza runners estándar de Linux en el repositorio público y no sube APK ni informes como artefactos persistentes de Actions. Los resultados quedan en los logs; los informes completos pueden generarse en local. El almacenamiento de artefactos de Actions tiene cuota compartida y puede facturarse al excederla, según la [documentación de GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions). No se contratan runners ampliados ni servicios de build externos.

## Firebase de pruebas y producción

El proyecto existente `gluten-free-supermarket` continúa en Spark. Tiene Firestore en `europe-west1`, protección contra borrado, reglas/índices desplegados y correo/contraseña habilitado. Consultar `npm run firebase:verify -- --project gluten-free-supermarket` para repetir las comprobaciones de solo lectura. No activar la nube de la app mientras falten las funciones de gestión de cuentas. El despliegue completo siguiente requiere Blaze; no ejecutar cambios de facturación como parte de una comprobación.

Crear proyectos separados y seleccionar siempre un ID explícito. Antes de activar la nube en la app:

1. Revisar región `europe-west1`, facturación, presupuesto, alertas, retención y responsables de acceso.
2. Habilitar inicio por correo/contraseña en Firebase Auth y configurar dominios y plantillas de correo del entorno.
3. Instalar y compilar `functions/`; revisar las reglas e índices versionados. Desplegar únicamente al proyecto elegido, con `npx firebase deploy --project ID_EXPLICITO --only firestore,storage,functions`.
4. Confirmar índices listos, política TTL de `_accountState.expiresAt` y restricciones de Storage. TTL es asíncrono: no prometer eliminación instantánea del registro de seguridad.
5. Probar con dos cuentas normales y una moderadora en ese entorno: favoritos, aislamiento, correo verificado, cuotas, moderación, ausencia de autor en la vista pública y borrado de cuenta.
6. Configurar después la app de beta con el ID y los valores públicos correctos. Validar que las reglas desplegadas corresponden a esta versión.

Las cuentas moderadoras necesitan la custom claim `admin: true`, asignada mediante un entorno administrativo de confianza. Nunca asignarla desde la app ni ampliar las reglas para facilitar pruebas. Las escrituras de precios y su publicación pasan por funciones; `publishedPrices` expone solo la copia aprobada sin identificadores del autor o moderador.

El borrado de cuenta exige una autenticación reciente y elimina favoritos, contribuciones y copias publicadas. Conserva temporalmente una marca de bloqueo de 24 horas para impedir que tokens o escrituras antiguas restauren datos. Se ha probado localmente; verificar el recorrido y la política de copias de seguridad del entorno real antes de publicarlo.

App Check **no está activado**: falta elegir e integrar un proveedor compatible por plataforma y registrar las aplicaciones reales. Las funciones permiten exigirlo mediante `ENFORCE_APP_CHECK=true` en su entorno de servidor. Activarlo solo tras comprobar que los clientes de beta envían tokens válidos; definir la variable no implementa el cliente.

## Android e iOS

La dirección visual elegida es [Mesa](BRANDING_MESA.md). Para regenerar los iconos y el splash desde sus SVG, ejecutar `npm run brand:generate` **antes** de generar el proyecto nativo. El helper de Windows utiliza un worker de Gradle para serializar tareas nativas; Metro conserva su límite de dos procesos. El workflow de Linux mantiene su configuración propia.

La generación nativa usa configuración y plugins versionados; `android/` e `ios/` son carpetas generadas e ignoradas. No guardar cambios manuales importantes únicamente allí.

`withAndroidBuildInputs` limita Metro a dos procesos durante el empaquetado nativo y excluye de las entradas de Gradle los artefactos generados y la copia `node_modules-sdk52`. React Native excluye `node_modules`, pero no una copia con otro nombre: sin este ajuste Gradle recorre y calcula hashes de las dependencias antiguas antes de arrancar Metro. La copia conservada no se borra y el código fuente de la app continúa siendo una entrada de compilación.

```bash
npx expo prebuild --platform android --no-install
npm run android
```

Android requiere JDK, SDK y un dispositivo/emulador compatibles. En Windows, el plugin `withWindowsCmake` acorta el directorio de compilación temporal y configura el límite de rutas de objetos. Si falla Ninja por rutas largas, revisar su versión y la [guía oficial de Reanimated para Windows](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/). No desactivar la arquitectura ni bajar versiones para ocultarlo. La validación nativa final está registrada en Implementación.

El SDK local incluía Ninja 1.10.2 y Windows tenía deshabilitadas las rutas largas. Este comando prepara Java/Ninja portátiles y monta una letra de unidad libre entre R: y Z: para acortar la ruta temporal de CMake, sin sustituir herramientas del SDK ni modificar el registro de Windows:

```powershell
npm.cmd run build:android:windows
```

Requiere Python, Node y Android SDK ya instalado. El script instala Ninja 1.13.2 en la carpeta temporal y comprueba el SHA-256 publicado; mantiene las variables solo en sus procesos y desmonta la unidad al terminar. `SINGLUTEN_NINJA` y `SINGLUTEN_CXX_ROOT` permiten controlar manualmente ambos ajustes. Si se cambia el plugin en un proyecto ya generado, regenerar las carpetas nativas antes de volver a compilar; conservar previamente cualquier cambio manual necesario mediante plugins.

El comando anterior produce ARM64. Para un emulador x86_64, usar `npm run build:android:windows -- --architecture x86_64`. Elegir la arquitectura del dispositivo: la traducción ARM anunciada por algunos emuladores no garantiza que el cargador de bibliotecas de React Native pueda ejecutar una APK ARM64. El resultado se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

Para crear una prueba instalable con JavaScript incorporado, sin necesitar Metro:

```powershell
npm.cmd run build:android:windows -- --variant preview --architecture universal
```

`universal` incluye ARM64 y x86_64 en una sola APK. El script fija el entorno beta, desactiva nube/emuladores para esa compilación y utiliza `assembleRelease` con la firma de desarrollo de la plantilla. No es una firma de publicación ni una distribución de tienda. Copia la APK a `artifacts/singluten-preview-universal.apk` y genera un JSON con arquitecturas, variante, necesidad de Metro y SHA-256. Los artefactos permanecen ignorados por Git. La variante `debug` conserva el funcionamiento de desarrollo. No modificar la firma de la plantilla para publicar: preparar credenciales de producción mediante el flujo de distribución elegido.

La APK de depuración necesita Metro ya disponible antes del arranque. Si Windows resuelve `localhost` a IPv6 y el emulador no alcanza Metro, iniciar el servidor en una terminal con resolución IPv4 para ese proceso:

```powershell
$env:NODE_OPTIONS = (($env:NODE_OPTIONS + ' --dns-result-order=ipv4first').Trim())
npm.cmd start -- --localhost --port 8081 --max-workers 2
```

En otra terminal, consultar `adb devices` y usar `adb -s SERIAL reverse tcp:8081 tcp:8081`, sustituyendo `SERIAL` por el dispositivo de pruebas. Esperar a que Metro esté listo antes de abrir la app. En esta revisión se utilizó un Pixel 8 API 35 iniciado con `-read-only` y sin guardar snapshots; no se conservaron las anotaciones ni los ajustes de prueba en el AVD original.

`eas.json` define desarrollo, preview interno y producción. Los identificadores `com.tumarre.singluten` son una propuesta: confirmar propiedad antes de registrar aplicaciones. Configurar proyecto EAS, firma y credenciales en la cuenta elegida; no se han creado builds remotos ni realizado publicaciones. Una APK de depuración compilada localmente requiere el servidor de desarrollo y no equivale a una beta de distribución.

iOS requiere macOS/Xcode o un servicio de build con las credenciales correspondientes. Probar en móviles físicos: cámara/linterna, denegación permanente de permisos, vuelta del segundo plano, modo sin red, almacenamiento, exportación, tipografía ampliada, VoiceOver/TalkBack y tema oscuro. Registrar modelo, sistema y versión de la app. El manifiesto debe mantener cámara sin audio y sin permisos de almacenamiento externo innecesarios.

## Web y operación

`npm run export:web` genera `dist/` como SPA. El alojamiento debe servir archivos reales y redirigir las rutas de navegación restantes a `index.html`; servir sobre HTTPS. `node scripts/serve-web.mjs` es un servidor local de revisión, no el despliegue productivo.

El service worker precarga código y recursos del mismo origen con versión por contenido. Mantiene cada pestaña en su versión de la aplicación: una actualización preparada se activa después de cerrar las pestañas anteriores, evitando mezclar código de dos versiones. No almacena respuestas de Open Food Facts ni datos de cuenta. Las fichas y observaciones privadas viven en IndexedDB. La primera visita sin red y los productos nunca guardados no pueden resolverse. Verificar estas políticas y el borrado de almacenamiento en el alojamiento definitivo.

Antes de publicar: resolver el control de seguridad de release, validar lenguaje y reglas de gluten con revisión experta, completar la matriz física, política de privacidad y contacto de soporte, medir latencia/fallos/costes en beta y acordar límites operativos. Las metas de los documentos de producto no son métricas ya logradas.

Para recuperar una versión problemática, reconstruir el commit anterior con sus lockfiles y configuración del entorno, probar sus contratos con las reglas y datos vigentes y publicar mediante el mecanismo elegido. No se ha instalado actualización remota automática ni ensayado una reversión real. Los cambios de esquema futuros necesitan migración y compatibilidad entre versiones antes del despliegue.
