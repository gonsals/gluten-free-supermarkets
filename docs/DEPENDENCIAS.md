# Dependencias y seguridad

Verificación: **2026-10-25**. Se ha reemplazado el conjunto de dependencias de 2024 por versiones compatibles con Expo SDK 58 y se han regenerado los lockfiles de app y servidor sin `--force` ni `--legacy-peer-deps`.

## Versiones principales

| Área | Antes | Ahora |
| --- | --- | --- |
| Expo | 52.0.18 | 58.0.21 |
| React / React DOM | 18.3.1 | 19.3.0, pareja del SDK |
| React Native | 0.76.5 | 0.88.1 |
| Expo Router | 4.0.11 | 58.0.28 |
| Cámara | expo-camera 16 + react-native-camera sin uso | expo-camera 58.0.14; cámara antigua retirada |
| Firebase cliente | 11.0.1 en el lockfile inicial | 13.1.0 |
| Pruebas | Jest 29 / jest-expo 51 incompatibles | Jest 30.5.2, jest-expo 58.0.13, testing-library 14.1.0 |
| TypeScript | 5.3 | 6.0.3 |
| Calidad | Sin configuración de lint | ESLint 9.39.5, eslint-config-expo 58.0.4, Prettier 3.9.10 |
| Servidor nuevo | No existía | firebase-admin 14.5.0, firebase-functions 7.4.0, Node 24 |
| Verificación | Snapshot sin arrancar | Playwright 1.64.1, Firebase CLI 15.34.1, rules-unit-testing 6.0.0 |

Las versiones exactas de módulos Expo, dependencias transitivas y herramientas están en `package-lock.json` y `functions/package-lock.json`. El entorno local se fija con `.nvmrc`, `engines` y `packageManager`.

Se conservan las versiones recomendadas por el SDK para React, módulos nativos y AsyncStorage. Babel permanece en 7 porque el conjunto Expo lo requiere; TypeScript en 6 porque el analizador ESLint admite `<6.1`; ESLint en 9 porque sus plugins de React/import aún no admiten 10. No se fuerza un salto mayor incompatible para obtener una lista de versiones sin avisos de actualización.

El registro npm ya marca ESLint 9 como versión sin soporte. Es una limitación pendiente del conjunto de herramientas elegido: vigilar la compatibilidad de plugins y migrar a la rama mantenida en cuanto el conjunto lo permita. La auditoría sin avisos críticos no elimina este trabajo de mantenimiento.

La navegación y los hooks proceden ahora de `expo-router`, incluida su capa de navegación, en lugar de mezclar contextos con una instalación separada de React Navigation. La integración web real detectó esa incompatibilidad durante la migración y está corregida.

## Resultado de auditoría

| Informe npm | Críticas | Altas | Moderadas | Bajas | Total de entradas afectadas |
| --- | --- | --- | --- | --- | --- |
| Prototipo inicial | 6 | 77 | 22 | 5 | 110 |
| App 26-10-2026, incluyendo herramientas | 0 | 5 | 3 | 0 | 8 |
| App 29-10-2026, incluyendo herramientas | 0 | 3 | 3 | 13 | 19 |
| Servidor `functions/` actual | 0 | 0 | 0 | 0 | 0 |

Estas cifras incluyen propagación de avisos por los paquetes que dependen de ellos. Las ocho entradas del 26-10 procedían de **tres avisos originales**, no de ocho fallos independientes demostrados en el móvil. El informe del 23 de octubre contenía 34 entradas. La base de avisos de npm ha cambiado: `braces` ya no figura en el informe actual y aparece un aviso de Zod revisado el 23 de octubre. Esta variación no demuestra que se hayan reparado 26 fallos mediante cambios de código.

## Estado vigente · 29-10-2026

