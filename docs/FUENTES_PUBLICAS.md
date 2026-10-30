# Viabilidad de fuentes públicas · DAT-03

> Seguimiento: [CAL-01 técnica, iteración 14](VALIDACION_COMPRA.md), con muestra sintética. Este informe conserva la investigación DAT-03 y su decisión original.

**Iteración 13, 30-10-2026: investigación terminada, sin fuente nueva aprobada para integración.** Responsable técnico: Codex; base de app `057bf6d`. Se revisan tres alternativas al resultado de [DAT-01](COBERTURA_PRECIOS_PUBLICOS.md), que no cubrió la cesta de diez GTIN en Madrid. La investigación no demuestra que no exista otra fuente válida en España.

La entrega es una decisión de alcance y un contrato para un posible piloto. No añade un proveedor a la app. DAT-03 queda con investigación verificada e integración condicionada a una fuente adecuada; el siguiente trabajo ejecutable es **CAL-01**, validación técnica del recorrido integrado con anotaciones de prueba declaradas. La compra física y la revisión experta conservan su estado pendiente.

## Método y decisión

Se seleccionan tres clases de fuente: comercio directo (Carrefour), comparador multicomercio (FACUA) y datos oficiales (MAPA). Se leen páginas públicas de presentación, condiciones y metadatos enlazados, sin cuenta, pagos ni datos de usuario. No se exploran endpoints internos, descargan catálogos o envían códigos postales privados. Las búsquedas iniciales también localizaron referencias a Mercadona; no constituyen una cuarta evaluación ni permiso sobre su tienda online.

Una fuente debe acreditar simultáneamente acceso/reutilización adecuados, contrato técnico y observaciones del mismo GTIN/envase con ámbito y fecha suficientes. **Desconocido no significa aprobado ni ausencia de precios.** La visibilidad de una web, su uso gratuito o la ausencia de bloqueo técnico no bastan para admitir su catálogo en la app. Esta es una decisión de ingeniería sobre la evidencia disponible, no una conclusión jurídica general sobre todos los usos posibles.

| Fuente | Resultado de la revisión | Decisión actual |
| --- | --- | --- |
| Carrefour online | La web pide código postal para disponibilidad. Las condiciones revisadas no aportan una licencia de redistribución para este comparador. | No iniciar piloto de datos; faltan permiso y contrato de integración. |
| super.FACUA.org | Seguimiento diario declarado, pero precios de la web por defecto sin código postal. Reutilización limitada según autoría y finalidad. | No usar como precio de una sucursal de Madrid ni incorporar automáticamente sus datos. |
| MAPA, conjunto origen/mayorista | Estadística semanal de productos alimentarios, no observaciones de envases minoristas por GTIN/sucursal. | Descartado para completar esta cesta; posible contexto estadístico futuro, fuera del núcleo. |

## Evidencia por candidato

### Carrefour · Comercio directo

