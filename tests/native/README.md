# Pruebas nativas locales

El receptor de `share-receiver/` es una herramienta de ensayo separada de SinGluten. Recibe una copia `ACTION_SEND` por el permiso temporal del proveedor de archivos, la valida como v4 y la guarda en su almacenamiento privado. No tiene permisos de red o almacenamiento externo, ni la envía a servicios de terceros. La captura permite verificar el JSON exportado sin depender de una cuenta o una app de nube.

Construcción local: `python tests/native/share-receiver/build.py`. Requiere SDK Android API 35/build-tools 37.0.0 y genera una APK de ensayo para API 35 o posterior, con la clave pública de desarrollo de la plantilla, en `artifacts/native-share-receiver/`; no la publica ni la instala. No forma parte del producto, no entra en EAS ni en el bundle de Expo. Todo binario y copia queda ignorado por Git.

Usar únicamente una instancia de emulador lanzada expresamente para la prueba con `-read-only -no-snapshot-load -no-snapshot-save`, un serial conocido y datos sintéticos. Verificar el proceso y el serial antes de instalar o borrar; nunca dirigir la prueba a un teléfono o AVD con datos del usuario. Seleccionar el receptor local en el selector de compartir, leer `files/received.json` mediante `adb -s SERIAL exec-out run-as com.tumarre.singluten.testreceiver cat files/received.json` y contrastar cantidades, importes y fechas. No habilitar permisos especiales en la app principal para facilitar una prueba.

Las capturas de emulador y el receptor no acreditan una compra real, lectura de etiquetas físicas, iluminación, TalkBack o VoiceOver. La matriz de CAL-02 registra esa diferencia y qué versión concreta se comprobó.
