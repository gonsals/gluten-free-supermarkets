# SinGluten

App de compra en **Expo 58, React 19 y React Native 0.88**, enfocada en comparar precios por producto y tienda con aportaciones públicas de Open Prices y anotaciones privadas. Conserva información sobre gluten como función adicional, escaneo y biblioteca sin conexión.

**Prioridad elegida el 26-10-2026: comprar de forma más económica.** La comparación actual es por código y envase; la cesta local ya guarda cantidades. Los totales por establecimiento y los grupos explícitos de formatos/alternativas ya están disponibles. La medición inicial de Madrid no da cobertura suficiente; la revisión de tres fuentes no permite aprobar otra integración. El recorrido completo ya tiene validación técnica con precios de ensayo y recuperación offline; la compra real sigue pendiente. [Alcance y fuentes](docs/COMPARADOR_DE_PRECIOS.md).

**Estado: comparador, cesta y alternativas implementados técnicamente.** Mi cesta guarda productos y cantidades; Comparar total por tienda separa cestas completas y subtotales por sucursal confirmada. Mi cesta → Formatos y alternativas permite confirmar sustitutos, comparar desembolso y sobrante. Copias v4 conservan grupos, identificaciones y vínculos. DAT-01 medida: 0/10 productos con precio elegible en la muestra de Madrid. DAT-03 investigada: integración adicional condicionada a una fuente adecuada. CAL-01 técnica verificada con cuatro recorridos nuevos. Siguiente: CAL-02, Android emulado y preparación de la matriz física. [Orden y criterios vigentes](docs/HOJA_DE_RUTA.md). No se ha publicado en tiendas. Firebase permanece como ampliación opcional desactivada, fuera del núcleo; [estado remoto](docs/FIREBASE_REAL.md).

## Funcionalidades

- Inicio propio, navegación en español, iconos de marca y tema claro/oscuro.
- Entrada manual EAN/UPC con validación de formato y dígito de control, conservando ceros iniciales.
- Cámara trasera, linterna, permisos y recuperación mediante entrada manual. La cámara se desmonta al perder foco o pasar a segundo plano.
- Cliente único de Open Food Facts con campos acotados, timeout, cancelación, reintento limitado, caché de no encontrado y respeto de límites de consulta.
- Ficha con nombre, marca, imagen opcional, ingredientes, alérgenos, trazas, fuente y fechas. Distingue declaración sin gluten, gluten declarado, datos insuficientes y contradicciones.
- Favoritos e historial persistentes; búsqueda, listas acotadas y borrado. SQLite en móvil e IndexedDB en navegador.
- Consulta de fichas guardadas sin conexión. La exportación web incluye un service worker que conserva el código de la app, separado de los datos privados.
- Comparación por código y envase, con tienda, sucursal, fuente y fecha; lectura pública de Open Prices sin cuenta ni clave, separada de los precios privados.
- Cesta privada de hasta 100 productos distintos y 99 envases enteros por producto, con entrada desde ficha/biblioteca/código, edición, recuperación y borrado. Totales completos/parciales por sucursal confirmada, sin asignar cero a los faltantes.
- Sugerencia editable de supermercado a partir de tiendas declaradas o marcas reconocidas; fechas, ofertas, cantidades y notas privadas.
- Exportación, restauración transaccional y borrado de datos locales. Las copias se validan y muestran un resumen antes de sustituir la biblioteca; ayuda, atribución y privacidad dentro de la app.
- Nube opcional: cuentas por correo, recuperación de contraseña, sincronización manual de favoritos, envío de precios a revisión, moderación autorizada y eliminación de cuenta.
- Reglas de acceso, índices, funciones de servidor, emuladores, CI y actualizaciones de dependencias mediante Dependabot.

