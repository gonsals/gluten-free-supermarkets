# Datos públicos de la medición de cobertura

Esta carpeta contiene la muestra y la instantánea revisadas de **DAT-01**, no una biblioteca de usuario ni datos incorporados a la app. [Informe y decisión](../COBERTURA_PRECIOS_PUBLICOS.md).

- [Plan previo](cobertura-madrid-2026-10-30.plan.json): diez GTIN, cantidades de envases, fuentes de identificación y límites fijados antes de consultar precios.
- [Instantánea](cobertura-madrid-2026-10-30.snapshot.json): páginas normalizadas, estados, URLs de consultas y tiempos. `sourceCommit` identifica la base del cliente/motor de app usado, `86d133b`; la herramienta de medición se añade en la entrega de este informe. El hash semántico del plan permite detectar cambios de muestra al reproducirlo.
- [Resumen derivado](cobertura-madrid-2026-10-30.summary.json): resultado de ejecutar el analizador sin red sobre esa instantánea. Los dos perfiles no espaciales comparten las páginas iniciales; no son dos consultas independientes.

Contiene información de **[Open Prices / Open Food Facts](https://github.com/openfoodfacts/open-prices)** y ubicaciones **© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)**, disponibles bajo la **[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/)**. La base derivada publicada en estos JSON se distribuye bajo ODbL 1.0 con la misma atribución. El código conserva la licencia del repositorio; esta atribución no cambia su licencia. Las fuentes de identificación del plan son referencias para comprobar hechos de producto y GTIN; no se han incorporado sus tarifas, imágenes ni catálogos.

Se conserva importe, fecha y referencia pública para auditar el cálculo. Se descartan usuario, comentarios, tickets, fotos y pruebas del proveedor antes de guardar. No hay precios privados, cuentas, coordenadas de usuario ni fusión con la biblioteca local. La posición del diagnóstico es un punto público fijo en Madrid.

Reproducción sin red, desde la raíz:

```sh
npm run coverage:prices -- --replay
```

Una nueva consulta requiere `npm run coverage:prices -- --collect`. Usa el mismo plan revisado, comprueba primero preproducción y escribe otra carpeta con fecha en `artifacts/iteration-12/`; no sobrescribe los JSON publicados. Hasta 40 GET de precios a producción, una comprobación previa, tres páginas/producto y una primera página del diagnóstico espacial; espera de al menos dos segundos entre peticiones. Un 429 detiene los perfiles restantes, sin reintento. Los datos de pruebas simuladas generados al verificar el CLI quedan también en `artifacts/`, separados de esta instantánea publicada.

El resumen es una observación fechada: no actualiza precios en segundo plano ni demuestra disponibilidad o cobertura fuera de la muestra.
