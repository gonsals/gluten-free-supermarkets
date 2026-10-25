# Implementación y verificación

Fecha: **2026-10-25**. Este documento refleja el trabajo posterior a la auditoría del commit `3044a18`. El prototipo se ha sustituido por un MVP con arquitectura por responsabilidades, dependencias actualizadas y pruebas. No equivale todavía a una publicación validada en tiendas.

## Cambios aplicados

| Área | Implementación | Evidencia o límite |
| --- | --- | --- |
| Dependencias | Expo 58.0.19, React 19.3.0, React Native 0.88.0, Router 58.0.26, SQLite 58.0.14, Firebase 13.1.0 y herramientas compatibles actuales. | Versiones y avisos en [Dependencias](DEPENDENCIAS.md). |
| Limpieza | Eliminados cámara antigua, consulta duplicada, booleano de gluten, servicios inconexos y componentes de plantilla. | Un único contrato de producto y flujo de consulta. |
| Dominio | Interpretación pura y versionada: declaración sin gluten, gluten declarado, desconocido y contradictorio; trazas separadas. | Casos ausentes, malformados y contradictorios cubiertos por pruebas. Revisión experta pendiente antes de publicar. |
| Datos externos | Validación de códigos y respuestas; campos limitados; origen explícito; cancelación, timeout, errores y límites. | Tests deterministas de API; los tests habituales no dependen de un producto real que pueda cambiar. |
| Escáner | Cámara por foco/primer plano, bloqueo inmediato de lecturas repetidas, permisos, linterna y entrada manual. | Entrada manual y consulta real comprobadas en Android; cámara física pendiente. |
| Ficha | Evidencias, ingredientes, alérgenos/trazas, fuente, fechas, favoritos y actualización. | Recorrido web automatizado y revisión visual. |
| Almacenamiento | SQLite móvil / IndexedDB web, escrituras serializadas y transaccionales, esquema versionado y validación de contenido. | Persistencia, fallo de disco, concurrencia y protección frente a esquemas desconocidos probados. |
| Biblioteca | Historial de hasta 1.000 consultas y 250 favoritos activos, búsqueda, páginas de 20 y borrado. | Favoritos persisten tras recarga; limpiar historial conserva favoritos. |
| Sin conexión | Fichas guardadas con fecha; service worker de producción web para código/recursos, sin cachear peticiones de producto ni datos de cuenta. | Reapertura y recarga web sin red verificadas. Primera visita y productos nunca guardados necesitan conexión. |
| Precios | Anotaciones privadas de hasta 1.000 observaciones: importe, tienda, localidad, fecha, cantidad/unidad, ofertas y notas. | Validación de importes exactos y antigüedad; persistencia comprobada en navegador. |
| Cuenta | Alta/inicio por correo, recuperación, verificación y reautenticación para borrar cuenta. | Proveedor real habilitado; nube de la app desactivada hasta desplegar las funciones, incluido borrado. |
| Sincronización | Favoritos únicamente, manual y explícita, propietario vinculado, transacciones, marcas de borrado y resolución determinista de empates. | Dos bibliotecas simuladas intercambian favoritos y borrados en el emulador. |
| Contribuciones | Funciones `submitPrice`, `moderatePrice`, `deleteMyAccount`; verificación de correo, máximo 20 envíos diarios e idempotencia. | Pruebas de integración con Auth, Firestore y Functions locales. |
| Moderación | Pantalla para cuentas con custom claim `admin`; publicación mediante función autorizada. | La claim se verifica también en servidor. No se asigna desde la app. |
| Privacidad remota | Separación entre observaciones privadas y `publishedPrices` sin identificadores de autor/moderador; borrado de contribuciones y favoritos al borrar cuenta. | Pruebas de autoría y borrado; política TTL para la marca de seguridad de cuenta. |
| Configuración | `.env.example`, validación de entornos, protección de emuladores con proyecto `demo-`; `.env` deja de seguirse por Git. `.env.local` contiene la configuración pública verificada del proyecto existente. | Nube desactivada por defecto. Firestore y Auth reales preparados; [estado remoto](FIREBASE_REAL.md). |
| Calidad | ESLint, Prettier, TypeScript, Jest, Playwright, emuladores, CI y Dependabot. | Los cinco jobs de GitHub pasaron para `f2f5c42`; protección de ramas por revisar. |
| Identidad | B · Mesa elegida por el propietario el 25-10-2026: papel cálido, terracota, tipografía editorial y recursos regenerables. | Aplicación y comprobaciones en [Branding Mesa](BRANDING_MESA.md); nombre e identificadores de tienda aún por confirmar. |
| Operación | Exportación/borrado local, atribución, privacidad, perfiles EAS y telemetría técnica opcional sin historial ni códigos. | Endpoint de telemetría no configurado; no se ha medido estabilidad de una beta real. |

