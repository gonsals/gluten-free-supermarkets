> **Documento historico.** Copia del contenido en `638980a`, archivada el 26-10-2026 antes de reorganizar el plan. No define prioridades ni estado vigentes. Consultar la [hoja de ruta actual](../HOJA_DE_RUTA.md). Los enlaces relativos se han adaptado a esta carpeta.

# Calidad, seguridad y operación

**Requisitos de calidad y operación**, 2026-10-23. La sección de evidencia inicial describe el prototipo antes de los cambios. Los resultados vigentes están en [Implementación](../IMPLEMENTACION.md), la seguridad actual en [Dependencias](../DEPENDENCIAS.md) y los comandos operativos en [Despliegue y pruebas](../DESPLIEGUE_Y_PRUEBAS.md). Se conservan los objetivos de publicación como controles pendientes hasta acreditarlos.

## 1. Evidencia actual y sus límites

Instalación limpia y TypeScript correctos. Exportación estática web correcta con ocho rutas y un bundle JavaScript de aproximadamente 1,61 MB sin medición de compresión. La exportación se hizo a una carpeta temporal, sin publicar nada.

Jest falla en su configuración, antes de ejecutar pruebas. Expo detecta 15 entradas desalineadas con su SDK. No se ejecutó lint porque falta configurarlo y el comando actual puede iniciar su instalación. No hay compilación ni prueba de cámara física de Android/iOS, auditoría de Firebase desplegado ni prueba de carga.

Estos resultados no constituyen aprobación para producción. Las mejoras están documentadas y pendientes de implementación.

## 2. Estrategia de pruebas

Priorizar comportamiento y riesgos. Los snapshots de texto son secundarios frente a reglas de dominio, datos externos, recuperación y permisos.

| Nivel | Casos necesarios | Verifica |
| --- | --- | --- |
| Dominio | Todos los casos de gluten, ausencia de datos, contradicciones, trazas, versión de reglas y normalización de códigos. | No inventar conclusiones y mantener reglas coherentes. |
| Adaptador API | Éxito, producto inexistente, `429`, `5xx`, timeout, JSON inválido, campos opcionales y respuesta malformada. | Traducir el contrato externo sin propagar fallos a la UI. |
| Consulta/hook | Cerrar durante carga, cambiar de código, respuesta antigua, error y reintento, mismo código dos veces. | Estado correcto y ausencia de resultados obsoletos. |
| Interfaz | Vacío, carga, error, ficha sin imagen/nombre y textos largos; acciones accesibles. | El usuario puede entender y completar el flujo. |
| Almacenamiento local | Reinicio, migración, límites, borrado, favoritos e historial separados. | Persistencia y recuperación reales. |
| Reglas remotas | Usuario A/B, sin sesión, rol normal/admin y payload inválido. | Aislamiento y protección del catálogo antes de nube. |
| Extremo a extremo móvil | Permisos, escaneo, ficha, error, reescaneo, historial y favoritos. | Comportamiento real de plataforma. |
| Carga | Consultas repetidas, caché fría/caliente, paginación y contribuciones si existen. | Latencia, cuotas y coste a volumen definido. |

Usar fixtures versionadas y representativas, con datos mínimos o sintéticos. Las pruebas habituales no deben depender de que un producto concreto de Open Food Facts conserve sus etiquetas. Separar comprobaciones reales del proveedor, de frecuencia acotada, de los tests deterministas de cada cambio.

## 3. Casos móviles obligatorios antes de beta

- Primera apertura con permiso concedido, denegado y bloqueado; entrada manual siempre recuperable.
- Salir de la pestaña del escáner, volver, bloquear/desbloquear el dispositivo y enviar la app a segundo plano.
- Encender linterna en hardware compatible y comprobar el comportamiento en otros dispositivos.
- Escanear rápidamente el mismo código: una consulta por captura aceptada. Cerrar y volver a escanearlo debe funcionar.
- Consultar A, cerrar durante la carga y consultar B: una respuesta tardía de A no debe reemplazar B.
- Error de red, timeout y no encontrado: volver al escáner limpia el error; reintentar no deja carga infinita.
- Código EAN/UPC con ceros iniciales, dato inválido y QR no compatible.
- Producto sin imagen/nombre/etiquetas, con trazas y con evidencia contradictoria.
- Ficha con ingredientes largos, pantalla pequeña y texto ampliado; botones visibles y alcanzables.
- Guardar favorito, cerrar la app y abrir sin red; consultar y borrar historial sin eliminar favoritos.
- Si hay cuenta: cambiar de usuario, sincronizar sin red, resolver altas/bajas y borrar cuenta sin que reaparezcan datos.

