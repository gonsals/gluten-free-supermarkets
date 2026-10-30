# Cobertura pública · Medición DAT-01

**Resultado: la muestra consultada no permite comparar una compra en Madrid con precios públicos recientes.** Se cierra la medición DAT-01 de la iteración 12; no se considera alcanzada cobertura suficiente para una beta que prometa comparación automática de la compra.

Consulta: **30-10-2026, 00:10:01–00:10:42 CET**; la instantánea conserva los tiempos precisos en UTC, desde `2026-10-29T23:10:01.931Z`. Responsable técnico: Codex, sobre el cliente y motor de la base `86d133b`. [Plan, datos y atribución](datos/README.md), publicados para reproducir el análisis.

## Muestra y método

Se fijaron antes de consultar Open Prices **diez GTIN y un envase de cada uno**: siete referencias de despensa y tres comercializadas como sin gluten. Se identificaron mediante fichas públicas y se validaron los dígitos de control. La harina Hacendado se contrastó además con la [ficha de Open Food Facts](https://world.openfoodfacts.org/product/8480000291301), que devuelve harina de arroz 500 g y una etiqueta de declaración sin gluten. El segmento describe la selección comercial; no certifica aptitud ni crea equivalencias entre productos. La lista completa no es una dieta sin gluten.

Es una **muestra de conveniencia**, no aleatoria ni representativa de todas las cadenas o zonas. Tener una ficha de producto no prueba que se venda en una sucursal de Madrid. Los nombres, cantidades y URLs se fijan en el [plan](datos/cobertura-madrid-2026-10-30.plan.json); no se ha reemplazado ningún producto porque faltaran precios.

Se ejecutan tres perfiles con el mismo normalizador de Open Prices y las reglas de elegibilidad del comparador:

| Perfil | Alcance | Peticiones de precios a producción |
| --- | --- | --- |
| Lectura de cesta y zona de análisis | Una página de 50 resultados por GTIN, EUR, orden más reciente; región de análisis por texto «Madrid» en dirección y país ES. | 10 |
| Consulta por producto ampliada | Hasta tres páginas por GTIN, reutilizando la primera; solo seguir si el proveedor indica otra página. | 0 adicionales: todos los resultados cabían en la primera página. |
| Diagnóstico espacial separado | Primera página por GTIN, centro público Puerta del Sol `40.4168, -3.7038`, radio 25 km y fecha desde el día del corte de siete días. | 10 |

La primera zona es la **Comunidad de Madrid por coincidencia textual** en ubicación OSM; no es una delimitación administrativa verificada. El círculo de 25 km es otra zona, declarada por separado. No se atribuye toda diferencia entre perfiles a un único parámetro. La consulta espacial es un experimento HTTP con `lat`, `lon`, `radius_km` y `date__gte`, declarados en el [esquema oficial](https://prices.openfoodfacts.org/api/schema?format=json); todavía no es una función de la app. No se verifican de forma independiente coordenadas de cada establecimiento ni existencias.

GET sin cuenta, credenciales o datos privados; User-Agent descriptivo, cadencia conservadora, timeout de ocho segundos, sin reintento y parada ante 429. Primero se validó una respuesta en preproducción, como pide la [documentación del proveedor](https://github.com/openfoodfacts/open-prices/blob/main/API.md). El máximo previsto era 40 consultas de precios a producción; se hicieron **20, más una a preproducción**. Las consultas de identificación y esquema son investigación separada, no precios de supermercado incorporados a la muestra.

Para elegibilidad se usa el corte móvil de siete días del motor, sin ofertas/condiciones y sin recuperar una observación antigua cuando una nueva queda excluida. El filtro de fecha del diagnóstico envía el día UTC del corte; la evaluación local conserva las 168 horas exactas. Las referencias OSM solo son candidatas de análisis: no se guardan como sucursales confirmadas en una biblioteca de usuario ni se unen por nombre de cadena.

## Resultados

| Indicador | Resultado observado |
| --- | --- |
| Consultas principales correctas / errores | 10/10; 0 errores, 0 pendientes |
| Productos con algún registro compatible EUR, sin exigir zona/edad | 3/10 |
| Productos con respuesta EUR vacía | 7/10 |
| Registros de proveedor / compatibles / descartados | 34 / 33 / 1 |
| Observaciones compatibles españolas | 3; ninguna con ubicación textual Madrid |
| Rango de fechas de las observaciones compatibles | 21-03-2023 a 15-10-2026 |
| Productos con precio elegible reciente, incluso sin limitar país o región | 0/10 |
| Productos con precio elegible en la zona Madrid | 0/10 |
| Referencias candidatas Madrid / cestas completas | 0 / 0 |
| Mayor cobertura por referencia en la zona | 0 de 10 líneas |
| Segmento comercializado sin gluten | 0/3 con registros EUR en la consulta; 0/3 elegibles |
| Consulta espacial reciente | 10/10 respuestas correctas; 0 registros; 0 cestas completas |
| Paginación truncada en la muestra | Ninguna respuesta indicaba otra página |

Detalle por producto del perfil de cesta:

| Producto y GTIN | Registros EUR del proveedor | Compatibles | Más reciente compatible |
| --- | ---: | ---: | --- |
| Leche Pascual 1 l · `8410128010096` | 0 | 0 | Sin dato |
| Arroz SOS 1 kg · `8410830001016` | 0 | 0 | Sin dato |
| Spaghetti Barilla 500 g · `8076800195057` | 31 | 30 | 09-08-2026 |
| Tomate Orlando 350 g · `8410066000074` | 2 | 2 | 15-10-2026 |
| Aceite La Española 1 l · `8410660101016` | 1 | 1 | 25-01-2024 |
| Garbanzos Luengo ecológicos · `8410505548624` | 0 | 0 | Sin dato |
| Café Marcilla 500 g · `8410091055056` | 0 | 0 | Sin dato |
| Espaguetis Gallo comercializados sin gluten · `8410069018540` | 0 | 0 | Sin dato |
| Penne Farabella comercializados sin gluten · `8056774002797` | 0 | 0 | Sin dato |
| Harina arroz Hacendado 500 g · `8480000291301` | 0 | 0 | Sin dato |

El registro descartado no cumple el contrato del adaptador; no se capturó su motivo individual ni su respuesta cruda. No se afirma que sea un fallo del proveedor. Los vacíos son respuestas correctas para estos GTIN/EUR: no significan falta de venta, precio cero ni ausencia en otras monedas. Las 33 observaciones positivas sirven además de control de que el cliente sí interpreta datos; los filtros de zona/edad explican la falta de precios elegibles. La diferencia entre consulta vacía, error, registro rechazado y pendiente se conserva en el informe.

## Decisión y siguiente entrega

1. **Open Prices queda como fuente complementaria.** Las anotaciones privadas y sus comparaciones siguen siendo el núcleo operativo con datos disponibles. No se promete encontrar automáticamente el supermercado más barato para cualquier cesta.
2. **DAT-02 sigue condicionada, sin implementar caché persistente pública:** guardar datos no resuelve los huecos medidos. La caché de memoria actual basta para esta fase.
3. **DAT-03 pasa a P1:** investigar dos o tres fuentes que puedan cubrir GTIN/envase, precio EUR, fecha, ámbito real de tienda/zona y condiciones. Contrastar primero acceso, reutilización/atribución y límites; una página visible no se considera un permiso de reutilización automática. Piloto acotado y adaptador probado solo si hay una fuente adecuada, sin contratar servicios ni activar nube.
4. **CAL-01 puede avanzar con datos anotados:** validar cesta completa, formatos, sustituciones y faltantes contra referencias de prueba declaradas. La compra física, accesibilidad nativa y revisión experta siguen pendientes; los datos sintéticos no se presentan como compras realizadas.

No se amplía el barrido, no se inventan precios y no se incorpora un catálogo de pago para rellenar esta muestra. Tampoco se extrapola el 0 % a toda España o a todos los productos de Open Prices: la decisión se refiere a esta muestra, zona, moneda y fecha.

## Entrega y comprobaciones

Se entrega analizador puro `coverage.ts`, CLI `npm run coverage:prices`, instantánea pública normalizada y resumen reproducible sin red. El CLI usa el cliente real y el motor de totales; el cargador restringe la compilación a esos módulos de dominio y lectura, sin acceso a almacenamiento ni configuración de cuentas. El hash semántico del plan detecta cambios de muestra. Las nuevas consultas crean otra carpeta fechada en `artifacts/` y no sobrescriben esta instantánea. Verificado: **220 pruebas de app, 42 de seguridad**, tipos, lint y compatibilidad Expo; reproducción offline y comparación exacta del resumen.

Las pruebas cubren cesta completa frente a precios dispersos, selección de última observación, ofertas, edad, país, filtros de texto y diagnóstico espacial, páginas parciales, ausencia/error/pendiente, privacidad, plan alterado y límites de peticiones. Las pruebas de red del CLI son simuladas y no vuelven a consultar producción. El recorrido funcional de app permanece verificado por la [iteración 11](FORMATOS_Y_ALTERNATIVAS.md); esta entrega de medición no cambia el esquema v4.

La [CI de la base `86d133b`](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40929249382) pasó app, Firebase, secretos y Android; dependencias falló. La auditoría de esta entrega se registra por separado: el bloqueo de [seguridad](DEPENDENCIAS.md) no se levanta por obtener un informe de cobertura.
