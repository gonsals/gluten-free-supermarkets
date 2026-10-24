# Dependencias y seguridad

Verificación: **2026-10-24**. Se ha reemplazado el conjunto de dependencias de 2024 por versiones compatibles con Expo SDK 58 y se han regenerado los lockfiles de app y servidor sin `--force` ni `--legacy-peer-deps`.

## Versiones principales

| Área | Antes | Ahora |
| --- | --- | --- |
| Expo | 52.0.18 | 58.0.19 |
| React / React DOM | 18.3.1 | 19.3.0, pareja del SDK |
| React Native | 0.76.5 | 0.88.0 |
| Expo Router | 4.0.11 | 58.0.26 |
| Cámara | expo-camera 16 + react-native-camera sin uso | expo-camera 58.0.12; cámara antigua retirada |
| Firebase cliente | 11.0.1 en el lockfile inicial | 13.1.0 |
| Pruebas | Jest 29 / jest-expo 51 incompatibles | Jest 30.5.2, jest-expo 58.0.12, testing-library 14.1.0 |
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
| App actual, incluyendo herramientas | 0 | 5 | 3 | 0 | 8 |
| Servidor `functions/` actual | 0 | 0 | 0 | 0 | 0 |

Estas cifras incluyen propagación de avisos por los paquetes que dependen de ellos. Las ocho entradas actuales proceden de **tres avisos originales**, no de ocho fallos independientes demostrados en el móvil. El informe del 23 de octubre contenía 34 entradas. La base de avisos de npm ha cambiado: `braces` ya no figura en el informe actual y aparece un aviso de Zod revisado el 23 de octubre. Esta variación no demuestra que se hayan reparado 26 fallos mediante cambios de código.

## Avisos residuales y exposición

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

Dependabot revisa semanalmente los paquetes de app/servidor y agrupa módulos que deben actualizarse juntos. Las acciones de GitHub se han actualizado a sus versiones actuales consultadas y fijado por SHA completo. Cada actualización necesita compatibilidad Expo, tipos, lint, tests, exportación y verificación nativa cuando cambie el runtime.
