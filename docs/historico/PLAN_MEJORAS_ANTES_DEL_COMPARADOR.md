> **Documento historico.** Copia del contenido en `638980a`, archivada el 26-10-2026 antes de reorganizar el plan. No define prioridades ni estado vigentes. Consultar la [hoja de ruta actual](../HOJA_DE_RUTA.md). Los enlaces relativos se han adaptado a esta carpeta.

# Plan de mejoras y criterios de entrega

**Plan inicial del 2026-10-23, seguimiento actualizado el 2026-10-25.** Los criterios originales se conservan; el seguimiento siguiente distingue implementación local de validación de publicación. Las pruebas y decisiones vigentes están en [Implementación](../IMPLEMENTACION.md). El punto de partida histórico es [Estado actual](../ESTADO_ACTUAL.md).

## Seguimiento de ejecución

Para decidir el trabajo siguiente, consultar la [hoja de ruta vigente](../HOJA_DE_RUTA.md). Tras rechazar la primera identidad, el propietario eligió **B · Mesa el 25-10-2026**; su aplicación se documenta en [Branding Mesa](../BRANDING_MESA.md). Aquí se conserva el plan original como trazabilidad.

| IDs | Estado del código y evidencia | Pendiente para cerrar el criterio completo |
| --- | --- | --- |
| B-01 | Stack actualizado conjuntamente, lockfiles, comprobaciones y exportaciones. | Validación nativa completa, especialmente iOS. |
| B-02 | Auditorías comparadas, correcciones compatibles y control de excepciones temporales en CI. | Resolver/evaluar los avisos transitivos antes de publicar. |
| B-03 a B-06 | Dependencias antiguas retiradas, Node/npm fijados, tests útiles, lint y configuración segura local. | Revisión de configuración del entorno real al activarlo. |
| B-07 | Workflow ejecutado correctamente en GitHub para la base `f2f5c42`, incluidos app, Firebase, dependencias, secretos y Android. | Revisar protección de rama y mantener controles por cambio. |
| G-01 a G-03 | Dominio versionado, cliente único y control de consulta con pruebas. | Revisión experta del lenguaje y de las reglas. |
| G-04 a G-06 | Cámara, entrada manual y ficha implementadas; recuperación web probada. | Cámara física, lectores de pantalla y fuentes ampliadas nativas. |
| M-01 a M-05 | Biblioteca, persistencia, offline, identidad, ayuda, exportación y borrado implementados. | Validación de uso y accesibilidad en dispositivos. |
| M-06, R-03, R-06 | Base preparada para beta. | Personas usuarias, matriz física y métricas de beta. |
| R-01 | Identificadores, permisos mínimos y perfiles definidos. Preview ARM64/x86_64 instalada y probada sin Metro; manifiesto con SHA-256 y firma de desarrollo. | Confirmar identidad, firma de publicación y distribución real en dispositivos físicos. |
| R-02 | Eventos técnicos con campos permitidos y envío desactivado sin endpoint. | Receptor, retención, alertas y medición en beta. |
| R-04 | Guía de despliegue y recuperación escrita. | Responsables y ensayo real de reversión. |
| R-05 | Licencia MIT y atribución incluidas. | Revisión de textos finales y titularidad antes de publicar. |
| C-01 a C-03 | Cuenta opcional, reglas, transacciones y sincronización manual de favoritos probadas en emuladores. Auth, base europea, reglas e índices ya configurados en el proyecto real; lecturas privadas sin autenticar rechazadas. | Functions, entorno independiente de beta y pruebas de dos cuentas. Nube de la app desactivada; [detalle remoto](../FIREBASE_REAL.md). |
| C-04 | Caché local y refresco bajo demanda. | Caché compartida global, si el uso medido la justifica. |
| C-05 | Exportación local, borrado autenticado y bloqueo temporal remoto implementados y probados en emuladores. | Desplegar y verificar borrado/TTL con facturación configurada; política final de retención y copias de seguridad real. |
| P-01, P-02 | Observaciones privadas por tienda/sucursal, modelo validado y procedencia explícita. | Validación de utilidad con personas compradoras. |
| P-03 | Envío verificado, cuota, idempotencia y moderación implementados y probados. | Canal de reportes de usuarios y operación de moderación en beta. |
| P-04 | Consulta paginada compartida, precio por unidad y antigüedad visibles. | Pruebas de uso para comparación de formatos. |
| P-05 | Índices, límites de consulta y máximo de instancias definidos. | Prueba de carga, presupuesto y costes observados. |