## Verificaciones realizadas

| Comprobación | Resultado |
| --- | --- |
| Instalación reproducible | `npm ci` en app y servidor correctos desde sus lockfiles, sin opciones para ignorar conflictos. |
| Tipos, ESLint y compatibilidad Expo | Correctos; Expo Doctor pasa sus **20 comprobaciones**. |
| Pruebas de dominio, API, repositorio y consulta | **56 pruebas correctas**, cuatro suites. |
| Reglas Firestore | **Siete pruebas correctas**, incluido aislamiento, moderación y separación de la vista pública. |
| Integración de nube | **Cinco pruebas correctas**: autenticación/validación, idempotencia/autoría/moderación, cuota, borrado y sincronización entre bibliotecas. |
| Navegador de producción | **Cinco recorridos correctos**: consulta/favorito/recarga/offline, datos insuficientes/trazas, recuperación de errores, precios privados y actualización sin mezclar versiones. |
| Funciones de servidor | Compilan y ejecutan correctamente en el emulador. |
| Exportación web | Correcta; SPA con rutas dinámicas y código dividido. |
| Exportación JavaScript Android e iOS | Correcta en ambas plataformas, con adaptadores nativos y bytecode Hermes. No equivale a compilar el binario iOS. |
| Preparación del proyecto Android | Correcta; manifiesto sin permiso de micrófono y copia de seguridad deshabilitada. |
| APK Android de depuración | Verificadas el 23 de octubre, ARM64 y x86_64, con Gradle, JDK 21 y Ninja 1.13.2. Repetidas desde `npm ci`; necesitan Metro. Rutas de CMake acortadas mediante una unidad temporal, sin cambios globales de Windows. |
| APK Android interna | **Preview universal ARM64/x86_64 de Mesa compilada el 25 de octubre**, JavaScript/Hermes incorporado, R8 y firma de desarrollo. `artifacts/singluten-preview-universal.apk`, 71.353.391 bytes; manifiesto adjunto con SHA-256. Sin Metro y con nube desactivada. Gradle correcto: 615 tareas. [Verificaci?n y l?mites](BRANDING_MESA.md). |
| Ejecución nativa Android | Pixel 8, Android 15 / API 35. En depuración: consulta real, favorito, ficha sin red y archivos SQLite/WAL/SHM comprobados. En la preview instalada: **arranque en frío sin red ni redirección ADB a Metro**, navegación y precio de 2,49 € guardado desde la interfaz. Tras cerrar la tarea desde recientes, el proceso terminó; otro arranque en frío cambió PID de 3756 a 4301 y recuperó `TiendaPreview · Madrid` con su importe. La prueba usa un AVD efímero sin guardar cambios. No sustituye móviles físicos. |
| iOS nativo | No compilado: el entorno de trabajo es Windows. |
| Firebase real | Firestore Standard en `europe-west1`, protegido contra borrado, reglas y cuatro índices desplegados; proveedor correo/contraseña habilitado. Comprobación remota de solo lectura correcta. Functions, TTL y activación de nube pendientes. |
| Tiendas | No publicadas. |
| Rediseño Mesa | Dirección elegida por el propietario el 25 de octubre; aplicada a pantallas y recursos. 56 pruebas de app y cinco recorridos web correctos; revisión visual y contraste en ambos temas. [Evidencia y límites](BRANDING_MESA.md). |