La [tienda oficial](https://www.carrefour.es/supermercado/) solicita código postal para mostrar disponibilidad y distingue entrega/recogida. Eso no acredita por sí solo una tarifa nacional o de tienda física. El [apartado 8 de condiciones](https://www.carrefour.es/terminos-y-condiciones-uso-medios-digitales/mas-info/) reserva derechos sobre contenidos y limita su explotación; acceder no concede una licencia general. La página indica actualización de condiciones en 2019: es el texto servido en la revisión, no una garantía de vigencia futura.

No se acredita en las páginas revisadas una API pública documentada con cuotas y permiso de redistribución. No se afirma que no existan acuerdos o canales distintos. GTIN, formatos, fechas efectivas, promociones y cobertura de los diez productos **no se han medido**, al no aprobarse el paso previo. Para reconsiderarlo harían falta condiciones aplicables al uso previsto y un feed/API autorizado que distinga canal online, zona y sucursal física. No se extraen precios ni se crea un adaptador de endpoints internos.

### FACUA · Comparador multicomercio

[super.FACUA.org](https://super.facua.org/) declara revisión diaria en seis cadenas y advierte que utiliza lo mostrado por defecto en sus webs, sin código postal. La [página de Carrefour](https://super.facua.org/carrefour/) presenta categorías seguidas; no demuestra cobertura del plan DAT-01.

Su [aviso legal](https://facua.org/avisolegal/), aplicable también a subdominios, admite ciertos usos de textos propios con atribución y sin finalidad comercial, económica o publicitaria; otros textos requieren autorización. No se interpreta esa regla como licencia general de una base de precios ni como autorización de extracción automática. Que la app no cobre no resuelve por sí solo esas condiciones.

GTIN estable, envase, fecha de cada observación, condiciones, exportación/API y límites quedan **sin verificar**. La actualización diaria declarada tampoco garantiza la antigüedad individual. Incluso con permiso, haría falta modelar ámbito online por defecto, separado de una sucursal confirmada. No se incorporan registros ni se concluye que no existan precios útiles.

### MAPA · Datos oficiales agregados

La [ficha oficial de datos.gob.es](https://datos.gob.es/es/catalogo/e05024401-https-www-mapa-gob-es-es-alimentacion-temas-observatorio-cadena-cadenas-valor-sistema-de-precios-om-aspx) describe seguimiento semanal de 34 productos en origen y mayorista, alcance España y distribuciones HTML/XLSX. Su título refiere series hasta 2024 y la actualización del catálogo figura como 03-03-2025. Esas fechas son metadatos del catálogo, no prueba de la última observación disponible en 2026.

La [distribución enlazada](https://www.mapa.gob.es/es/alimentacion/temas/observatorio-cadena/cadenas-valor/sistema-de-precios-OM.aspx) no pudo recuperarse con el lector web (502). Otra consulta al aviso legal del MAPA agotó el tiempo; no se validaron el fichero, sus columnas ni las condiciones específicas. La ficha remite a un aviso de uso en el antiguo dominio magrama.gob.es: no se sustituye por una licencia supuesta.

El alcance descrito ya resulta incompatible con el precio minorista del mismo GTIN/envase y sucursal que exige la cesta. No se convierten medias de origen/mayorista en tarifas de supermercado. No se descarga ni importa una serie; la licencia, atribución y formato tendrían que comprobarse de nuevo para cualquier uso estadístico futuro.

## Contrato propuesto para reconsiderar una fuente

Estos requisitos son **diseño pendiente**, no capacidades implementadas ni condiciones aceptadas por un proveedor. Revisar la evidencia de acceso, atribución, redistribución, retención y límites antes de programar el adaptador. Si cambia una página o aparece una fuente adecuada, registrar URL, fecha y decisión; no pedir al usuario contratar un servicio para completar la investigación. Cualquier contacto externo o acuerdo requiere una instrucción expresa, y no se ha realizado en esta entrega.

| Dato o control | Condición para el piloto |
| --- | --- |
| Identidad | GTIN válido y envase explícito; distinguir código interno, peso variable y precio por unidad. Sin equivalencia por parecido de nombre. |
| Importe | EUR, impuestos y coste por envase conocidos; conversión exacta a milésimas, sin inferir precio final desde una promoción ambigua. |
| Tiempo | Fecha efectiva/observada distinta de fecha de descarga; precisión y zona horaria declaradas. Consultar hoy no rejuvenece un precio sin fecha. |
| Ámbito | Fuente, canal online/físico, país y ámbito real verificables; código postal o cadena no se convierten en una sucursal física confirmada. |
| Condiciones | Oferta, fidelidad, número de unidades, vigencia y gastos separados; dato incompleto queda excluido de totales que no pueda justificar. |
| Procedencia | ID de registro estable, URL consultable y atribución aplicable; nunca etiquetar otro proveedor como `open_prices`. |
| Lectura | API/feed autorizado y documentado, timeout y cancelación; sin cuenta de pago, claves en cliente o backend contratado. |
| Volumen | Fijar cuotas según proveedor. Como techo inicial propuesto: diez GTIN declarados, una página por código, secuencial, sin reintentos y parada ante 429. No ejecutar sin validar que el proveedor admite ese techo. |
| Separación | Resultados públicos en memoria con procedencia; no convertirlos en anotaciones propias ni exportarlos en copias privadas. Persistencia pública requiere DAT-02. |
| Fallos | Diferenciar vacío, rechazo de formato, error, pendiente y paginación truncada. No sustituir fallos por precio cero o por una observación vieja oculta. |

El modelo actual `PriceQuote.source` solo admite `private` y `open_prices`; añadir un proveedor requiere modificar y probar explícitamente dominio, referencias de sucursal, presentación, atribución y cualquier validación de copias afectada. Un nuevo ámbito online no debe entrar en totales físicos por forzar un identificador de tienda. La ampliación concreta se decidirá con un contrato real, sin crear ahora una abstracción genérica sin uso.

Si una fuente supera la revisión, preparar fixtures autorizadas/sintéticas con GTIN incorrecto, precio unitario, promociones, fechas ausentes, ámbitos incompatibles y 429 antes de una consulta real acotada. Después medir cobertura frente al mismo plan o declarar otro plan **antes** de consultarlo. Publicar transporte, descartes, edad y cestas completas; aprobar un adaptador no acredita cobertura suficiente.

## Siguiente iteración y comprobaciones

**CAL-01, tramo técnico reproducible:** preparar una cesta declarada con varias sucursales, misma referencia en distintos orígenes y anotaciones sintéticas identificadas; comprobar cantidades, selección de última observación, filtros, faltantes, totales completos/parciales, formatos/alternativas y copia/restauración en un recorrido integrado. Calcular los importes esperados de forma independiente. Cubrir desconexión y error público sin presentar datos de prueba como precios actuales de cadenas reales. Registrar casos y resultados; no marcar realizada una compra física ni cerrar CAL-02, GLU-01 o BET-01 por estas pruebas.

No se modifica código de app, dependencias, esquema v4, caché o perfiles de nube en esta iteración. Al revisar la CI de la base se detecta y corrige una carrera en la prueba web de alternativas: durante la carga asíncrona ambas fichas pueden mostrar el aviso de información ausente y el selector resulta ambiguo. Ahora se espera la evidencia contradictoria y la alternativa válida cargadas, se comprueba un único aviso restante y se verifica la ausencia del producto contradictorio en ambas sucursales.

Comprobaciones correctas: enlaces locales, tareas/dependencias e históricos; secretos en archivos/historial; tipos, lint, compatibilidad Expo, **220 pruebas de app, 42 de seguridad y 42 recorridos web**. Comandos de ejecución: `npm run check`, `npm run test:e2e` y `python scripts/scan-secrets.py`.

Dos ejecuciones locales agotaron los cinco segundos del primer test de confirmación, una también al repetirlo por separado. Un diagnóstico con margen temporal registró 6,2 segundos para ese caso; otro diagnóstico midió 0,8 segundos en el montaje. La ejecución final de `npm run check` pasa con los tiempos originales, sin cambios en ese test ni en la app. Se conserva esta variación de arranque en Windows como límite de la evidencia local para revisar en CAL-01; el diagnóstico ampliado no se usa como resultado del control final. La [CI de la base](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/41024766704) pasó `npm run check`, Firebase, secretos y Android, pero falló en el selector de alternativas durante E2E (41/42) y en dependencias; no se presenta como una CI correcta de extremo a extremo.

La auditoría real de esta revisión mantiene 19 entradas de app y cero de functions, y falla por deepmerge sin excepción; [SEG-01 sigue abierto](DEPENDENCIAS.md).
