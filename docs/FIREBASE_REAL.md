# Estado del proyecto Firebase real

Revisado el **2026-10-24**. Proyecto existente: `gluten-free-supermarket`, nombre `Gluten-Free-SuperMarket`. Se ha aprovechado la sesión facilitada por el propietario. El proyecto sigue en el plan gratuito **Spark**; no se ha vinculado facturación ni publicado la aplicación.

**Decisión del propietario: evitar costes de backend y mantener la app en local.** Firebase no es un requisito de esta versión. No se activarán Blaze, Functions ni la nube de la app como parte del alcance actual. Todos los perfiles EAS, incluido producción, fijan `EXPO_PUBLIC_CLOUD_ENABLED=false`. Los recursos gratuitos ya preparados quedan disponibles para una ampliación futura; su existencia no obliga a utilizarlos. La falta de Functions no bloquea la versión local sin cuentas.

## Configuración realizada

| Recurso | Estado comprobado |
| --- | --- |
| App web existente | `Gluten-Free-SuperMarket-App`; configuración pública recuperada desde Firebase. |
| Firebase CLI | Sesión iniciada en el perfil local, mediante OAuth oficial. No se ha creado una clave privada de cuenta de servicio. |
| Authentication | Servicio iniciado y proveedor correo/contraseña habilitado. Acceso sin contraseña y proveedores adicionales no activados. |
| Firestore | Base `(default)`, edición Standard, modo nativo, región `europe-west1` (Bélgica), cuota gratuita y protección contra borrado activada. La región queda fijada al crear la base. |
| Reglas | `firestore.rules` compilado y desplegado correctamente con ID de proyecto explícito. Denegación por defecto y aislamiento por propietario. |
| Índices | Los cuatro índices compuestos versionados están listados en el proyecto real y la consola confirma estado **Habilitado** en los cuatro. Desactivada la indexación de `favorites.snapshot` y `_accountState.expiresAt`. No se han cargado datos de ejemplo. |
| Configuración local | `.env.local`, ignorado por Git, conserva ID y app ID; clave vacía y `EXPO_PUBLIC_CLOUD_ENABLED=false`. La clave histórica expuesta se revocó y no se creó una sustituta para la versión local. Véase [Revisión de credenciales](SEGURIDAD_CREDENCIALES.md). |
| Functions, TTL y App Check | Pendientes. La política TTL no se ha activado en Spark; la configuración completa permanece versionada para el despliegue posterior. |
| Storage | No inicializado; la app utiliza imágenes de Open Food Facts y no necesita subir archivos. Las reglas locales de Storage deniegan todo acceso. |

La configuración pública del cliente no es una credencial administrativa. Las credenciales OAuth de la herramienta permanecen en el perfil del usuario y no forman parte del repositorio. El código de autorización utilizado era de un solo uso; se cerró la pestaña y se eliminaron los archivos temporales que lo contenían.

## Verificación remota

`npm run firebase:verify -- --project gluten-free-supermarket` realiza consultas de solo lectura y genera `artifacts/firebase-foundation-report.json`, ignorado por Git. Comprueba región europea, protección de borrado, presencia de los índices esperados y estas respuestas sin autenticar:

| Lectura | Respuesta observada |
| --- | --- |
| Favorito privado | HTTP 403, `PERMISSION_DENIED`. |
| Observación privada de precio | HTTP 403, `PERMISSION_DENIED`. |
| Estado privado de borrado de cuenta | HTTP 403, `PERMISSION_DENIED`. |
| Producto público de comprobación | HTTP 404, `NOT_FOUND`: la consulta está permitida, pero ese documento no existe. |

Antes de revocar la clave histórica, una petición de acceso por contraseña con una identidad inexistente devolvió `INVALID_LOGIN_CREDENTIALS`, confirmando que el proveedor respondía. Después de revocarla, el servicio rechaza esa clave con `API_KEY_INVALID`. No se crearon usuarios, se enviaron correos ni se escribieron documentos de prueba en este proyecto. Las pruebas completas con dos cuentas, moderación y borrado siguen ejecutándose en los emuladores, no se presentan como verificadas en producción.

El informe verifica los fundamentos de Firestore. No certifica por sí solo el estado de construcción de cada índice, Functions, App Check ni el recorrido completo de una cuenta. El estado habilitado de los cuatro índices se comprobó adicionalmente en la consola de Firebase.

## Ampliación futura: requisitos si se decide activar la nube

Las funciones `submitPrice`, `moderatePrice` y `deleteMyAccount` necesitan el plan Blaze. Firebase [exige una cuenta de facturación para desplegar Cloud Functions](https://firebase.google.com/docs/functions/faq-and-troubleshooting). La autorización para implementar la app no se ha interpretado como autorización para contratar servicios de pago.

Antes de cambiar `EXPO_PUBLIC_CLOUD_ENABLED` deben estar desplegadas y verificadas las funciones y la política TTL, revisados presupuesto/alertas y probado el borrado real. Activar únicamente registro y favoritos ahora dejaría un recorrido incompleto de gestión de cuenta. La app sigue permitiendo consulta, escaneo, favoritos, historial y precios privados sin cuenta.

Pendientes adicionales: entorno independiente para beta, dominios definitivos y plantillas de correo, cuenta moderadora con claim administrativa, proveedor App Check y pruebas de ambos usuarios y moderación. Véase [Despliegue y pruebas](DESPLIEGUE_Y_PRUEBAS.md) para el procedimiento completo.
