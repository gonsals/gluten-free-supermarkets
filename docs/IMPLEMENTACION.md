# Implementación y verificación

Fecha: **2026-10-26**. Este documento refleja el trabajo posterior a la auditoría del commit `3044a18`. El propietario centra ahora el producto en comparación de precios, manteniendo gluten como función adicional. El MVP conserva arquitectura por responsabilidades, dependencias actualizadas y pruebas. No equivale todavía a una publicación validada en tiendas.

## Cambios aplicados

| Área | Implementación | Evidencia o límite |
| --- | --- | --- |
| Dependencias | Expo 58.0.19, React 19.3.0, React Native 0.88.0, Router 58.0.26, SQLite 58.0.14, Firebase 13.1.0 y herramientas compatibles actuales. | Versiones y avisos en [Dependencias](DEPENDENCIAS.md). |
| Limpieza | Eliminados cámara antigua, consulta duplicada, booleano de gluten, servicios inconexos y componentes de plantilla. | Un único contrato de producto y flujo de consulta. |
| Dominio | Interpretación pura y versionada: declaración sin gluten, gluten declarado, desconocido y contradictorio; trazas separadas. | Casos ausentes, malformados y contradictorios cubiertos por pruebas. Revisión experta pendiente antes de publicar. |
| Datos externos | Validación de códigos y respuestas; campos limitados; origen explícito; cancelación, timeout, errores y límites. | Tests deterministas de API; los tests habituales no dependen de un producto real que pueda cambiar. |
| Escáner | Cámara por foco/primer plano, bloqueo inmediato de lecturas repetidas, permisos, linterna y entrada manual. | Entrada manual y consulta real comprobadas en Android; cámara física pendiente. |
| Ficha | Evidencias, ingredientes, alérgenos/trazas, fuente, fechas, favoritos y actualización. | Recorrido web automatizado y revisión visual. |
| Almacenamiento | SQLite móvil / IndexedDB web, escrituras serializadas por instancia y transaccionales, esquema versionado y validación de contenido. | Persistencia, fallo de disco, esquemas desconocidos y, desde iteración 9, comparación/escritura atómica entre clientes. SQLite impide regresión a v1; IndexedDB se abre ahora con versión física 3. Refresco por ruta/foco, sin prometer vista instantánea entre ventanas. |
| Biblioteca | Historial de hasta 1.000 consultas y 250 favoritos activos, búsqueda, páginas de 20 y borrado. | Favoritos persisten tras recarga; limpiar historial conserva favoritos. |
| Sin conexión | Fichas guardadas con fecha; service worker de producción web para código/recursos, sin cachear peticiones de producto ni datos de cuenta. | Reapertura y recarga web sin red verificadas. Primera visita y productos nunca guardados necesitan conexión. |
| Cesta | Iteración 9: 100 productos, 1–99 envases, entrada desde producto/biblioteca/código, edición, persistencia y borrado. | Esquema/copia v2, migración v1 y control transaccional entre clientes. [Contrato y pruebas](CESTA_LOCAL.md). Totales completos/parciales disponibles en iteración 10. |
| Totales | Iteración 10: sucursales y vínculos explícitos, cantidades × precios elegibles, ranking completo y subtotales con faltantes. | Esquema/copia v3, migración v1/v2 y consultas públicas de hasta diez productos por acción. [Contrato y pruebas](TOTALES_Y_SUCURSALES.md). |
| Precios | Comparador por GTIN/envase, Open Prices público separado, hasta 1.000 anotaciones privadas y supermercado sugerido editable. | Edad, ofertas, ámbitos, límites y errores comprobados. [Contrato, fuente pública y cesta futura](COMPARADOR_DE_PRECIOS.md). |
| Cuenta | Alta/inicio por correo, recuperación, verificación y reautenticación para borrar cuenta. | Proveedor real habilitado; nube de la app desactivada hasta desplegar las funciones, incluido borrado. |
| Sincronización | Favoritos únicamente, manual y explícita, propietario vinculado, transacciones, marcas de borrado y resolución determinista de empates. | Dos bibliotecas simuladas intercambian favoritos y borrados en el emulador. |
| Contribuciones | Funciones `submitPrice`, `moderatePrice`, `deleteMyAccount`; verificación de correo, máximo 20 envíos diarios e idempotencia. | Pruebas de integración con Auth, Firestore y Functions locales. |
| Moderación | Pantalla para cuentas con custom claim `admin`; publicación mediante función autorizada. | La claim se verifica también en servidor. No se asigna desde la app. |
| Privacidad remota | Separación entre observaciones privadas y `publishedPrices` sin identificadores de autor/moderador; borrado de contribuciones y favoritos al borrar cuenta. | Pruebas de autoría y borrado; política TTL para la marca de seguridad de cuenta. |
| Configuración | `.env.example`, validación de entornos, protección de emuladores con proyecto `demo-`; `.env` deja de seguirse por Git. `.env.local` contiene la configuración pública verificada del proyecto existente. | Nube desactivada por defecto. Firestore y Auth reales preparados; [estado remoto](FIREBASE_REAL.md). |
| Calidad | ESLint, Prettier, TypeScript, Jest, Playwright, emuladores, CI y Dependabot. | Los cinco jobs de GitHub pasaron para [`638980a`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028), incluida la iteración 8; protección de ramas por revisar. |
| Identidad | B · Mesa elegida por el propietario el 25-10-2026: papel cálido, terracota, tipografía editorial y recursos regenerables. | Aplicación y comprobaciones en [Branding Mesa](BRANDING_MESA.md); nombre e identificadores de tienda aún por confirmar. |
| Operación | Exportación/restauración/borrado local, atribución, privacidad, perfiles EAS y telemetría técnica opcional sin historial ni códigos. | Copias con validación y sustitución transaccional; sin fusión ni cuentas heredadas. [Recuperación](COPIAS_LOCALES.md). Endpoint de telemetría no configurado; no se ha medido estabilidad de una beta real. |

