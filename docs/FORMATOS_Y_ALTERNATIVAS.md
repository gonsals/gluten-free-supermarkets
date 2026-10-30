# Formatos y alternativas · Iteración 11

> Continuación, 30-10-2026: [DAT-01 medida en iteración 12](COBERTURA_PRECIOS_PUBLICOS.md), sin cobertura suficiente en la muestra de Madrid, y [DAT-03 investigada en iteración 13](FUENTES_PUBLICAS.md), sin otra integración aprobada. El siguiente paso es CAL-01 técnica. Este documento conserva la evidencia de la entrega de formatos.

Contrato de **UNI-01 + ALT-01**, 29-10-2026. Se conserva Mesa y el funcionamiento local sin cuenta ni servicios de pago. Acceso: **Mi cesta → Formatos y alternativas**.

## Cantidades y precio

Las cantidades se introducen explícitamente. Admitimos kg/g, l/ml y unidades enteras; no convertimos masa en volumen ni deducimos contenido por nombre. Los multipacks aceptan 1–99 componentes: 6 × 330 ml equivale a 1,98 l. La anotación conserva la cantidad total canónica en kg/l/unidades, manteniendo compatible el contrato de precios existente.

El dominio trabaja con millonésimas enteras de kg/l/unidad, cantidades positivas hasta 10.000 unidades canónicas. El parseo decimal y el redondeo monetario usan BigInt; no dependen de multiplicaciones aproximadas de coma flotante. Rechazamos precisión incompatible y división por cero. El sobrante puede ser cero y se muestra expresamente.

Precio por kg/l/unidad: se presenta redondeado a milésimas de EUR, mitad hacia arriba. Si es positivo pero inferior al mínimo representable, se muestra `<0,001 €`. Ese indicador no se utiliza para calcular ni ordenar desembolsos: se multiplican milésimas originales por envases enteros necesarios.

Ejemplo reproducible: necesidad 1 kg, envase de 500 g a 2 € → dos envases, 4 €, sin sobrante, 4 €/kg. Envase de 750 g a 2,40 € → dos envases, 4,80 €, sobrante 500 g, 3,20 €/kg. El segundo sale mejor por kilo y exige más dinero para esta necesidad. No se presenta una diferencia como ahorro real sin una compra equivalente.

## Grupos y sustitución

Hasta **20 grupos privados con 10 productos por grupo**, nombre, necesidad, formatos y criterio opcional de declaración sin gluten. El primero identifica la línea original de la cesta. Cada GTIN debe ser válido y distinto, incluidas representaciones equivalentes con cero inicial. Todos los envases deben ser compatibles con la dimensión de la necesidad.

Se pueden crear, editar y eliminar grupos; los cambios no alteran la cesta. La comparación muestra cada alternativa, envases enteros, sobrante y desembolso por sucursal. Se usan únicamente anotaciones privadas elegibles de los últimos siete días, sin oferta ni notas condicionales, en sucursales confirmadas. Se elige la última observación antes de filtrar; una nueva excluida no resucita otra antigua. Ante referencias vinculadas discrepantes, se informa y se conserva la regla de fecha más reciente.

Si el precio anotado declara un formato diferente al confirmado en el grupo, se excluye del cálculo hasta corregirlo. Si el precio no declara formato, se utiliza la declaración explícita del grupo; esto sigue siendo información aportada por la persona. Una sucursal sin precio no vale cero. Los resultados por producto se paginan de diez en diez.

Elegir una opción abre una confirmación con producto, necesidad, envases, sobrante y estimación por sucursal. Solo confirmar sustituye la línea original completa; no se fusiona con otra alternativa ya presente ni se superan 99 envases. Se comprueban revisión y grupo al guardar para rechazar cambios posteriores de otra pestaña. La cesta conserva productos/cantidades, no reserva tienda, precio o existencias. La sustitución se puede revisar editando de nuevo la cesta y el grupo; no existe historial automático de deshacer.

El filtro positivo recalcula la evidencia de la ficha guardada, exige declaración sin gluten y excluye ausencia o contradicciones. Conserva acceso a trazas, fuente y fechas; una traza no se oculta por pasar el filtro. No confirma aptitud individual. Sin ficha no se permite pasar el filtro positivo. La comprobación se repite antes de aplicar la sustitución. GLU-01 mantiene la revisión experta pendiente.

## Datos y recuperación

`LibraryData.version: 4`, `groups`, `revision` y copia marcada `backupVersion: 4`. La clave física histórica `library:${offEnv}:v1` permanece. Migrar v3 conserva cesta, sucursales, vínculos, precios y biblioteca, añadiendo grupos vacíos. v2 conserva cesta sin sucursales; v1 migra sin cesta. Las copias v1/v2/v3 siguen admitidas; los clientes anteriores rechazan v4. IndexedDB sube a versión física 4; SQLite mantiene su protección contra regresión de esquema. Un bloqueo de otra pestaña no sobrescribe los datos.

