# Mesa · Sistema visual aplicado

**Dirección B · Mesa elegida por el propietario el 25 de octubre de 2026.** Se aplica al producto real como paso 2 de la [hoja de ruta](HOJA_DE_RUTA.md). Sustituye a la primera identidad de hoja y verde, que no convencía al propietario. Las tres exploraciones iniciales permanecen en [Branding](BRANDING.md).

## Sistema

| Uso | Claro | Oscuro |
| --- | --- | --- |
| Fondo | `#FCF8F0` | `#251E1A` |
| Superficie | `#FFFCF7` | `#312722` |
| Texto principal | `#332B26` | `#FFF2E3` |
| Texto secundario | `#726052` | `#D2BCA9` |
| Acento | `#A43F28` | `#F5B699` |
| Texto sobre acento | `#FFFFFF` | `#3B2117` |
| Superficie suave | `#F3E5D4` | `#49342B` |
| Borde | `#DDCDBD` | `#685043` |

Los tokens viven en `src/shared/theme.ts`. Los titulares utilizan Georgia en iOS/web y la familia `serif` del sistema en Android; texto de lectura, formularios y acciones conservan la sans de sistema. No se descargan fuentes ni se añaden dependencias. La apariencia exacta de la serif puede variar entre sistemas; la decisión preserva el carácter editorial y permite arrancar sin red.

Botones y campos: radio de 6 puntos, altura mínima de 50 y texto adaptable. Tarjetas: radio de 10 y padding de 20. Contenido centrado hasta 640 puntos. Inicio con cabecera de marca, titular editorial, arco de arena, accesos a escáner/entrada manual y biblioteca con datos reales. Escáner, biblioteca, precios, ajustes y confirmaciones heredan los componentes compartidos.

## Estados independientes de la marca

Declaración sin gluten: verde semántico; información insuficiente/trazas: ámbar; gluten declarado o contradicciones: rojo. Cada estado mantiene texto e icono. El bloque de evidencia tiene su propio fondo y borde, separado del terracota decorativo. Las reglas de interpretación y el almacenamiento no cambian con este rediseño.

## Recursos y reproducción

- `assets/brand/logo.svg`: icono sobre papel cálido.
- `assets/brand/symbol.svg`: símbolo circular con M abierta de la propuesta Mesa, sin significado de certificación.
- `npm run brand:generate`: regenera icono, marca de cabecera, favicon, splash y primer plano adaptativo con Sharp.
- El primer plano adaptativo tiene margen transparente para las máscaras Android; splash con fondos claro/oscuro definidos en `app.json`.
- Navegación, color de estado y fondo HTML utilizan la paleta correspondiente para evitar transiciones al blanco/negro de plantilla.

SinGluten conserva su nombre visible, esquema e identificadores técnicos. La aprobación de la dirección visual no registra ni acredita la disponibilidad de ese nombre.

## Comprobación de la implementación · 25-10-2026

| Control | Evidencia |
| --- | --- |
| Tipos y lint | TypeScript correcto; ESLint de app y herramientas correcto. Ajuste final de navegación comprobado de nuevo. |
| Pruebas de app | 56 pruebas, cuatro suites correctas. |
| Compatibilidad Expo | `expo install --check` correcto; no se añaden paquetes ni se modifica el runtime. |
| Recorrido web de producción | Cinco pruebas Playwright correctas tras el ajuste final: consulta/favorito/offline, datos insuficientes/trazas, recuperación de errores, precios persistentes y actualización del service worker. |
| Revisión de pantallas | 22 comprobaciones de inicio, ficha, biblioteca, precios, ajustes y estados en claro/oscuro; inicio también a 320, 768 y 1440 píxeles. Sin errores de JavaScript ni desbordamiento horizontal en los casos revisados. |
| Móvil estrecho | Diez revisiones adicionales de controles a 320 píxeles: inicio, consulta, biblioteca, precios y ajustes, en ambos temas. Sin controles fuera del ancho de pantalla. |
| Contraste de paleta | 38 pares de texto/fondo comprobados, mínimo 4,83:1. |
| Contraste renderizado | Mínimo 5,11:1 en los textos examinados de las 22 comprobaciones; se excluyen iconos decorativos y controles desactivados. No es una auditoría completa de accesibilidad. |
| Secretos | Gitleaks de archivos publicables e historial correcto, con la excepción exacta ya documentada de la clave revocada. |
| Android local | Preview universal ARM64/x86_64 compilada correctamente: `BUILD SUCCESSFUL`, 615 tareas, 21 min 24 s en este equipo. JavaScript incorporado, nube desactivada y firma de desarrollo, para pruebas internas. |
| Contenido de APK | Paleta Mesa y símbolo confirmados dentro del paquete; símbolo cotejado por píxeles tras la optimización de recursos. Sin archivos `.env` ni coincidencias con el patrón de claves de Google inspeccionado. Este control por patrones no es una auditoría completa del binario. |

La APK actual está en `artifacts/singluten-preview-universal.apk`, con manifiesto JSON adjunto; ambos permanecen fuera de Git. Tamaño: **71.353.391 bytes**. SHA-256:

```text
b30983fa1bf48d695f3f7283c1004abbb8ddeec3b1f38a58c992e091bf027eb7
```

Dos intentos paralelos con dos workers de Gradle se detuvieron al sustituir bibliotecas nativas de Reanimated en Windows. Se comprobaron los enlaces compartidos y se consultaron los procesos asociados mediante [RmGetList de Windows](https://learn.microsoft.com/en-us/windows/win32/api/restartmanager/nf-restartmanager-rmgetlist), sin bloqueos persistentes al terminar los intentos. La ejecución con un worker completó todo el build. El ajuste está en el helper Windows; Linux mantiene su configuración. Esta compilación nueva no sustituye las pruebas físicas ni acredita una ejecución nativa nueva del rediseño.

Capturas de la app real: [inicio claro](diseno/mesa-inicio.png) y [ficha oscura](diseno/mesa-ficha-oscura.png). La ficha utiliza datos ficticios de prueba, sin consultar el catálogo externo. La biblioteca del inicio está vacía, como en una instalación nueva. Los informes detallados y las demás capturas permanecen en `artifacts/mesa-review/`, excluidos de Git.

Revisión React: hooks en orden estable, sin efectos para estado derivado ni nuevas peticiones o dependencias; recursos de marca locales, acciones con nombre accesible y evidencia con texto/icono. La navegación calcula espacio para área segura y escala de fuente, corrigiendo etiquetas recortadas observadas en móvil web.

Permanecen pendientes: cámara y lectores de pantalla físicos, tipografía ampliada nativa, revisión experta del lenguaje, beta y publicación. La nube sigue desactivada; no se activa facturación ni se crea ningún servicio.
