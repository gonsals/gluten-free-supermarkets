# Estado actual y auditoría del proyecto

> Auditoría histórica del prototipo anterior a los cambios. Para el estado vigente consultar [Implementación y verificación](IMPLEMENTACION.md) y [Dependencias](DEPENDENCIAS.md). Los problemas descritos aquí no deben interpretarse como problemas aún presentes.

Fecha: **2026-10-23**. Código revisado: `3044a18` (`toggle torch`, 2024-12-11). Alcance: archivos de aplicación, componentes, hooks, servicios, configuración, dependencias, prueba existente y documentación. No se modificó la lógica de la aplicación durante esta revisión.

## 1. Finalidad reconstruida

El README y el flujo implementado describen un **escáner de productos alimentarios para consultar información sobre gluten**. El usuario permite la cámara, escanea un código de barras y recibe una ficha de Open Food Facts.

El nombre del proyecto y `services/priceService.ts` apuntan a una segunda idea: registrar precios de un producto en supermercados. Es una inferencia del código, no una especificación de producto terminada. No existen pantallas de supermercados ni comparación de precios.

Existe una prueba de concepto del escáner y un comienzo de persistencia. No es todavía un MVP completo ni una app lista para publicar. No hay evidencia para asignarle un porcentaje de finalización fiable.

## 2. Inventario y responsabilidad actual

| Archivo o área | Qué contiene | Estado |
| --- | --- | --- |
| `app/_layout.tsx` | Tema de navegación, fuente SpaceMono, splash y pila raíz. | Implementado; sin tratamiento explícito del error de carga de fuente. |
| `app/(tabs)/_layout.tsx` | Pestañas Home y Explore con iconos. | Implementado; nombres de plantilla. |
| `app/(tabs)/(home)/index.tsx` | Logo de React, parallax y Lorem ipsum. | Ejemplo; texto blanco fijo sobre fondo claro en tema claro. |
| `app/(tabs)/(explore)/index.tsx` | Permisos, cámara, linterna, detección, consulta, carga, error y ficha. | Flujo principal del prototipo. |
| `hooks/useFetchProduct.ts` | Consulta directa a Open Food Facts y estado de petición. | Usado; producto tipado como `any`. |
| `services/productService.ts` | Otra consulta y guardado en `products/{barcode}`. | Sin llamadas desde el flujo de la UI. |
| `services/priceService.ts` | Escritura de un precio por supermercado bajo el producto. | Sin llamadas desde la UI. |
| `config/firebaseConfig.ts` | Inicialización de Firebase, Firestore y Storage. | Usada por servicios desconectados; Storage sin uso adicional. |
| `components/ThemedText.tsx`, `ThemedView.tsx` | Texto y contenedor con tema. | Base reutilizable. |
| `components/ParallaxScrollView.tsx` | Cabecera animada. | Usada en el inicio. |
| `components/navigation/TabBarIcon.tsx` | Iconos de pestañas. | Usado. |
| `components/Collapsible.tsx`, `HelloWave.tsx`, `ExternalLink.tsx` | Componentes de plantilla. | Sin uso en las pantallas actuales. |
| `hooks/useColorScheme.ts`, `hooks/useColorScheme.web.ts`, `hooks/useThemeColor.ts`, `constants/Colors.ts` | Colores y tema. | Web fuerza tema claro; otros componentes consultan directamente React Native. |
| `app/+not-found.tsx`, `app/+html.tsx` | Ruta no encontrada y documento web. | Textos y atributo de idioma en inglés. |
| `assets/` | Logos de plantilla, iconos, splash y fuente. | Falta identidad visual propia. |
| `components/__tests__/` | Un snapshot de `ThemedText`. | No cubre el producto; la suite no arranca. |
| `app.json` | Plataformas, iconos, permisos, rutas tipadas y nueva arquitectura. | Configuración inicial; esquema `myapp`, sin identificadores de publicación propios. |
| `package.json`, `package-lock.json` | Scripts y dependencias. | Instalación reproducida; compatibilidad pendiente. |
| `tsconfig.json`, `babel.config.js` | TypeScript estricto, alias `@/*` y preset Expo. | TypeScript pasa. |
| `.gitignore`, `.env` | Exclusiones y configuración local. | `.env` sigue versionado. Ignorarlo no elimina el seguimiento previo. |

