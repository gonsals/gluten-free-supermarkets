# Iteración 24 · Fotos para identificar cada precio

Petición del propietario, **04-11-2026**: reconocer el producto concreto al comparar precios. Cada referencia muestra una miniatura junto a su nombre y formato; el importe por envase y el equivalente por unidad mantienen sus etiquetas. Las otras referencias de una cadena tienen sus propias fotos al desplegarlas.

## Procedencia y contrato

Las imágenes se toman del registro de ese SKU o GTIN. No se generan imágenes, no se busca una foto parecida y no se reutiliza la de otro envase. Un nombre parecido no establece equivalencia entre productos ni certifica información sobre gluten.

| Fuente | Campo de producto | Servidor de imágenes admitido |
| --- | --- | --- |
| Mercadona | `thumbnail` | `prod-mercadona.imgix.net/images/` |
| Aldi | Recurso `primary`, excluyendo certificados y recursos marcados como generados | `s7g10.scene7.com/is/image/aldinord/` |
| Lidl | `image` del mismo registro | `www.lidl.es/assets/` |
| DIA | `image` del producto | `www.dia.es/product_images/` |
| Caprabo | Imagen `product-img` del mismo bloque | `www.capraboacasa.com/images/` |
| Ametller Origen | `image` del producto JSON-LD | Ruta del catálogo en `www.ametllerorigen.com/dw/image/` |
| Open Prices | `image_url` de un producto cuya fuente es Open Food Facts | `images.openfoodfacts.org/images/products/` |

`productImages.ts` valida HTTPS, host, ruta y parámetros de imagen acotados. Rechaza credenciales, fragmentos, consultas ajenas, dominios similares, puertos alternativos y esquemas no HTTPS. Las miniaturas de Aldi se solicitan a 300 × 300. Una URL inválida se descarta sin perder el precio.

`imageUrl` es opcional en el catálogo público v1 y en `NamedProduct`. Los catálogos antiguos siguen siendo válidos; los clientes anteriores omiten ese campo. No se cambia el esquema/copias privadas v4, no se guardan imágenes públicas como anotaciones ni se incorporan claves o servicios de pago.

## Presentación y red

`ProductPhoto` conserva el encuadre completo con `contain`, proporciona nombre accesible y permite que el texto de la alternativa crezca. Si falta una URL o falla la descarga, muestra «Sin foto»; el nombre, formato y precio siguen disponibles. No hay navegación externa al tocar un resultado.

Los metadatos proceden de las mismas páginas ya consultadas: no hay una petición de ficha por cada producto. Las fotos se descargan directamente de sus servidores. Los desplegables conservan borradores y controles montados, pero comunican su visibilidad para que las fotos plegadas esperen hasta abrir la sección. No se garantiza disponibilidad de todas las imágenes ni su conservación offline.

La actualización comprobada lee 44 grupos/páginas y conserva **1.369 referencias**, **1.368 con URL de foto admitida**. Esto mide metadatos disponibles, no garantiza 1.368 descargas correctas. La revisión real de arroz confirma la foto del paquete de Mercadona dentro de su tarjeta; los fallos de imágenes se prueban expresamente. [Cobertura de precios](PRECIOS_BARCELONA.md).

Se comprueban vinculación de foto/producto, carga al desplegar, respuesta de error sin pérdida de precio, rechazo de URLs ajenas y compatibilidad del catálogo anterior. La validación técnica y web no sustituye una prueba física en Expo Go. No se reconstruye la APK antigua.

Verificación del 04-11-2026: **283 pruebas de app, 61 de seguridad y 68 recorridos web** correctos, además de tipos y lint. Tras ajustar el crecimiento de la alternativa visual con texto ampliado, se repiten nueve recorridos de fotos y supermercados, todos correctos. Consulta real de arroz: foto de Mercadona cargada desde su CDN y fotos de Caprabo/Ametller HTTP 200, con una sola página, sin navegación externa, errores JavaScript o desbordamiento horizontal en los tamaños revisados. La disponibilidad de cada imagen restante depende de su servidor.
