# SinGluten

App de compra en **Expo 58, React 19 y React Native 0.88**, con consulta de alimentos por código de barras, información sobre gluten basada en evidencia, biblioteca sin conexión y anotaciones de precios por tienda.

**Estado: MVP implementado y en validación.** La app y el servidor tienen pruebas automatizadas. El proyecto Firebase real ya tiene autenticación por correo y Firestore con reglas e índices desplegados; las funciones y la activación de nube en la app siguen pendientes. No se ha publicado en tiendas. El estado remoto y sus límites están en [Firebase real](docs/FIREBASE_REAL.md).

## Funcionalidades

- Inicio propio, navegación en español, iconos de marca y tema claro/oscuro.
- Entrada manual EAN/UPC con validación de formato y dígito de control, conservando ceros iniciales.
- Cámara trasera, linterna, permisos y recuperación mediante entrada manual. La cámara se desmonta al perder foco o pasar a segundo plano.
- Cliente único de Open Food Facts con campos acotados, timeout, cancelación, reintento limitado, caché de no encontrado y respeto de límites de consulta.
- Ficha con nombre, marca, imagen opcional, ingredientes, alérgenos, trazas, fuente y fechas. Distingue declaración sin gluten, gluten declarado, datos insuficientes y contradicciones.
- Favoritos e historial persistentes; búsqueda, listas acotadas y borrado. SQLite en móvil e IndexedDB en navegador.
- Consulta de fichas guardadas sin conexión. La exportación web incluye un service worker que conserva el código de la app, separado de los datos privados.
- Precios privados por código, tienda y localidad, con céntimos enteros, fechas, ofertas, cantidades y comparación contextualizada.
- Exportación y borrado de datos locales; ayuda, atribución y explicación de privacidad dentro de la app.
- Nube opcional: cuentas por correo, recuperación de contraseña, sincronización manual de favoritos, envío de precios a revisión, moderación autorizada y eliminación de cuenta.
- Reglas de acceso, índices, funciones de servidor, emuladores, CI y actualizaciones de dependencias mediante Dependabot.

La nube está **desactivada por defecto**. El historial no se sube al sincronizar favoritos. No hay integraciones que proporcionen precios oficiales o disponibilidad de supermercados: las cifras son observaciones con procedencia y fecha.

**Decisión vigente: funcionamiento local sin costes de backend.** No es necesario activar Firebase ni Blaze para usar escaneo, consultas, favoritos, historial, precios privados y exportación. Todos los perfiles EAS mantienen la nube desactivada. El código opcional de cuentas/sincronización queda como una ampliación futura, fuera de los requisitos de la versión local; no justifica contratar servicios. Las consultas nuevas a Open Food Facts necesitan conexión y respetan sus límites; las fichas guardadas se pueden consultar sin red.

## Ejecutar

Entorno fijado: **Node 24.16.0**, npm 11.13.0. Usar la versión de `.nvmrc`.

```bash
npm ci
npm start
```

La app local funciona sin Firebase configurado. Para personalizar el entorno, copiar `.env.example` a `.env.local` y rellenar solo la configuración necesaria. `EXPO_PUBLIC_*` es configuración visible en el cliente; nunca debe contener credenciales administrativas.

En PowerShell usar `npm.cmd`/`npx.cmd` si la política del equipo bloquea los archivos `.ps1`, sin cambiar esa política.

| Comando | Función |
| --- | --- |
| `npm run web` | Desarrollo en navegador. |
| `npm run android` | Genera/compila Android y lo ejecuta en un dispositivo o emulador configurado. |
| `npm run build:android:windows` | Compila APK de depuración ARM64 con herramientas portátiles y rutas cortas; requiere Python y Android SDK. |
| `npm run build:android:windows -- --variant preview --architecture universal` | Genera APK local ARM64/x86_64 con JavaScript incorporado y nube desactivada; firma de desarrollo, no válida para tiendas. |
| `npm run ios` | Genera/compila iOS; requiere macOS y Xcode. |
| `npm run check` | Generación de rutas tipadas, TypeScript, ESLint, pruebas y compatibilidad Expo. |
| `npm run test:e2e` | Exporta la app y comprueba el recorrido en Chromium con tamaño móvil. |
| `npm run export:web` | Genera `dist/` con rutas SPA y soporte sin conexión. |
| `npm run format` | Formatea el código del proyecto. |
| `npm run brand:generate` | Regenera iconos, marca y splash de Mesa desde los SVG versionados, sin servicios externos. |
| `npm run firebase:verify -- --project gluten-free-supermarket` | Comprueba región, protección de borrado, índices y lecturas anónimas del proyecto real, sin modificarlo. Requiere sesión de Firebase CLI. |
| `npm run secrets:check` | Revisa archivos publicables e historial con Gitleaks verificado; solo admite el hallazgo histórico exacto cuya clave ya fue revocada. |