Las evoluciones P3 no se consideran requisitos implementados: necesitan validar demanda y fuentes. No hay integración oficial con supermercados ni promesa de existencias.

Decisión vigente del propietario, 2026-10-24: mantener la versión local sin costes de backend. Las funciones de nube de C-01 a C-05 y la publicación compartida de P-03 son ampliaciones futuras, no requisitos para entregar la app local. No activar Blaze ni condicionar la versión local a desplegar Functions. Todos los perfiles EAS desactivan la nube.

## 1. Orden y prioridades

- **P0:** bloquea una interpretación fiable de la información principal.
- **P1:** necesario para un MVP estable o para activar de forma segura la función asociada.
- **P2:** mejora de experiencia, mantenimiento o ampliación del producto; algunos elementos serán requisito de publicación dentro de su fase.
- **P3:** evolución que exige validar demanda y viabilidad antes de construirla.

Orden propuesto: base técnica y reglas → escaneo completo → utilidad local → beta → nube opcional → precios. Las tareas de seguridad de nube son obligatorias antes de conectar escrituras, aunque esa fase llegue después del MVP local.

El esfuerzo indicado es relativo: S = acotado, M = varios componentes, L = transversal. No es una estimación de calendario; faltan responsables, disponibilidad, dispositivos y alcance definitivo.

## 2. Fase 0 · Recuperar una base técnica verificable

Objetivo: poder instalar, comprobar, probar y compilar de manera reproducible antes de ampliar funciones.

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| B-01 | P1 / M | Elegir SDK objetivo y actualizar de forma coordinada Expo, React Native, Router, navegación, Jest y renderer. | Matriz compatible documentada; instalación limpia, tipos y comprobación de Expo pasan; builds de desarrollo Android/iOS verificadas. |
| B-02 | P1 / M | Clasificar los avisos de `npm audit` por cadena, entorno y posibilidad de explotación; resolver los aplicables. | Registro con versión, exposición y resolución; ningún crítico/alto aplicable sin resolver antes de publicar. |
| B-03 | P1 / S | Retirar dependencias sin uso, empezando por revisar `react-native-camera`; fijar Node y gestor de paquetes. | No quedan imports rotos; lockfile actualizado de forma controlada; versión de entorno en README y CI. |
| B-04 | P1 / S | Reparar Jest y establecer una primera prueba real del dominio. | Pruebas ejecutadas, no solo suite iniciada; no se aceptan snapshots actualizados para ocultar fallos. |
| B-05 | P2 / S | Configurar ESLint y scripts de comprobación; retirar o reparar `reset-project`. | Todos los comandos documentados funcionan sin configuración interactiva en CI. |
| B-06 | P1 / S | Preparar `.env.example`, validación de configuración y separación de entornos. Revisar seguimiento de `.env`. | Ejemplo sin valores reales; secretos de servidor fuera del cliente; proyecto de pruebas separado antes de escrituras. |
| B-07 | P1 / M | CI con instalación limpia, tipos, lint, tests y exportación web. | Un fallo bloquea integración; resultados visibles por cambio. |

Actualizar primero las incompatibilidades conocidas del SDK existente puede ayudar a recuperar una referencia, pero **no es el destino final** si deja problemas aplicables sin resolver. Elegir una versión de SDK mantenida y verificar cada salto siguiendo la [guía oficial de actualización](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). No aplicar versiones mayores aisladas propuestas por una herramienta sin validar el conjunto.

Salida de fase: entorno reproducible y comprobaciones útiles. Todavía no implica tener un producto completo.

## 3. Fase 1 · Consulta y resultado fiables