La nube de cuentas está **desactivada por defecto**. El historial no se sube al sincronizar favoritos. Open Prices aporta observaciones públicas con cobertura colaborativa; no son tarifas oficiales ni disponibilidad de supermercados. Comparar no envía los precios privados.

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
| [Validación integrada de compra](docs/VALIDACION_COMPRA.md) | Iteración 14: importes independientes, sustitución, fuentes vinculadas, 429 y recuperación offline. |
| [Viabilidad de fuentes públicas](docs/FUENTES_PUBLICAS.md) | Iteración 13: Carrefour, FACUA y MAPA; decisión, límites y requisitos de un posible piloto. |
| [Hoja de ruta vigente](docs/HOJA_DE_RUTA.md) | Cesta → totales por establecimiento → formatos/alternativas → validación → beta; cobertura y seguridad en paralelo. |
| [Revisión de branding](docs/BRANDING.md) | Brief, tres direcciones de diseño y comparativa visual navegable en claro/oscuro. |
| [Branding Mesa](docs/BRANDING_MESA.md) | Dirección elegida, sistema visual aplicado, recursos regenerables y comprobaciones de la app real. |
| [Validación de resultados sobre gluten](docs/VALIDACION_GLUTEN.md) | Iteración 3: guía offline, evidencia visible, doce casos reproducibles y protocolo de revisión experta todavía pendiente. |
| [Implementación y verificación](docs/IMPLEMENTACION.md) | Qué está aplicado, pruebas y límites actuales. |
| [Pruebas de la iteración 4](docs/PRUEBAS_ITERACION_4.md) | Seguridad reforzada, matriz ejecutada, exportación/borrado y comprobación Android sin conexión. |
| [Accesibilidad y datos](docs/ACCESIBILIDAD_Y_DATOS.md) | Iteración 5: confirmaciones desplazables, texto ampliado, teclado, estados accesibles y conservación de datos al actualizar. |
| [Escáner y permisos](docs/ESCANER_Y_PERMISOS.md) | Iteración 6: errores y respuestas tardías de permisos, alternativa manual y ciclo de cámara/linterna. |
| [Copias locales y recuperación](docs/COPIAS_LOCALES.md) | Iteración 7: formato versionado, validación de archivos, resumen y restauración sin nube ni cuenta. |
| [Cobertura pública](docs/COBERTURA_PRECIOS_PUBLICOS.md) | Iteración 12: muestra real de diez GTIN, datos públicos reproducibles y decisión de alcance. No hay cesta pública completa en la muestra. |
| [Formatos y alternativas](docs/FORMATOS_Y_ALTERNATIVAS.md) | Iteración 11: cantidades, multipacks, grupos privados revisables, sustituciones confirmadas y copias v4. |
| [Totales y sucursales](docs/TOTALES_Y_SUCURSALES.md) | Iteración 10: identidad explícita, ranking de cestas completas, subtotales, consultas acotadas y copias v3. |
| [Cesta local](docs/CESTA_LOCAL.md) | Iteración 9: cantidades, esquema y copias v2, migración y protección entre clientes. |
| [Comparador de precios](docs/COMPARADOR_DE_PRECIOS.md) | Iteración 8: nueva prioridad, supermercados sugeridos, fuente pública integrada, comparación y cesta futura. |
| [Dependencias y seguridad](docs/DEPENDENCIAS.md) | Versiones, decisiones de compatibilidad y avisos pendientes. |
| [Despliegue y pruebas](docs/DESPLIEGUE_Y_PRUEBAS.md) | Configuración local, emuladores, nube, builds y operación. |
| [Firebase real](docs/FIREBASE_REAL.md) | Recursos configurados, verificaciones remotas y requisitos que faltan para activar la nube. |
| [Seguridad de credenciales](docs/SEGURIDAD_CREDENCIALES.md) | Clave histórica revocada, alcance del escaneo y prevención de nuevas exposiciones. |
| [Producto](docs/PRODUCTO.md) | Compra económica, precios, cobertura, cesta completa/parcial y gluten complementario. |
| [Arquitectura](docs/ARQUITECTURA.md) | Base local actual y diseño pendiente de cesta, migraciones, tiendas y proveedores. |
| [Backlog de ejecución](docs/PLAN_MEJORAS.md) | IDs, prioridades, dependencias, estados y criterios de entrega del nuevo enfoque. |
| [Planificación histórica](docs/historico/README.md) | Plan anterior conservado; deja de definir prioridades y estado vigentes. |
| [Auditoría inicial](docs/ESTADO_ACTUAL.md) | Estado histórico del prototipo del commit `3044a18`. |
| [Calidad y operación](docs/CALIDAD_Y_OPERACION.md) | Evidencia actual, pruebas de totales/cobertura/datos, beta y bloqueos de publicación. |

## Organización

```text
app/                    Rutas: inicio, consulta, biblioteca, precios, ajustes y moderación
src/domain/             Producto, interpretación, códigos, precios y errores
src/data/open-food-facts/ Fichas y normalización de evidencia
src/data/open-prices/   Lectura pública acotada y normalización de precios
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

Código bajo [MIT](LICENSE). Los datos e imágenes de Open Food Facts tienen [licencias y condiciones independientes](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/). Precios públicos: Open Prices/ODbL; ubicaciones: © OpenStreetMap contributors/ODbL. [Fuentes, atribución y límites implementados](docs/COMPARADOR_DE_PRECIOS.md).
