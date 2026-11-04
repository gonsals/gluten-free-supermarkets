# Iteración 22 · Interfaz más clara y accesible

Petición del propietario, **04-11-2026**: mejorar la interfaz y facilitar el uso del buscador. Se conserva la paleta Mesa y el nombre de trabajo; no se incorporan dependencias ni servicios.

## Presentación

- Titulares con tipografía sans del sistema, tamaño normal de 28 y secciones de 20, sin la serif editorial de las versiones anteriores. No se descargan fuentes.
- Inicio centrado en buscador y sugerencias. Cesta, escáner y biblioteca siguen disponibles en la navegación y en «Tu compra y biblioteca», con menor peso visual.
- Supermercado y precio en una misma fila adaptable. Nombre completo del producto, formato, precio unitario publicado, fecha y requisitos de oferta permanecen visibles. No se recorta el producto con puntos suspensivos ni se igualan envases distintos.
- Las advertencias generales repetidas sobre dirección/cobertura se consultan dentro de los detalles de la cadena. Las condiciones desconocidas y los requisitos de promoción, como Lidl Plus, siguen visibles antes de desplegar.
- Controles secundarios sin recuadros grandes; botones principales y campos redondeados. Bordes del buscador reforzados y más espacio útil en móvil.
- La pestaña «Consultar» pasa a llamarse «Escanear». Las etiquetas de navegación aumentan de 11 a 12 puntos y la barra reserva espacio para su escala de texto.

## Accesibilidad funcional

Acciones de al menos 50 puntos de alto y campos de 54. La tipografía sigue la escala del sistema; las filas permiten saltos de línea. El foco de teclado se marca con un contorno del color de acento en acciones y campos, además del cambio de borde del campo. Los iconos decorativos no sustituyen etiquetas.

Cada precio tiene nombre accesible con importe y supermercado. El estado y número de cadenas con precios se exponen en una región de actualización discreta. Los errores de búsqueda marcan el campo como inválido en web y muestran el mensaje junto a él. Desplegables mantienen estado expandido/plegado, ocultan sus controles al lector cuando se cierran y conservan borradores. No se abren webs externas desde el comparador.

Las nuevas pruebas recorren la búsqueda y los desplegables con teclado, comprueban foco visible y estado inválido, y amplían el texto al 200 % en 320 px en claro y oscuro. Verifican requisitos de oferta visibles, controles alcanzables y ausencia de desbordamiento horizontal. Esto es validación técnica web; no constituye certificación de accesibilidad ni prueba física con VoiceOver/TalkBack.

Verificación del 04-11-2026: 260 pruebas de app y 65 recorridos web correctos; tras ajustar el ancho útil de las etiquetas de navegación, otros 13 recorridos afectados correctos. Se comprueba que los cinco nombres de pestaña caben completos en 320 px a escala normal. Tipos y lint correctos. Se calculan 22 pares de colores de texto/fondo de ambos temas, con contraste mínimo 5,65:1; no representa una auditoría de todos los estados renderizados. Consulta real de huevos: fuentes HTTP 200, cuatro cadenas con datos, una sola página, sin salidas externas ni errores JavaScript. El paquete Android actualizado de Expo responde HTTP 200 en la red local.

## Continuidad

No cambian cálculos, vigencia de promociones, cobertura, esquema/copias v4, nube desactivada o datos privados. Los tamaños pueden variar entre productos; «Desde» sigue siendo mínimo por envase dentro de la muestra. [Contrato del comparador](COMPARADOR_SENCILLO.md) y [cobertura](PRECIOS_BARCELONA.md).

La mejora posterior debe conservar esta jerarquía y comprobar el recorrido con usuarios y lector de pantalla en un teléfono real. La APK de iteración 15 no se reconstruye con esta entrega: la nueva interfaz está en Expo Go y web. [Hoja de ruta](HOJA_DE_RUTA.md).