## Verificaciones realizadas

| Comprobación | Resultado |
| --- | --- |
| Instalación reproducible | `npm ci` en app y servidor correctos desde sus lockfiles, sin opciones para ignorar conflictos. |
| Tipos, ESLint y compatibilidad Expo | Correctos; Expo Doctor pasa sus **20 comprobaciones**. |
| Pruebas de app | **183 pruebas correctas**, dieciséis suites, tras la iteración 10; dominio, API, repositorio, consulta, permisos, confirmaciones, copias, comparación y tiendas. Incluye doce casos sintéticos de revisión. |
| Seguridad de iteración 9 | **35 pruebas correctas**, incluidos los triggers SQLite contra escrituras de un cliente v1 y rollback de fichas; auditoría de desarrollo correcta con las mismas excepciones exactas, publicación todavía bloqueada. |
| Reglas Firestore | **Siete pruebas correctas**, incluido aislamiento, moderación y separación de la vista pública. |
| Integración de nube | **Cinco pruebas correctas**: autenticación/validación, idempotencia/autoría/moderación, cuota, borrado y sincronización entre bibliotecas. |
| Navegador de producción | **36 recorridos correctos en la ejecución final**: consulta y biblioteca offline, evidencia, cesta, precios públicos/privados, sugerencias de tienda, actualización, copias/borrado, accesibilidad y permisos/cancelación. |
| Funciones de servidor | Compilan y ejecutan correctamente en el emulador. |
| Exportación web | Correcta; SPA con rutas dinámicas y código dividido. |
| Exportación JavaScript Android e iOS | Correcta en ambas plataformas, con adaptadores nativos y bytecode Hermes. No equivale a compilar el binario iOS. |
| Preparación del proyecto Android | Correcta; manifiesto sin permiso de micrófono y copia de seguridad deshabilitada. |
| APK Android de depuración | Verificadas el 23 de octubre, ARM64 y x86_64, con Gradle, JDK 21 y Ninja 1.13.2. Repetidas desde `npm ci`; necesitan Metro. Rutas de CMake acortadas mediante una unidad temporal, sin cambios globales de Windows. |
| APK Android interna | **Preview universal ARM64/x86_64 de Mesa compilada el 25 de octubre**, JavaScript/Hermes incorporado, R8 y firma de desarrollo. `artifacts/singluten-preview-universal.apk`, 71.353.391 bytes; manifiesto adjunto con SHA-256. Sin Metro y con nube desactivada. Gradle correcto: 615 tareas. [Verificación y límites](BRANDING_MESA.md). |
| Ejecución nativa Android | Pixel 8, Android 15 / API 35. En depuración: consulta real, favorito, ficha sin red y archivos SQLite/WAL/SHM comprobados. En la preview instalada: **arranque en frío sin red ni redirección ADB a Metro**, navegación y precio de 2,49 € guardado desde la interfaz. Tras cerrar la tarea desde recientes, el proceso terminó; otro arranque en frío cambió PID de 3756 a 4301 y recuperó `TiendaPreview · Madrid` con su importe. La prueba usa un AVD efímero sin guardar cambios. No sustituye móviles físicos. |
| iOS nativo | No compilado: el entorno de trabajo es Windows. |
| Cesta nativa de iteración 9 | APK universal actualizada desde iteración 8, biblioteca v1 conservada, cantidad persistida sin red tras reiniciar y copia v2 restaurada. Vaciar cesta conserva favorito/precio. Pixel 8 / API 35 emulado; [paquete, matriz y límites](CESTA_LOCAL.md). |
| Totales nativos de iteración 10 | APK universal actualizada desde iteración 9, cesta v2 con cinco precios preservada, sucursales registradas desde UI, completo 4,50 € y parcial 2,10 €. Arranque en frío y restauración v3 conservan vínculos/resultado. [Paquete y evidencia](TOTALES_Y_SUCURSALES.md). |
| Firebase real | Firestore Standard en `europe-west1`, protegido contra borrado, reglas y cuatro índices desplegados; proveedor correo/contraseña habilitado. Comprobación remota de solo lectura correcta. Functions, TTL y activación de nube pendientes. |
| Tiendas | No publicadas. |
| Rediseño Mesa | Dirección elegida por el propietario el 25 de octubre; aplicada a pantallas y recursos. 56 pruebas de app y cinco recorridos web correctos; revisión visual y contraste en ambos temas. [Evidencia y límites](BRANDING_MESA.md). |
| Claridad de resultados | Iteración 3: evidencias ausentes, trazas, fuente y fecha junto al resumen; guía local y corrección de validación de jerarquía. [Protocolo de validación](VALIDACION_GLUTEN.md). No equivale a revisión experta realizada. |
| Seguridad y pruebas de iteración 4 | 73 pruebas de app, 34 de seguridad, ocho recorridos web, siete de reglas y cinco de nube correctos. Incluye exportación/cancelación/borrado y auditoría con validación de fecha, ámbito e informes. [Matriz y evidencia](PRUEBAS_ITERACION_4.md). El control de release sigue bloqueado por los avisos de terceros. |
| Accesibilidad y datos de iteración 5 | Confirmaciones desplazables con título, protección durante el borrado, selección accesible y etiquetas de navegación ampliables. 75 pruebas de app, 34 de seguridad y doce recorridos web. [Matriz y límites](ACCESIBILIDAD_Y_DATOS.md). No equivale a validación física ni con TalkBack/VoiceOver. |
| Escáner de iteración 6 | Ciclo y permisos desacoplados; errores tratados, solicitudes obsoletas descartadas y vuelta segura desde segundo plano. 88 pruebas de app, 34 de seguridad y quince recorridos web correctos. [Matriz y límites](ESCANER_Y_PERMISOS.md). |
| Copias locales de iteración 7 | Formato versionado compatible con exportaciones v1 anteriores, validación y límites, resumen, sustitución transaccional y aviso de fichas recuperadas. 125 pruebas de app, 34 de seguridad y diecinueve recorridos web. Restauración web → Android, reinicio completo y rechazo de archivos comprobados sin red en emulador. [Matriz y límites](COPIAS_LOCALES.md). |
| APK de iteración 3 | Preview universal incremental compilada correctamente: 71.358.559 bytes, guía incorporada, sin Metro y con nube desactivada. `artifacts/singluten-iteration-3-preview-universal.apk`, firma de desarrollo y manifiesto/checksum adjuntos. No sustituye pruebas físicas. |

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
- La cesta local ya está implementada (CES-01/CES-02). TIE-01/CES-03 están implementadas en iteración 10; formatos/alternativas (UNI-01/ALT-01) se entregaron en iteración 11. DAT-01 se midió en iteración 12 y DAT-03 se investigó en iteración 13, sin nueva integración aprobada. La siguiente entrega es la validación técnica integrada (CAL-01). Búsqueda global, mapas, alertas e integraciones oficiales requieren validar demanda y fuentes; no se simulan disponibilidad ni datos.

