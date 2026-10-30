# Validación integrada de compra · CAL-01

**Iteración 14, 30-10-2026. Tramo técnico verificado con datos sintéticos; compra real pendiente.** Responsable técnico: Codex, base `52ad242`. Se prueba el recorrido en navegador con tamaño móvil: consulta, anotación, cesta, sucursales, alternativas, exportación, borrado y restauración sin conexión. No es una compra efectuada, una tarifa de supermercado ni una prueba física de Android/iOS.

## Muestra y oráculo independiente

Los nombres, tiendas, ubicaciones y precios son de ensayo. Los tres códigos tienen dígito de control válido y se usan como identificadores de prueba; no se atribuyen estos datos a productos comerciales ni se afirma que esos códigos estén libres en catálogos externos. Las respuestas de fichas y precios están controladas por el test. No se importa el normalizador ni el calculador de la app para obtener los importes esperados.

| Referencia sintética | Código | Formato confirmado | Envases en cesta inicial |
| --- | --- | --- | ---: |
| Arroz de prueba | `2000000000015` | 500 g | 3 |
| Alternativa de arroz | `2000000000022` | 750 g | 0 |
| Leche de prueba | `2000000000039` | 1 l | 2 |

| Sucursal de ensayo | Arroz 500 g | Arroz 750 g | Leche 1 l | Cesta inicial |
| --- | ---: | ---: | ---: | --- |
| A | 1,89 € | 2,70 € | 1,20 € | 3 × 1,89 + 2 × 1,20 = **8,07 €** |
| B | 1,65 € | 2,40 € | 1,40 € | 3 × 1,65 + 2 × 1,40 = **7,75 €** |
| C | 1,30 € | Sin dato | Sin dato | **3,90 €** de subtotal, 1/2 líneas y 3/5 envases; fuera del ranking completo. |

B tiene menor total entre las dos completas, con diferencia estimada de **0,32 €** frente a A. El subtotal de C no equivale a una compra más barata. Las referencias privadas se confirman como sucursales mediante la UI; antes de identificarlas no hay totales completos.

El grupo explícito exige **1,2 kg** de arroz. Ambos formatos cubren la necesidad con 1,5 kg: tres envases de 500 g o dos de 750 g, con **0,3 kg de sobrante**. En B el arroz alternativo cuesta 2 × 2,40 = **4,80 €**, frente a 3 × 1,65 = 4,95 €. Tras confirmar la sustitución de la línea completa, las cestas son:

- A: 2 × 2,70 + 2 × 1,20 = **7,80 €**.
- B: 2 × 2,40 + 2 × 1,40 = **7,60 €**; diferencia estimada **0,20 €**.
- C: sin precio elegible para la nueva cesta; no se genera un total de cero.

Los valores esperados son literales calculados a mano en [la fixture](../tests/e2e/fixtures/shopping.ts), separados de la implementación monetaria en milésimas. Los precios de esta tabla no dependen de Open Prices ni de una observación real. La necesidad y la sustitución tampoco se deducen por nombre.

## Casos integrados

Implementados en [shopping-journey.test.ts](../tests/e2e/shopping-journey.test.ts), usando almacenamiento y adaptadores web reales de la app, sin escribir directamente en IndexedDB.

| Caso | Recorrido y comprobaciones |
| --- | --- |
| Compra y recuperación | Desde biblioteca vacía, consultar tres fichas simuladas por entrada manual; añadir dos productos, anotar siete precios por formulario y ajustar cantidades. Confirmar tres sucursales, comparar completas/parciales, crear grupo, cancelar y después confirmar sustitución. Exportar v4, borrar, cancelar restauración sin recuperar datos y finalmente restaurar offline. Tras recargar, conservar cesta, siete precios, sucursales/vínculos, grupo, historial y favoritos; fichas con fecha de recuperación, consulta original y trazas. Los totales vuelven a ser 7,60/7,80 €. |
| Discrepancia y precisión | Restaurar una muestra declarada; consultar dos códigos y vincular explícitamente la ubicación pública 101 con A. La observación pública más reciente de arroz cuesta 1,805 €: 3 × 1,805 = **5,415 €**. La leche más reciente es oferta: al excluir ofertas A queda incompleta, sin rescatar el precio privado anterior ni el público de hace nueve días. B conserva 7,75 €. |
| Condiciones y país | Al incluir ofertas, A suma 5,415 + 2 × 0,90 = **7,215 €**; diferencia frente a B **0,535 €**. Una sucursal de ensayo en Francia, con referencias públicas EUR, solo entra al quitar el filtro España: 3 × 0,40 + 2 × 0,30 = **1,80 €**. No se presenta como sucursal de Madrid ni se fusiona por nombre. La copia conserva siete precios privados y los vínculos; no incluye observaciones públicas. |
| Límite del proveedor | Una respuesta 429 detiene el lote tras una petición: cero productos consultados correctamente, una consulta con error y el otro código sin consultar. B mantiene su total privado. La leche privada de A, de hace nueve días, sigue excluida por antigüedad; no se sustituye por cero. Tras recargar sin red, B conserva 7,75 € y no hay consultas automáticas. |
| Acceso directo | Abrir y recargar `/basket-comparison`, pulsar «Editar mi cesta» y llegar a `/basket` con las cantidades existentes. |