Objetivo: que el escáner resuelva el recorrido principal sin conclusiones inventadas ni estados atascados.

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| G-01 | P0 / M | Implementar modelo de evidencia y reglas de [Producto](../PRODUCTO.md). Sustituir booleano por estados y señales. | Casos con ausencia, etiquetas, gluten declarado, trazas y contradicciones probados; ficha y persistencia usan la misma interpretación. |
| G-02 | P1 / M | Unificar clientes Open Food Facts y validar respuestas externas. | Un adaptador por contrato; campos opcionales no rompen UI; entornos explícitos; fuente y fechas conservadas. |
| G-03 | P1 / M | Definir estado de consulta, cancelación, timeout y reintentos limitados. | Respuesta antigua descartada; cerrar/reintentar limpia estado; fallo HTTP, sin red y no encontrado se distinguen. |
| G-04 | P1 / M | Controlar cámara por foco y primer plano, errores de montaje y permisos. | Cámara inactiva al salir; retorno funcional; denegación permanente tiene salida útil. |
| G-05 | P1 / M | Validar códigos, bloquear eventos repetidos y añadir entrada manual. | Un escaneo produce una consulta; mismo código se puede consultar de nuevo tras cerrar; QR no compatible se rechaza con explicación. |
| G-06 | P1 / M | Diseñar ficha completa y accesible con evidencias, scroll y recuperación. | Sin datos obligatorios inventados; ingredientes largos legibles; lector de pantalla y fuentes ampliadas comprobados. |

Dependencias: G-01 y G-02 definen contratos para G-03 y G-06. G-04/G-05 pueden avanzar cuando exista una forma estable de simular el resultado.

Salida de fase: recorrido verificado en Android e iOS: permitir/denegar cámara → escanear o introducir código → cargar → mostrar ficha o error → volver a consultar. G-01 requiere revisión del lenguaje y reglas antes de una beta dirigida a usuarios.

## 4. Fase 2 · MVP útil en una compra real

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| M-01 | P1 / M | Historial local con esquema versionado, límite y borrado. | Sobrevive a reinicios, no duplica eventos repetidos, lista paginada y borrado verificable. |
| M-02 | P1 / M | Favoritos locales y detalle desde listas. | Marcar/desmarcar sobrevive a reinicios; limpiar historial no elimina favoritos. |
| M-03 | P1 / M | Caché local y consulta de fichas guardadas sin conexión. | Fuente y antigüedad visibles; no se borra el contenido al fallar una actualización; almacenamiento acotado. |
| M-04 | P2 / M | Sustituir inicio de ejemplo, textos e identidad visual. | Ningún Lorem ipsum, logo React ni etiqueta de navegación de plantilla; español consistente y tema coherente. |
| M-05 | P1 / M | Completar ayuda, atribución, privacidad y comunicación de errores. | Accesibles dentro de la app; decisiones de datos descritas según comportamiento real. |
| M-06 | P1 / M | Pruebas de uso del recorrido de compra y estados ambiguos. | Hallazgos registrados, bloqueos corregidos y comprensión del resultado validada. |

Salida de fase: MVP local completo según [Producto](../PRODUCTO.md), con pruebas de recuperación y accesibilidad. La incorporación de login no es una condición para esta fase.

## 5. Fase 3 · Preparación y operación de beta

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| R-01 | P1 / M | Identificadores propios, permisos mínimos, firma y perfiles de builds. | Paquetes de beta instalables en dispositivos; permisos alineados con las funciones, sin audio innecesario para escanear. |
| R-02 | P1 / M | Medición de fallos y tiempos sin historial identificable. | Versión y entorno adjuntos; errores del recorrido rastreables; filtros de privacidad comprobados. |
| R-03 | P1 / M | Pruebas nativas completas y matriz de dispositivos. | Casos críticos de [Calidad](../CALIDAD_Y_OPERACION.md) pasan en versiones soportadas. |
| R-04 | P1 / M | Procedimiento de publicación, recuperación y soporte. | Responsable y pasos definidos; recuperación de una versión problemática ensayada según el mecanismo elegido. |
| R-05 | P1 / S | Formalizar licencia del código y condiciones de reutilización de datos. | Archivo de licencia acordado; atribución y textos de publicación coherentes. |
| R-06 | P1 / M | Beta gradual con revisión de métricas y feedback. | Sin bloqueos conocidos; objetivos de estabilidad medidos con muestra declarada; presupuesto operativo aprobado. |

Salida de fase: beta profesional mantenible. La publicación general requiere completar los controles de entrega, no solo distribuir un enlace.