La [hoja de ruta](HOJA_DE_RUTA.md) y el [backlog vigente](PLAN_MEJORAS.md) ordenan el comparador y su evolución a cesta. El [plan anterior](historico/README.md) queda archivado. CES-01/CES-02 tienen implementación técnica en la iteración 9; TIE-01/CES-03 se entregan técnicamente en iteración 10; la siguiente entrega es **UNI-01 + ALT-01**. Los puntos anteriores impiden dar por cerrada la publicación por tener código y pruebas locales.

## Iteración 11 · Formatos y alternativas

Implementación y límites en [Formatos y alternativas](FORMATOS_Y_ALTERNATIVAS.md): precio unitario, multipacks, grupos privados confirmados, necesidad/envases/sobrante, filtro de evidencia sin gluten y copias v4. El siguiente paso de datos es DAT-01. La actualización compatible Expo 58.0.21/RN 0.88.1 incluye revisión de seguridad; deepmerge mantiene bloqueado el control de dependencias, sin ampliar excepciones.

## Iteración 12 · Medición pública DAT-01

[Informe, muestra y decisión](COBERTURA_PRECIOS_PUBLICOS.md): diez GTIN fijados antes de consultar, 20 GET de precios a producción más uno de preproducción. 33 observaciones compatibles y cero elegibles para la muestra Madrid; sin cestas completas ni errores de proveedor. Plan, instantánea pública y resumen ODbL separados de la biblioteca y de la caché de la app. Reproducción offline con `npm run coverage:prices -- --replay`; nuevas consultas acotadas con `--collect`, sin subir anotaciones ni activar servicios.