No hay en el repositorio reglas de Firestore/Storage, índices declarados, emuladores Firebase, CI, configuración EAS, backend propio ni licencia formal. Esto no demuestra que no existan recursos o reglas en la nube; no se auditó la consola Firebase.

## 3. Flujo real de datos

```text
Cámara → barcodeData → useFetchProduct
       → https://world.openfoodfacts.net/api/v2/product/{barcode}
       → JSON sin normalizar → ficha sobre la cámara

Servicios separados, sin conexión con ese flujo:
fetchProductFromAPI → API .org v0 → products/{barcode}
addOrUpdatePrice → products/{barcode}/prices/{supermarketId}
```

Los productos consultados no se guardan mediante el flujo actual. Tampoco existe una lectura desde Firestore que evite repetir consultas.

## 4. Hallazgos priorizados

### A-01 · P0 · Clasificación de gluten incompleta e inconsistente

La ficha usa `labels_tags?.includes("en:no-gluten") ? "Sí" : "No"`. El servicio comprueba `en:gluten-free` y almacena un booleano.

La [taxonomía oficial](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/labels.txt) utiliza «No gluten» como entrada inglesa principal y «Gluten free» como sinónimo. **`en:no-gluten` en la pantalla no es por sí mismo un error**; la inconsistencia está en el servicio y en reducir información incompleta a Sí/No.

Consecuencias: ausencia de etiquetas se presenta como «No»; no se muestran alérgenos, trazas ni contradicciones; no hay procedencia ni fecha en la ficha. Una etiqueta recibida se presenta como conclusión sin explicar su alcance.

Acción: interpretación centralizada con estados explícitos y evidencia conservada. Especificación en [Producto](PRODUCTO.md). Probar datos ausentes, contradictorios y distintas etiquetas antes de producción.

### A-02 · P1 · API de pruebas en el camino principal

El hook usa `.net` y el servicio `.org`, además de versiones distintas de API. La [documentación de Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) identifica `.net` como staging y `.org` como producción. Documenta autenticación básica para staging; el código no la añade.

En la consulta de auditoría, ambos respondieron HTTP 200 para `3274080005003`, incluso `.net` sin autenticación. No se concluye que esté caído: el problema confirmado es la inconsistencia de entornos y contratos. Una respuesta en staging no acredita el comportamiento de producción.

Acción: adaptador único, entorno explícito, campos acotados e identificación de la app conforme a la API. En web se debe resolver la identificación según lo que permita el navegador; no asumir que se puede sobrescribir cualquier cabecera.

### A-03 · P1 · Estado de consulta y reintento defectuoso

`if (!barcode) return` no limpia error ni carga; el botón de buscar otro producto vacía el código pero no el error. Por lectura del código, el mensaje anterior puede seguir sobre la cámara al reanudar. El `catch` tampoco elimina un producto anterior.

No hay cancelación, tiempo máximo ni protección frente a respuestas antiguas. Una petición que termine tras cerrar o cambiar de producto puede escribir estado obsoleto. No se comprueba `response.ok` ni se distingue fallo HTTP, JSON inválido y producto inexistente.

Acción: estados definidos, reinicio completo, cancelación o descarte de respuestas obsoletas, timeout y errores tipados. Verificar con pruebas de concurrencia y reescaneo.

### A-04 · P1 · Ciclo de vida y usabilidad de cámara pendientes

