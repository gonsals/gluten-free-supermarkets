# Revisión de credenciales

Revisión del **2026-10-24**, repositorio público `gonsals/gluten-free-supermarkets`. No se reproducen valores de claves en este documento.

## Hallazgo y corrección

GitHub tenía abierta la alerta de secret scanning n.º 1 por una clave de Google publicada en `.env`, introducida en el commit `91ce46fb2862de5ab92518bf759acaa71a322a79`. La coincidencia corresponde a la clave de cliente del proyecto Firebase existente; no a una cuenta de servicio ni a una clave administrativa.

Firebase [explica que sus claves de cliente identifican el proyecto y que el acceso a datos depende de las reglas y otros controles](https://firebase.google.com/docs/projects/api-keys). Esto no elimina la necesidad de revisar restricciones o atender una exposición. La clave antigua tenía una lista de APIs permitidas y ya no se necesita para la versión local de la app.

Acciones completadas:

- Revocación de la clave antigua en Google Cloud, confirmada con `deleteTime` el 2026-10-24 a las 01:06:43 UTC.
- Petición real al servicio Auth rechazada con `API_KEY_INVALID`; la clave expuesta ya no permite esa operación.
- Alerta n.º 1 de GitHub cerrada como `revoked` después de comprobar la revocación.
- `.env` retirado del proyecto versionado; `.env` y `.env.local` locales conservan la clave vacía. No se ha creado una sustituta porque la app utiliza almacenamiento local y mantiene Firebase desactivado.
- Ninguna credencial administrativa, cuenta de servicio o token detectados por Gitleaks en los archivos preparados para publicación y los seis commits originales revisados. Esta es una comprobación por patrones conocidos, no una garantía absoluta sobre cualquier posible secreto.

## Historial y alcance

El valor antiguo permanece en el historial público como **clave revocada**. Retirar un archivo en un commit nuevo no borra las versiones anteriores. No se reescribe ni se fuerza la actualización del historial compartido; [GitHub prioriza revocar la credencial expuesta](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning).

`.gitleaksignore` admite únicamente la huella exacta del hallazgo histórico de ese commit, archivo, regla y línea. No excluye categorías de claves, archivos completos ni coincidencias futuras: volver a introducir una clave en otro commit hace fallar el control. No contiene el valor de la clave.

Los informes técnicos locales se guardan redactados dentro de `artifacts/`, ignorado por Git. Las credenciales de Firebase CLI y GitHub CLI permanecen en sus perfiles del equipo, fuera del repositorio. El escaneo de publicación toma los archivos versionados y los nuevos no ignorados; no publica los archivos privados del entorno ni las APK locales.

## Prevención mantenida

`npm run secrets:check` ejecuta Gitleaks 8.30.1 con su configuración completa, salida redactada y binario oficial verificado mediante SHA-256 fijado para Windows/Linux x64. Revisa el contenido que podría subirse y el historial Git disponible. Rechaza además archivos reales `.env*` preparados para publicación; `.env.example` es la plantilla permitida.

El job `secrets` de GitHub Actions obtiene el historial completo y repite el mismo control. El repositorio mantiene secret scanning y push protection habilitados. Los otros jobs esperan a que pase este control. El escáner es software libre y no requiere añadir un servicio de pago ni habilitar la nube de la app.

Para una credencial futura detectada: revocarla en el proveedor, comprobar el rechazo, retirar su uso y resolver la alerta con evidencia. No ocultar un hallazgo nuevo ampliando la excepción histórica.