Para Playwright, instalar una vez el navegador con `npx playwright install chromium`. En Linux de CI se usa `npx playwright install --with-deps chromium`.

## Servidor y pruebas de nube

```bash
npm --prefix functions ci
npm --prefix functions run build
npm run lint:server
npm run test:rules
npm run test:cloud
```

Los emuladores requieren **Java 21** en `JAVA_HOME`/`PATH`. En Windows, `python scripts/prepare-java.py` prepara un JDK portátil en la carpeta temporal y comprueba la suma del archivo; no modifica el Java del sistema. La [guía operativa](docs/DESPLIEGUE_Y_PRUEBAS.md) explica su uso.

Las pruebas usan exclusivamente el proyecto ficticio `demo-sin-gluten`. No necesitan acceso a la base de datos real. Activar la nube requiere desplegar las reglas, índices y funciones en un entorno de pruebas y habilitar autenticación; véase la guía antes de usar configuración de producción.

## Documentación

La [hoja de ruta vigente](docs/HOJA_DE_RUTA.md) organiza los siguientes pasos y las mejoras futuras. **B · Mesa es la dirección visual elegida por el propietario el 25-10-2026**: papel cálido, terracota y titulares editoriales. Su aplicación y los límites de validación están en [Branding Mesa](docs/BRANDING_MESA.md).

| Documento | Uso |
| --- | --- |
| [Próximos pasos y mejoras futuras](docs/HOJA_DE_RUTA.md) | Orden de trabajo, revisión prioritaria de branding, criterios de lanzamiento y evolución sin costes de backend. |
| [Revisión de branding](docs/BRANDING.md) | Brief, tres direcciones de diseño y comparativa visual navegable en claro/oscuro. |
| [Branding Mesa](docs/BRANDING_MESA.md) | Dirección elegida, sistema visual aplicado, recursos regenerables y comprobaciones de la app real. |
| [Validación de resultados sobre gluten](docs/VALIDACION_GLUTEN.md) | Iteración 3: guía offline, evidencia visible, doce casos reproducibles y protocolo de revisión experta todavía pendiente. |
| [Implementación y verificación](docs/IMPLEMENTACION.md) | Qué está aplicado, pruebas y límites actuales. |
| [Pruebas de la iteración 4](docs/PRUEBAS_ITERACION_4.md) | Seguridad reforzada, matriz ejecutada, exportación/borrado y comprobación Android sin conexión. |
| [Dependencias y seguridad](docs/DEPENDENCIAS.md) | Versiones, decisiones de compatibilidad y avisos pendientes. |
| [Despliegue y pruebas](docs/DESPLIEGUE_Y_PRUEBAS.md) | Configuración local, emuladores, nube, builds y operación. |
| [Firebase real](docs/FIREBASE_REAL.md) | Recursos configurados, verificaciones remotas y requisitos que faltan para activar la nube. |
| [Seguridad de credenciales](docs/SEGURIDAD_CREDENCIALES.md) | Clave histórica revocada, alcance del escaneo y prevención de nuevas exposiciones. |
| [Producto](docs/PRODUCTO.md) | Finalidad, reglas de evidencia y criterios de experiencia. |
| [Arquitectura](docs/ARQUITECTURA.md) | Diseño de referencia y responsabilidades. |
| [Plan de mejoras](docs/PLAN_MEJORAS.md) | Trazabilidad del plan inicial y avance de su ejecución. |
| [Auditoría inicial](docs/ESTADO_ACTUAL.md) | Estado histórico del prototipo del commit `3044a18`. |
| [Calidad y operación](docs/CALIDAD_Y_OPERACION.md) | Requisitos de calidad y publicación que deben mantenerse. |

## Organización

```text
app/                    Rutas: inicio, consulta, biblioteca, precios, ajustes y moderación
src/domain/             Producto, interpretación, códigos, precios y errores
src/data/open-food-facts/ Cliente externo y normalización
src/data/local/         Repositorio transaccional y adaptadores SQLite/IndexedDB
src/data/firebase/      Inicialización opcional y sincronización
src/features/           Funcionalidades y componentes de pantalla
src/shared/             Diseño, configuración, exportación y telemetría opcional
functions/              Validación, cuotas, moderación y borrado remoto
tests/                  Fixtures, pruebas de reglas, integración y navegador
plugins/                Ajustes reproducibles de la generación nativa
scripts/                Herramientas de desarrollo y exportación
```

## Interpretación y licencias

Un dato ausente no se convierte en «contiene gluten», ni una etiqueta recibida equivale a una certificación propia. La app muestra la evidencia de la fuente y sus limitaciones. Antes de una publicación dirigida a población celíaca se necesita validar el lenguaje y las reglas con revisión experta y pruebas de uso.

Código bajo [MIT](LICENSE). Los datos e imágenes de Open Food Facts tienen [licencias y condiciones independientes](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).