La cámara no se condiciona al foco de la pestaña ni al estado de la app; no hay recuperación tras denegación permanente ni manejo de error de montaje. Expo [recomienda desmontarla al perder foco](https://docs.expo.dev/versions/latest/sdk/camera/). Falta verificarlo en dispositivos.

El callback muestra un `alert` por escaneo y se bloquea mediante estado React, sin bloqueo inmediato adicional frente a eventos repetidos. Se admiten QR sin validar que contengan un identificador de producto. El dato se inserta en la URL sin validación ni codificación. No hay entrada manual.

Acción: cámara vinculada a foco y primer plano, bloqueo de eventos repetidos, validación, entrada manual y recuperación de permisos. Conservar códigos como cadenas para no perder ceros iniciales.

### A-05 · P1 · Dependencias y pruebas desalineadas

Expo 52 convive con `jest-expo` 51, navegación raíz 6 y paquetes que no cumplen las recomendaciones del SDK. React es 18.3.1 y el renderer de pruebas 18.2.0. `react-native-camera` es una dependencia sin uso: la pantalla usa `expo-camera`.

La suite falla antes de ejecutar tests. Los avisos de dependencias requieren clasificación por cadena y exposición real; véase el apartado siguiente. Actualizar de forma coordinada y por etapas, sin aplicar `npm audit fix --force` indiscriminadamente.

### A-06 · P1 antes de conectar la nube · Persistencia sin contrato verificable

Los servicios capturan errores y solo los escriben en consola: no devuelven un resultado útil ni fallo estructurado. `labels_tags.includes(...)` puede lanzar si falta el campo. El guardado solo inserta: no refresca productos existentes ni conserva fechas o versión de origen.

El precio sobrescribe el documento del supermercado: no conserva observaciones históricas. No valida importe, moneda, sucursal o autor y depende de la hora del dispositivo. El repositorio no permite verificar reglas, autenticación ni autorización desplegadas.

Acción: contratos tipados, escrituras validadas y permisos probados con emulador antes de conectar contribuciones públicas. No se hicieron escrituras remotas durante la auditoría.

### A-07 · P2 · Experiencia y accesibilidad de prototipo

Inicio de ejemplo; mezcla de español e inglés; ficha superpuesta sin scroll propio; tamaños rígidos; controles sin etiquetas accesibles específicas; errores sobre la cámara sin contraste garantizado; tema oscuro parcial. El marco dibujado no restringe por sí mismo el área real de detección.

Acción: diseñar flujos y componentes con estados vacíos, errores, escalado de fuente, zonas seguras y lector de pantalla. Probar tamaños pequeños y textos largos.

### A-08 · P2 · Herramientas y documentación incompletas

`reset-project` referencia un script inexistente. `lint` carece de configuración y dependencias directas de ESLint. El README previo describía carpetas inexistentes (`src/screens`, `styles`) y un repositorio de ejemplo. No había proceso de release ni pruebas de reglas o integración.

## 5. Verificaciones ejecutadas

Entorno: Windows/PowerShell, Node 24.16.0, npm 11.13.0. Se usó `npm.cmd` para evitar el bloqueo local de `npm.ps1`.

| Verificación | Resultado |
| --- | --- |
| `npm.cmd ci --no-audit --no-fund` | Correcto: 1.238 paquetes instalados; avisos de paquetes obsoletos. |
| `tsc --noEmit` | Correcto. No valida los datos `any` de la API. |
| `jest --runInBand --watchAll=false --ci` | Falla: `Cannot find module 'expo-modules-core/build/Refs'` desde `jest-expo/src/preset/setup.js`. Una suite fallida, cero pruebas ejecutadas. |
| `CI=1 expo install --check` | Falla: incompatibilidades en 15 entradas. Incluye `jest-expo ~52.0.6` y navegación `^7.0.0` como recomendaciones para el SDK instalado. |
| `npm audit --package-lock-only --json` | 110 entradas afectadas: 6 críticas, 77 altas, 22 moderadas y 5 bajas. Cifra variable según avisos disponibles; no equivale a 110 fallos explotables en el móvil. |
| `CI=1 expo export --platform web` | Correcto: exportación estática, 8 rutas y bundle JS de 1,61 MB. No se midió tamaño comprimido ni rendimiento en dispositivo. |
| Consulta HTTP de un producto en `.net` y `.org` | Ambas devuelven 200; no acredita equivalencia ni cobertura del catálogo. |
| Seguimiento de `.env` | Confirmado con `git ls-files .env`. Solo se documentaron nombres de variables. |
| Lint | No ejecutado para evitar que Expo configure/instale herramientas durante una auditoría documental; carencia verificada en archivos y CLI local. |
| Android/iOS y cámara física | No ejecutado; no hay validación en dispositivo ni compilación nativa. |

La exportación web se generó en el directorio temporal del sistema. No se deduce aptitud para producción de exportar ni de pasar TypeScript.

## 6. Qué conservar

Expo/React Native, TypeScript estricto, Expo Router y la integración inicial con Open Food Facts son aprovechables. Firebase puede mantenerse si satisface los requisitos. No hay evidencia que justifique reescribir todo o migrar de proveedor antes de cerrar el flujo principal y medir uso, costes y limitaciones.