La matriz de dispositivos debe fijarse según el SDK objetivo e incluir al menos Android e iOS físicos de gamas distintas. Registrar sistema, modelo, versión de app y resultado; un navegador o simulador no valida por sí solo el escaneo real.

## 4. Integración continua propuesta

Ejecutar en cada cambio: instalación desde lockfile, tipos, lint, pruebas sin modo watch y exportación web. Añadir pruebas de reglas con emulador cuando exista Firebase conectado y builds nativas de desarrollo en cambios que afecten SDK, permisos o configuración nativa.

Comandos de referencia actuales, algunos pendientes de reparar:

```bash
npm ci
npx tsc --noEmit
npm run lint
npm test -- --watchAll=false --runInBand --ci
npx expo install --check
npx expo export --platform web
npm audit --package-lock-only --json
```

Fijar Node/npm y SDK; evitar instalación interactiva o actualizaciones del lockfile dentro de CI. Los jobs ordinarios no deben usar credenciales de producción. No publicar automáticamente desde una rama de trabajo sin proceso de release definido.

La auditoría de dependencias necesita interpretación: un aviso heredado de una herramienta de compilación tiene exposición diferente a una vulnerabilidad en un servicio público. Registrar excepciones justificadas con responsable, alcance y fecha de revisión; no silenciar categorías completas.

## 5. Dependencias: punto de partida

`npm audit --package-lock-only --json`, ejecutado el 2026-10-23, informa de **110 entradas afectadas**: 6 críticas, 77 altas, 22 moderadas y 5 bajas. Cuenta paquetes afectados, incluidas dependencias transitivas y herramientas, no incidentes ni ataques demostrados.

Entre las entradas críticas aparecen `@remix-run/node`, `form-data`, `protobufjs`, `shell-quote`, `tar` y `websocket-driver`. El informe incluye paquetes directos como Expo, React Native, Jest y navegación a través de sus cadenas. Hace falta reconstruir cada ruta con el informe actualizado y `npm explain <paquete>`.

Procedimiento: actualizar informe → identificar cadena y uso → elegir actualización compatible → instalar desde cero → ejecutar controles → verificar builds → registrar resolución o exposición residual. No aplicar `npm audit fix --force` como sustituto de la migración del SDK.

## 6. Configuración y entornos

| Entorno propuesto | Datos y finalidad |
| --- | --- |
| Local | Fixtures, emuladores y pruebas; configuración documentada. |
| Desarrollo/integración | Proveedor de pruebas cuando proceda, Firebase de pruebas y datos no productivos. |
| Beta | Build distribuida de forma controlada, origen de datos explícito y observabilidad validada. |
| Producción | Proyectos, permisos, claves públicas restringidas y servicios operativos propios. |