Parches compatibles instalados con Expo CLI: Expo 58.0.21, CLI 58.1.17, Router 58.0.28, React Native y preset 0.88.1, cámara 58.0.14, jest-expo 58.0.13. `expo install --check` pasa. La primera instalación detectó el peer del preset; se alineó sin `--force` ni `--legacy-peer-deps`. [Procedimiento oficial](https://docs.expo.dev/more/expo-cli/).

El lockfile instala node-forge **1.4.2**, cuyo aviso anterior ya no aparece en la auditoría. La consulta actual tiene **19 entradas: 13 bajas, 3 moderadas y 3 altas**; functions sigue en cero. Los avisos originales actuales son Zod, OpenTelemetry y [deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), revisado el 27-10, sin parche publicado. deepmerge 4.3.1 llega por `@expo/config` y Jest; no lo importa el código funcional de la app. Se revisa la exposición en herramientas de configuración/pruebas locales y se conserva la restricción de no procesar proyectos/configuraciones no confiables. El desarrollo local de formatos continúa; esto no acredita seguridad de una publicación.

**`audit:security` devuelve 1 por el nuevo aviso no exceptuado; `audit:release` y el job de dependencias quedan bloqueados.** No se amplían excepciones ni se degradan Expo/Jest para ocultar el informe. Se mantiene el plazo 22-11-2026 de las excepciones previas, sin renovación automática. SEG-01 debe resolver este aviso junto con los residuales antes de publicar. Las revisiones históricas siguientes conservan su fecha y no son el estado actual.

## Avisos residuales y exposición · revisión anterior

| Paquete y aviso | Situación y tratamiento |
| --- | --- |
| [`zod`, GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Expo CLI 58.1.15 necesita `^3.25.76`, última publicación de la rama 3. El aviso incluye esa versión y señala un parche en 4.6.6. La app no importa Zod: esta copia pertenece a la validación de configuración local de Expo. No procesar proyectos/configuraciones no confiables; no sustituir por una API mayor incompatible. Excepción temporal revisada el 24 de octubre, pendiente de soporte del consumidor. |
| [`node-forge`, GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Última versión consultada 1.4.0, también afectada. Llega por herramientas de certificados de Expo CLI. No se ha configurado firma de actualizaciones OTA ni `expo-updates`; no se presenta este hecho como reparación del paquete. Revisar antes de habilitar funciones que utilicen esos certificados. |
| [`@opentelemetry/core`, GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | Dependencia de Firebase CLI/PubSub en rama 1. La rama corregida es posterior; no se sustituye por una versión mayor sin soporte del consumidor. No corresponde al cliente de telemetría de la app. |

La clasificación describe las cadenas inspeccionadas; no sustituye una revisión de las herramientas ni una auditoría de los binarios publicados. El control de release sigue exigiendo resolver/revisar estos avisos.

## Cambios transitivos deliberados

- `@grpc/grpc-js` se fuerza a la rama compatible `^1.14.6`, corrigiendo la versión antigua fijada por Firestore. Las pruebas de reglas y servidor se ejecutaron con ese override.
- La dependencia `uuid` de `gaxios` se eleva a la rama CommonJS compatible `^11.1.1`, evitando el aviso de la rama antigua sin forzar una dependencia ESM incompatible con el consumidor.
- Aplicados los parches compatibles Expo 58.0.19, Expo CLI 58.1.15, Router 58.0.26 y SQLite 58.0.14. Se repiten las comprobaciones y la compilación nativa con este conjunto.
- No se aplican las degradaciones sugeridas por `npm audit` a Expo 44 o Firebase 9: reintroducirían un conjunto anterior y romperían la migración.

## Controles mantenidos

`npm run audit:security` audita los dos lockfiles. Falla ante avisos nuevos o distintos de las excepciones concretas registradas, errores de consulta o vencimiento de su revisión. No se silencian categorías completas. El informe íntegro queda en `audit.json`; CI registra el resultado y los recuentos en sus logs, sin subir artefactos persistentes.

Las tres excepciones de desarrollo están descritas en `.security/audit-exceptions.json` y caducan el **2026-11-22**. No son una aprobación de publicación: `npm run audit:release` es estricto y falla mientras existan avisos. Un responsable debe revisar exposición y resolución antes de distribuir una versión general.

### Revisión de la iteración 4 · 25 de octubre

Se han vuelto a consultar npm y los tres avisos enlazados. No hay una actualización compatible de sus consumidores: Expo CLI sigue en 58.1.15, Zod 3 en 3.25.76, node-forge en 1.4.0 y Firebase CLI en 15.34.1. Las copias de Zod 4 ya instaladas están en 4.6.7; no sustituyen la copia 3 requerida por Expo. El informe mantiene **ocho entradas afectadas en app y cero en functions**. No se modifican dependencias ni se alarga el plazo de las excepciones.

Se ha corregido un fallo del control: una fecha `reviewBy` mal escrita producía `NaN` y podía eludir la comprobación de caducidad. Ahora se valida la fecha real del calendario, la estructura de cada excepción y su ámbito. Una excepción de herramientas de app no autoriza el mismo aviso en el servidor.

El control también rechaza procesos fallidos o interrumpidos, respuestas truncadas, recuentos incoherentes, formatos desconocidos y cadenas de dependencias sin aviso original. La consulta tiene un límite de dos minutos por ámbito. Si falla una respuesta, se conserva el diagnóstico en `audit.json` y se comprueba el otro ámbito. No se deduplican dos gravedades diferentes del mismo aviso de forma que una oculte la otra.

`npm run test:security` ejecuta **34 pruebas**, incluidas cinco de integración del CLI en carpetas temporales con informes simulados, sin consultar npm ni cambiar los archivos de la app. Forma parte de `npm run check` y, por tanto, del job de app en CI. La consulta real con `audit:security` pasa bajo las excepciones existentes; la consulta real con `audit:release` devuelve **1**, el bloqueo esperado. La [matriz de esta iteración](PRUEBAS_ITERACION_4.md) distingue comprobaciones correctas, bloqueos y pruebas físicas pendientes.

Dependabot revisa semanalmente los paquetes de app/servidor y agrupa módulos que deben actualizarse juntos. Las acciones de GitHub se han actualizado a sus versiones actuales consultadas y fijado por SHA completo. Cada actualización necesita compatibilidad Expo, tipos, lint, tests, exportación y verificación nativa cuando cambie el runtime.

## Revisión 30-10-2026 · Iteración 12

Sin cambios de dependencias o lockfiles. La consulta real `audit:security` vuelve a devolver 1 por deepmerge no exceptuado: 19 entradas en app (13 bajas, 3 moderadas, 3 altas), cero en functions. No se amplían excepciones ni su vencimiento. El nuevo script de medición usa TypeScript ya instalado y no forma parte del código importado por las pantallas. Las comprobaciones de seguridad aumentan a 42 con pruebas del colector; pasarlas no equivale a resolver los avisos de terceros.

## Revisión 30-10-2026 · Iteración 13

Investigación DAT-03 y corrección de una prueba web, sin cambios de paquetes o lockfiles ni ampliación de excepciones. `audit:security` consultado de nuevo: salida 1 por deepmerge no exceptuado, 19 entradas de app (13 bajas, 3 moderadas, 3 altas) y cero de functions. SEG-01 sigue abierto; no se considera corregido por cerrar la investigación de fuentes. No hay cambio de exposición del runtime por esta entrega.
