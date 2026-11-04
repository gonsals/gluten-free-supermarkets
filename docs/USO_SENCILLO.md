# Usar la app

Ahora puedes reconocer el envase por su foto junto al nombre y formato. Al abrir otros precios de una cadena, cada producto muestra la suya. «Sin foto» significa que no hay imagen disponible o no se ha podido cargar; el precio sigue siendo consultable. [Fotos y límites](FOTOS_PRODUCTOS.md).

La [interfaz de la iteración 22](INTERFAZ_ACCESIBLE.md) presenta supermercado y precio juntos, con menos texto secundario. Inicio conserva el buscador como acción principal; «Tu compra y biblioteca» reúne la actividad personal y la pestaña «Escanear» da acceso directo a la cámara. Los campos y botones marcan el foco cuando usas teclado.

1. **Busca lo que necesitas.** En Inicio o Comparar escribe «huevos», «leche» o «arroz» y pulsa «Buscar precios». También puedes tocar una sugerencia.
2. **Mira los supermercados.** Cada tarjeta muestra el precio desde el que hay una referencia disponible, el producto concreto, su envase y la fecha. Los demás precios se abren dentro de esa tarjeta, sin salir de la app. Revisa las condiciones de las ofertas, como Lidl Plus.
3. **Ajusta solo si lo necesitas.** «Filtrar precios y ofertas» permite elegir cadena, consultar ofertas o incluir datos anteriores. Las anotaciones y funciones avanzadas están en «Mis productos y precios», dentro de Comparar.

Mercadona, DIA, Caprabo, Ametller Origen, Aldi y Lidl tienen una muestra integrada. «Sin precio disponible» indica que faltan datos para esa búsqueda, no que la tienda no venda el producto. «Sobre estos precios» explica la cobertura y el estado de actualización.

Los envases pueden ser distintos: un precio menor por envase no siempre significa menos coste por kilo o unidad. Son referencias online para Barcelona, sin CP o sucursal confirmados. Comprueba fecha y zona; los importes pueden cambiar. [Cobertura actual](PRECIOS_BARCELONA.md).

El importe principal se identifica como «Por envase» y el precio por kilo/litro/unidad como «Equivalente». Al buscar solamente «arroz», se buscan referencias de arroz seco; para consultar vasitos, escribe «arroz cocido». Así se evita presentar el equivalente por kilo de un preparado como referencia del arroz habitual. [Corrección y límites](IMPLEMENTACION.md).

«Otras aportaciones y mis precios» conserva tus anotaciones y los datos colaborativos de Open Prices. Desde allí puedes comparar el mismo código y envase dentro de la app. «Solo ofertas» y «Incluir precios anteriores» son opciones expresas; las promociones conocidas futuras o vencidas siguen excluidas.

Para anotar un precio, abre Comparar → Mis productos y precios → Anotar un precio sin buscar el producto. Indica código, importe, supermercado y sucursal. «Fecha, formato y condiciones» permite completar el detalle. Cerrar las opciones conserva tu borrador.

La cesta permite añadir productos, ajustar envases con «−» y «+» y comparar el total por tienda. Si faltan precios, muestra un subtotal y los productos pendientes. La información sobre gluten, ingredientes y trazas permanece en la ficha; el filtro de productos guardados sigue disponible.

No necesitas cuenta ni activar Firebase. Tus anotaciones y cesta se guardan en este dispositivo; puedes hacer una copia desde Ajustes.

Este recorrido corresponde a la [iteración 21](COMPARADOR_SENCILLO.md). Se sirve en Expo Go y en la exportación web. La APK de iteración 15 conserva su interfaz anterior; no se declara una nueva validación física.