Son **cuatro pruebas nuevas**: el segundo test reúne discrepancia, precisión, condiciones y país. El test de compra completa tiene presupuesto de 90 segundos por contener todo el recorrido y una recuperación destructiva; las esperas de cada control conservan su límite habitual. Los demás mantienen el presupuesto estándar.

Las fichas sintéticas del grupo declaran sin gluten y muestran trazas de leche. Se comprueba que ambas cosas siguen visibles después de restaurar; no se interpreta como aptitud certificada. Las contradicciones y los datos ausentes mantienen las pruebas de las entregas anteriores. GLU-01 requiere revisión externa y no se cierra aquí.

## Corrección encontrada

«Editar mi cesta» usaba `router.back()`. Al entrar mediante enlace directo y recargar podía no salir de los totales, porque no había una entrada útil en el historial de navegación. Ahora navega expresamente a `/basket`; el test reproduce ese acceso, comprueba el destino y lee la cantidad guardada. No cambia el esquema v4, los precios, las reglas de cálculo ni los perfiles de nube.

## Aislamiento y reproducción

```sh
npm run test:e2e -- tests/e2e/shopping-journey.test.ts
npm run test:e2e
npm run check
python scripts/scan-secrets.py
```

Las fechas se fijan al construir cada muestra: día anterior para anotaciones recientes, nueve días antes para antiguas y día UTC actual para observaciones públicas simuladas. No se hace avanzar el reloj del dispositivo ni se cambia la fecha de una observación al restaurarla.

La primera construcción del arnés no interceptó correctamente algunas lecturas públicas; esos resultados se descartaron. La versión final usa una ruta de contexto para todo HTTP/HTTPS: solo se permite continuar al servidor local `127.0.0.1:4173`, las dos APIs conocidas reciben fixtures y cualquier otro destino se aborta y registra. No se toma aquella lectura inicial como evidencia de cobertura, stock o precio. Los códigos son de ensayo; no se ha enviado una biblioteca de usuario.

El caso principal anota mediante `/prices`, que permite hacerlo localmente sin abrir la comparación pública individual. Las vistas de comparación de producto conservan su lectura pública existente; esta entrega no cambia ese comportamiento. Las consultas de cesta siguen bajo acción explícita. La recuperación offline usa el service worker real del shell y la copia real exportada por la app; las observaciones públicas quedan en memoria y fuera de la copia.

## Comprobaciones de esta entrega

- `npm run check`: **220 pruebas de app en 20 suites, 42 de seguridad**, tipos, lint y compatibilidad Expo correctos, con los tiempos habituales. La variación de arranque del test de confirmación anotada en iteración 13 no se reproduce en esta ejecución; no se modifica ese test ni su presupuesto.
- `npm run test:e2e`: **46 recorridos correctos**, incluidos los cuatro casos CAL-01; ejecución final completa sin reintentos de test. El arnés y las expectativas se ajustaron antes de esa ejecución, sin relajar los cálculos esperados.
- Secretos: archivos publicables e historial sin hallazgos nuevos no aceptados; se conserva solo la excepción histórica exacta ya documentada.
- Documentación: **33 Markdown, 278 enlaces locales, 23 tareas sin ciclos y cinco históricos conservados**, sin errores de comprobación.
- La [CI de la base `52ad242`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/41027487868) pasó app, secretos, Firebase y Android; dependencias falló. Corresponde a la base, no acredita la revisión nueva ni pruebas físicas.

Expo sigue sirviendo el manifiesto Android por LAN con la nube desactivada. La validación web usa Chromium con tamaño de iPhone; eso no acredita un dispositivo iOS ni una compilación iOS. No se genera una APK nueva en esta entrega; CAL-02 comprobará la versión nativa vigente.

## Alcance del cierre

CAL-01 queda **verificada técnicamente con muestra sintética**, con evidencia reproducible de importes y recuperación. La [medición pública DAT-01](COBERTURA_PRECIOS_PUBLICOS.md) y la [investigación DAT-03](FUENTES_PUBLICAS.md) se conservan por separado: no aportan una compra real con cobertura suficiente. Siguen pendientes compra equivalente efectuada, utilidad con personas, cámara física, TalkBack/VoiceOver y revisión experta.

Siguiente tramo: **CAL-02, verificación Android emulada y preparación de la matriz física** sobre la versión vigente. La emulación debe registrarse como tal y no cierra el criterio físico. No se requiere contratar cuentas, activar Firebase o pedir a la persona usuaria que prepare datos para ejecutar los casos técnicos.

La auditoría real de esta revisión sigue devolviendo 1 por deepmerge no exceptuado: 19 entradas de app y cero de functions. No se amplían excepciones ni su fecha. [SEG-01 mantiene el bloqueo](DEPENDENCIAS.md).