## 6. Fase 4 · Nube y sincronización opcionales

Activar cuando haya demanda de varios dispositivos, catálogo compartido o contribuciones. Las bases de esta fase pueden adelantarse si otra función las necesita.

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| C-01 | P1 / L | Autenticación y enlace explícito de contenido local. | No se pierde información al iniciar/cerrar sesión; dos usuarios no comparten datos privados. |
| C-02 | P1 / L | Reglas, índices, emuladores y controles de ingreso. | Pruebas de acceso permitido y denegado pasan; cliente no altera catálogo ni roles arbitrariamente. |
| C-03 | P1 / L | Sincronización idempotente, conflictos y borrados. | Reintentos no duplican; eliminaciones no reaparecen; fallos y pendientes visibles. |
| C-04 | P1 / M | Refresco controlado del catálogo y caché compartida si procede. | Límites globales, fechas, costes y permisos probados; cliente no puede publicar evidencia arbitraria como validada. |
| C-05 | P1 / M | Exportación/borrado de cuenta y política remota de retención. | Borrado propagado según política, sin restaurar datos por una cola antigua; soporte documentado. |

Salida de fase: sincronización confiable y costes medidos. Las reglas de Firebase desplegadas deben revisarse, no deducirse de que exista una clave pública.

## 7. Fase 5 · Precios por supermercado

| ID | Prioridad / esfuerzo | Trabajo | Criterio de aceptación |
| --- | --- | --- | --- |
| P-01 | P2 / M | Validar utilidad y fuente de precios; definir cadena frente a sucursal. | Alcance de cada dato inequívoco; no se promete stock ni integraciones inexistentes. |
| P-02 | P1 de esta función / L | Modelo de observaciones y migración del esquema incipiente. | Importe entero, moneda, envase, fechas, autor y procedencia; histórico preservado. |
| P-03 | P1 de esta función / L | Ingreso autenticado, límites, revisión y reportes. | Datos inválidos/abusivos rechazados; usuario no modifica moderación ni autor. |
| P-04 | P2 / M | Comparador paginado y precio por unidad cuando sea válido. | Comparaciones del mismo formato, antigüedad visible, ofertas contextualizadas y unidades compatibles. |
| P-05 | P1 de esta función / M | Índices, medición de coste y prueba de carga. | Latencia y coste dentro del presupuesto acordado; sin lecturas globales por cada búsqueda. |

Salida de fase: comparar observaciones trazables, sin presentar precios antiguos como vigentes ni una observación como disponibilidad garantizada.

## 8. Evoluciones a validar

P3: búsqueda avanzada por nombre/categoría, lista de compra, alternativas, mapas, avisos de precio y extracción de datos del envase. Cada una requiere demostrar necesidad, calidad de fuente y coste de mantenimiento. La IA no debe introducirse como sustituto de las reglas de evidencia ni como certificador automático de aptitud.

## 9. Trazabilidad de hallazgos

| Hallazgo de auditoría | Tareas que lo resuelven |
| --- | --- |
| A-01: interpretación | G-01, G-06, M-06 |
| A-02: API y entornos | B-06, G-02 |
| A-03: estado y concurrencia | G-03, G-05 |
| A-04: cámara | G-04, G-05, R-03 |
| A-05: dependencias y tests | B-01 a B-04, B-07 |
| A-06: persistencia y acceso | C-01 a C-05, P-02, P-03 |
| A-07: UX y accesibilidad | G-06, M-04, M-06 |
| A-08: herramientas y documentación | B-05, B-07, R-04, R-05 |

## 10. Regla de finalización

Una tarea queda terminada cuando cumple sus criterios, tiene verificación adecuada y documentación actualizada. Un hito se cierra con el recorrido completo probado, sin bloqueos conocidos y con sus limitaciones explícitas. Registrar responsable, evidencia y fecha al ejecutarlo; no marcarlo completado únicamente porque el código compile.

El primer bloque del plan original era **B-01 a B-04 + G-01**. La base técnica y el núcleo de interpretación ya están implementados; el orden pendiente se mantiene en la [hoja de ruta vigente](../HOJA_DE_RUTA.md), con revisión de branding, validación experta y controles de publicación.