Exportar/restaurar/borrar incluye grupos. Restaurar es sustitución completa con resumen y confirmación; los campos desconocidos no se heredan. Los formatos antiguos que intentan incluir grupos se rechazan. Hasta 3.000 fichas/códigos de caché y 20 MiB por copia: este margen contempla hasta 200 referencias adicionales de grupos. Sus fichas se conservan al limpiar historial o expulsar caché no referenciada. Vaciar la cesta conserva grupos y sucursales; borrar todos los datos los elimina.

Los grupos no se sincronizan ni se envían a proveedores. Esta pantalla no hace consultas públicas: consultar la ficha/precios de un producto sigue siendo una acción aparte, con las reglas de [Open Prices](COMPARADOR_DE_PRECIOS.md). No se guarda ni exporta un precio público dentro de un grupo.

## Verificación y límites

- Tipos, lint, **209 pruebas de app en 19 suites**, **35 de seguridad** y compatibilidad Expo correctos. Regresiones de formatos ausentes/incompatibles, precisión, multipacks, coste frente a precio unitario, filtros, copia/migración y conflictos. Una ejecución bajo carga nativa agotó el tiempo en Confirm; la ejecución aislada y la suite completa final pasaron sin ampliar timeouts.
- Lector y repositorio reales de `3270728`: admiten la copia v3, rechazan la copia v4 y rechazan una raíz v4 sin escribir. Se conserva la protección SQLite contra downgrade v4→v3.
- 42 recorridos web, seis nuevos: creación y sustitución cancelable, persistencia offline, filtro con trazas/contradicción, corrección de formato, borrado de grupo, dos pestañas, anotación de multipack y pantalla 320 × 480 con texto ampliado. Se corrige la espera del borrado de historial antes de exportar que falló en la [CI de iteración 10](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40341604379); no se atribuye a esa CI un resultado correcto.
- Runtime compatible actualizado según [Expo CLI](https://docs.expo.dev/more/expo-cli/): Expo 58.0.21, CLI 58.1.17, Router 58.0.28, RN/preset 0.88.1, cámara 58.0.14 y jest-expo 58.0.13. Sin salto mayor ni nuevo servicio.
- Secretos: escaneo de archivos e historial con Gitleaks, sin nuevas excepciones. Auditoría: **19 entradas de app (13 bajas, 3 moderadas, 3 altas), cero en functions**. node-forge 1.4.2 ya no aparece; Zod y OpenTelemetry permanecen bajo excepciones anteriores. El nuevo [aviso deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), sin parche publicado, bloquea `audit:security` y el job de dependencias. No se amplían excepciones ni se autoriza publicación. [Seguimiento](DEPENDENCIAS.md).

Android emulado **Pixel 8 / API 35**, clon de solo lectura, sin red ni conexión inversa a Metro: instalar APK anterior, restaurar v3, actualizar y conservar cesta/sucursal/precios con total 4,00 €; restaurar grupos v4, editar el grupo, cancelar y confirmar una sustitución. Cerrar el proceso y abrirlo conserva el grupo editado, dos envases del sustituto y sobrante de 0,5 kg. Se instala de nuevo la APK final y se repite la comprobación de persistencia. [Captura de la APK final](diseno/iteracion-11-formatos.png). La primera automatización tuvo que volver al inicio del desplazamiento para alcanzar el enlace de navegación; se retomó y verificó el recorrido, sin alterar los datos para hacerlo pasar.

APK interna ignorada por Git: `artifacts/singluten-iteration-11-preview-universal.apk`, **71.509.707 bytes**, ARM64 + x86_64, JavaScript incluido, nube desactivada y firma de desarrollo. SHA256: `f63cf31f138357dc673cb63f8a1c901c210b197b1289e8261abe0da959f0ede9`. ZIP: cero archivos `.env` y cero coincidencias del patrón de clave Google `AIza`; esto es una comprobación concreta, no una prueba universal de ausencia de secretos. El script Windows usa ahora `:app:assembleRelease`/`:app:assembleDebug` para limitar la selección a la aplicación y sus dependencias. Compilación completa del runtime actualizado: 20m27s, 615 tareas; ejecución posterior con tarea de app: 12m35s, 579 tareas (551 ejecutadas, 28 reutilizadas). Las cachés difieren; no se atribuye toda la diferencia de tiempo al cambio de tarea.

Los grupos requieren sucursales previamente identificadas. Sus referencias se gestionan en **Comparar total por tienda**; si solo existen anotaciones de una alternativa, puede requerir añadir ese GTIN temporalmente a la cesta para identificar su referencia. La vista de alternativas no incorpora un gestor independiente de sucursales.

No se consideran realizadas pruebas físicas, iOS, TalkBack, revisión experta ni compras reales por pasar pruebas automatizadas. No hay optimización automática entre todos los grupos de una cesta, ni cobertura nacional, ni nuevos precios disponibles offline. El siguiente hito es **DAT-01**, medir cobertura pública útil y documentar el alcance antes de ampliar fuentes o promesas.