El hook actual apunta a staging de Open Food Facts y el servicio a producción. Unificarlos antes de distribuir. La API oficial [distingue ambos despliegues](https://openfoodfacts.github.io/openfoodfacts-server/api/) y documenta su uso e identificación de clientes.

Variables actuales: `EXPO_PUBLIC_PROJECT_ID` y `EXPO_PUBLIC_API_KEY`. Futuras variables de entorno y URL del proveedor deberán documentarse cuando se implementen, con validación y fallos comprensibles al arrancar. No añadir secretos administrativos a variables públicas ni a bundles web/móvil.

El `.env` versionado es un problema de configuración y separación de entornos; su clave pública Firebase no demuestra por sí sola una filtración de credenciales privilegiadas. Revisar restricciones, reglas y contenido antes de decidir medidas. Firebase [explica que estas claves identifican el proyecto y que la autorización depende de otros controles](https://firebase.google.com/docs/projects/api-keys).

## 7. Seguridad de aplicación y datos

- Validar códigos, URLs externas y payloads. No abrir automáticamente el contenido de un QR desconocido.
- Reglas de Firestore/Storage con denegación inicial, acceso por propietario, campos permitidos y roles protegidos. Versionar y probar lo que se despliega.
- Escritura del catálogo y publicación de precios desde un ingreso controlado. Verificar permisos en servicios administrativos que no queden cubiertos por las reglas de cliente.
- Contribuciones con autenticación, límites, idempotencia y moderación; no aceptar un `uid` o estado de publicación elegido libremente por el usuario.
- Imágenes remotas con límites y orígenes admitidos. Si se permiten subidas: tamaño/tipo, rutas por usuario, revisión y limpieza de metadatos innecesarios.
- Permisos mínimos: para un escáner no hace falta grabar audio. Revisar `recordAudioAndroid: true` y el permiso de micrófono actual al preparar la build.
- Errores sin credenciales ni volcados completos de respuestas. Retirar los `console.log` de producto y código del camino habitual.
- Cuentas y tokens según los mecanismos soportados por la plataforma; revisar persistencia y cierre de sesión cuando se implemente autenticación.

## 8. Privacidad y atribución

El historial de consultas puede revelar hábitos personales. Mantenerlo local por defecto en el MVP, con borrado y límites. Sincronizar solo con una función y una decisión de usuario claras; no recopilar perfiles de salud para ofrecer una consulta de producto.

Separar telemetría técnica de historial identificable. Documentar qué datos se recogen, finalidad, retención, acceso y eliminación según lo realmente implementado. Revisar requisitos aplicables al mercado elegido antes de publicar, especialmente si cambia el alcance o se recopila información sensible.

Mostrar atribución y enlace a Open Food Facts. Su [documentación de licencias](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/) distingue base de datos, contenidos e imágenes. Revisar las condiciones de un catálogo derivado y de las imágenes antes de distribuirlos; elegir la licencia del código por separado.

## 9. Observabilidad y presupuesto

| Señal | Para qué sirve | Precaución |
| --- | --- | --- |
| Fallos y cierres por versión/plataforma | Detectar regresiones de publicación. | Sin datos de producto o usuario innecesarios en el informe. |
| Latencia por etapa y fuente | Distinguir detección, red, caché y renderizado. | No mezclar resultados offline con respuestas del proveedor. |
| No encontrado, timeout, `429` y contrato inválido | Detectar problemas de catálogo, cuota o integración. | No interpretar «no encontrado» como «no apto». |
| Estado `unknown`/`conflicting` agregado | Vigilar calidad de datos e interpretación. | Sin vincular consultas a perfiles individuales. |
| Consultas externas y lecturas/escrituras remotas | Prever coste y necesidad de caché. | Paginación y límites; evitar listeners indiscriminados. |
| Cola de contribuciones/rechazos | Operar moderación cuando exista. | Acceso restringido y retención definida. |

Fijar presupuesto mensual y alertas antes de nube compartida. Medir coste por 1.000 consultas y simular 10× el volumen beta esperado. No hay un coste ni capacidad máxima demostrados en esta auditoría.

El objetivo inicial de sesiones sin cierre es 99,5 % en beta. La disponibilidad del proveedor se mide por separado; no prometer disponibilidad total de un servicio externo. Mostrar fallos y datos guardados con contexto.

## 10. Publicación y recuperación

Antes de beta: nombre e identificadores propios, esquema de enlaces, iconos, splash, permisos en español, política de privacidad, atribución, soporte y matriz de plataformas. Verificar los requisitos vigentes de las tiendas al preparar la publicación; no asumir que el SDK antiguo los cumple.

Separar canal de desarrollo, beta y producción. Asociar cada build a commit, versiones, entorno y migraciones. Cambios nativos o de runtime necesitan una build compatible; una actualización de JavaScript no sustituye ese requisito.

Publicar de forma gradual, vigilar errores y tener un responsable de recuperación. Documentar cómo detener una distribución y entregar una corrección; elegir el mecanismo concreto según la plataforma y servicio de builds que se adopte. Mantener las migraciones compatibles con las versiones todavía activas.

Si la nube guarda datos propios, definir copias, restauración y simulacro de recuperación. Para datos importados reconstruibles, conservar origen y proceso de reimportación. Restaurar una copia debe respetar la política de eliminación de datos personales.

## 11. Criterios para publicación general

- Flujo completo del MVP y casos de información ambigua verificados; lenguaje de resultado revisado.
- Tipos, lint, pruebas y builds pasan desde instalación limpia.
- Sin fallos críticos conocidos del recorrido; avisos de dependencias clasificados y riesgos aplicables resueltos.
- Cámara, segundo plano, permisos y accesibilidad comprobados en dispositivos soportados.
- Historial, favoritos, funcionamiento sin red y borrado probados tras reinicios y migraciones.
- Si hay nube: aislamiento entre usuarios, validación de contribuciones, índices y costes comprobados.
- Fuente, atribución, privacidad, licencia y soporte visibles y coherentes con la app.
- Monitorización, presupuesto, responsable operativo y recuperación preparados.

El estado actual todavía no satisface estos criterios. El [plan de mejoras](../PLAN_MEJORAS.md) define cómo alcanzarlos por fases.