Los tests web utilizan respuestas de producto controladas, con datos de prueba. Acreditan la integración del recorrido y su recuperación; no certifican la calidad de todo el catálogo de Open Food Facts. Los tests completos de nube usan un proyecto ficticio sin acceso a producción. La comprobación remota adicional acredita configuración e inaccesibilidad anónima de rutas privadas; no equivale al recorrido completo de cuentas en el proyecto real.

## Decisiones de implementación

La biblioteca móvil utiliza SQLite como almacén transaccional con metadatos acotados y fichas separadas. En navegador se usa IndexedDB para evitar la dependencia de WebAssembly y cabeceras especiales de SQLite web. Las interfaces del repositorio permiten evolucionar las consultas sin acoplarlas a las pantallas.

El empaquetado Android limita Metro a dos procesos. El plugin `withAndroidBuildInputs` excluye artefactos y la copia de dependencias antigua del cálculo de entradas de Gradle: ignorarlas solo en Metro no evitaba que Gradle recorriera esos archivos antes de arrancar el empaquetador. La copia permanece conservada. La preview local genera un manifiesto de artefacto y el workflow de CI construye una preview ARM64 equivalente; el [run remoto de la base `f2f5c42`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40048795691) terminó correctamente, incluida la compilación Android.

La sincronización es manual: si no hay red falla de forma visible y conserva los cambios locales para el siguiente intento. No se ha implementado un servicio de sincronización permanente en segundo plano. Solo se suben favoritos y sus fichas; el historial permanece local. Los precios se comparten mediante una acción aparte y nunca al guardarlos en el cuaderno privado.

Las marcas de favoritos usan un reloj local monotónico por producto; en empate gana el borrado. Las reglas limitan relojes futuros. Las fichas más antiguas no sustituyen una ficha local más reciente. Esto es un mecanismo determinista de sincronización, no una garantía de ordenar perfectamente dispositivos con relojes muy desviados.

La seguridad de contribuciones reside en el servidor: la app no puede elegir autor ni publicar directamente. La colección pública contiene una copia aprobada sin identificadores personales; la observación original sigue restringida a su autor y moderación.

## Trabajo externo y validaciones pendientes

La decisión vigente del propietario es una versión local sin costes de backend. Las ampliaciones de nube siguientes quedan fuera del alcance actual y no son requisitos de publicación de esa versión sin cuentas. Los perfiles de compilación mantienen la nube desactivada.

- Solo para una ampliación futura de nube: crear un entorno independiente para beta y completar el servidor real. El proyecto existente ya tiene Auth, reglas e índices; Functions y TTL requieren completar la configuración de facturación. Véase [Firebase real](FIREBASE_REAL.md).
- Solo para esa ampliación: configurar y probar App Check con un proveedor apropiado para cada plataforma antes de decidir su obligatoriedad. El código de funciones permite exigirlo mediante `ENFORCE_APP_CHECK`; no se presenta como activado ahora.
- Resolver o evaluar los avisos transitivos sin parche disponible antes de la publicación; no hay avisos críticos en el nuevo informe.
- Probar cámara, linterna, permisos, reanudación, almacenamiento y exportación en Android e iOS físicos.
- Validar VoiceOver/TalkBack, tipografías ampliadas y comprensión de los resultados con personas usuarias y revisión experta del dominio.
- Registrar identidad definitiva, firma, cuentas de tiendas, soporte, presupuesto y responsables operativos.
- Medir latencia, estabilidad, coste y carga en una beta controlada. Los objetivos del documento de producto siguen siendo metas, no métricas ya conseguidas.
- Integraciones oficiales con supermercados, búsqueda global, mapas, listas de compra y alertas siguen siendo evoluciones a validar; no se simulan fuentes ni disponibilidad inexistentes.

El [plan inicial](PLAN_MEJORAS.md) se conserva como referencia de alcance y criterios. Los puntos anteriores impiden afirmar que todo el plan de publicación esté cerrado solo por tener código y pruebas locales.