Comprobaciones: 220 pruebas de app, 42 de seguridad, tipos, lint y compatibilidad Expo. Las pruebas del colector simulan red, presupuesto, 429 y preproducción; no repiten la consulta pública. No se cambia el contrato v4. DAT-03 pasa a P1 para evaluar una fuente adecuada antes de integrarla; DAT-02 sigue condicionada. El control de dependencias sigue bloqueado por deepmerge, sin ampliar excepciones.

## Iteración 13 · Viabilidad de otras fuentes

[DAT-03 investigada](FUENTES_PUBLICAS.md): Carrefour, FACUA y el conjunto MAPA de origen/mayorista. La evidencia no permite aprobar otro proveedor; permisos/contrato no acreditados o ámbito incompatible. No se descargan catálogos, incorporan precios ni crean adaptadores internos sin contrato. Integración condicionada; siguiente entrega CAL-01 técnica con anotaciones sintéticas declaradas. No acredita compra física, accesibilidad nativa ni revisión experta.

Entrega de documentación y corrección del selector ambiguo de avisos en la prueba web de alternativas, sin cambios de runtime, dependencias, almacenamiento v4 o nube. Se validan enlaces, tareas, históricos y secretos; se repiten tipos, lint, compatibilidad Expo, 220 pruebas de app, 42 de seguridad y 42 recorridos web. La auditoría actual mantiene el bloqueo por deepmerge, sin ampliar excepciones.
