# Calidad y operación · Comparador de compra

Actualizado el **26-10-2026**. Criterios para el enfoque de [Producto](PRODUCTO.md) y las fases de la [hoja de ruta](HOJA_DE_RUTA.md). Los fallos del prototipo inicial se conservan en el [documento histórico](historico/CALIDAD_Y_OPERACION_ANTES_DEL_COMPARADOR.md); no describen el estado actual.

## Evidencia disponible y límites

Base **`638980a`**, iteración 8. [CI con cinco controles correctos](https://github.com/gonsals/gluten-free-supermarkets/actions/runs/40270570028): secretos, dependencias, Firebase, Android y app. Evidencia detallada en [Implementación](IMPLEMENTACION.md) y [Comparador](COMPARADOR_DE_PRECIOS.md).

| Comprobación realizada | Alcance y límite |
| --- | --- |
| 164 pruebas de app / 14 suites, iteración 9 | Dominio, clientes, repositorio, consulta, permisos, copias, tiendas y comparación. Incluye 20 pruebas nuevas de cesta, migración, límites y conflicto. |
| 35 pruebas de seguridad, iteración 9 | Política de auditoría y controles; no equivalen a un pentest ni eliminan avisos pendientes. |
| 30 recorridos web correctos, ejecución final de iteración 9 | Los 23 anteriores y siete de cesta. Incluyen comparación, filtros, errores públicos, sugerencias, datos y ficha de gluten. Fixtures sintéticas, separadas de comprobaciones de proveedor real. |
| Tipos, lint y compatibilidad Expo | Correctos en la base registrada; cada cambio necesita sus controles pertinentes. |
| Reglas y nube en emuladores | Siete pruebas de reglas y cinco de integración; no habilitan nube real ni constituyen requisito de cuenta para el MVP local. |
| APK universal de iteración 8 | Compilada, instalada/actualizada en Pixel 8 emulado API 35; tienda sugerida, restauración y precio privado conservados. Sin Metro, nube desactivada y firma de desarrollo. |
| APK universal de iteración 9 | Actualización desde biblioteca v1, cesta y cantidad tras arranque en frío, restauración v2 y vaciado que conserva favoritos/precios en Android emulado API 35. [Paquete y evidencia](CESTA_LOCAL.md). Sin Metro, nube desactivada y firma de desarrollo; físico pendiente. |
| Lectura pública real acotada | GTIN 3274080005003: 17/17 registros aceptados en la comprobación registrada; no demuestra cobertura española ni frescura por cadena. |

Cámara física, TalkBack, revisión experta, iOS nativo, beta, cobertura de cesta y métricas de uso siguen pendientes. Una exportación de JavaScript iOS no equivale a build/dispositivo nativo. El escaneo del ZIP y Gitleaks reducen riesgo de exposición, sin ser prueba universal de ausencia de cualquier secreto.

## Estrategia de verificación

Verificar el recorrido **UI → datos locales/públicos → elegibilidad → comparación → decisión comprensible**, y añadir cesta/totales cuando se implementen. Mantener pruebas deterministas con fixtures para lógica y errores; las consultas reales son comprobaciones separadas, pequeñas, con fecha y contrato declarados.

| Área | Aceptación de las siguientes entregas |
| --- | --- |
| Cesta CES-01 | Añadir/editar/quitar, límites, duplicado de GTIN, cantidades inválidas, producto sin precio, acciones accesibles y reinicio sin red. |
| Datos CES-02 | Migración v1→v2 sin pérdida, importación v1 con cesta vacía, copia v2 completa, referencias válidas, borrado, fallos parciales, versiones desconocidas y dos clientes activos. |
| Identidad TIE-01 | Dos sucursales de una cadena, tiendas homónimas, ubicación incompleta y unión pública/privada confirmada/deshecha; no mezclar ámbitos. |
| Totales CES-03 | Cantidades, empates, diferencias, milésimas, filtros coherentes, última observación antes de filtrar, ofertas vencidas y discrepancia entre fuentes. |
| Cobertura CES-03/DAT-01 | Faltante no vale cero; sin precio/antiguo/excluido/fallo diferenciados; completas ordenadas y parciales fuera del ranking; una sola completa sin afirmación de ahorro. |
| Formatos UNI-01 | Masa/volumen/unidades compatibles, cantidad ausente, multipacks, necesidad de envases enteros, sobrante y redondeo. |
| Alternativas ALT-01 | Equivalencia explícita, sustitución confirmada y restricciones; no asumir equivalencia por nombre ni ausencia de gluten por falta de datos. |
| Proveedores DAT-02/DAT-03 | Contrato, timeout, cancelación, 429, respuesta inválida, paginación, tamaño y atribución; fallo externo conserva datos privados. |
| Gluten GLU-01 | Cuatro estados, campos ausentes, contradicciones, trazas junto a declaración sin gluten, fuente/fecha y comprensión con revisión experta. |

No escribir tests que solo repliquen detalles internos. Para importes, cobertura y migraciones sí se necesitan casos límite y recorridos de recuperación por el efecto de un error en la decisión de compra o los datos privados.

## Datos y recuperación

CES-01/CES-02 se han entregado juntas: cesta, exportación/restauración/borrado y esquema/copia v2 con migración desde v1. [Cesta local](CESTA_LOCAL.md) registra contrato, evidencia y límites; la matriz siguiente se mantiene como control de regresión.

| Escenario | Resultado exigido antes de cerrar CES-02 |
| --- | --- |
| Actualizar biblioteca v1 | Historial, favoritos, fichas y precios preservados; cesta vacía y versión nueva válida. |
| Importar copia v1 o v2 | Resumen correcto, confirmación y sustitución completa; v1 sin cesta, v2 con cantidades y referencias preservadas. |
| Archivo inválido/desconocido o cancelación | Rechazo útil sin modificar datos. |
| Fallo al migrar/escribir/restaurar | Sin estado parcial; anterior recuperable y error visible. |
| Limpiar historial | Conservar fichas aún referenciadas por cesta/favoritos/precios según contrato. |
| Borrar todo | Eliminar también cesta y datos derivados privados. |
| Dos pestañas o instancias / diálogo abierto | No sobrescribir silenciosamente cambios ajenos; política comprobada con cada adaptador. La iteración 9 añade comparación/escritura transaccional entre clientes y comprobación del estado confirmado. |
| Retroceso de app | Cliente antiguo no modifica esquema desconocido; no recomendar reinstalar/downgrade como recuperación sin prueba. Preferir corrección compatible hacia delante. |

Conservar copias de prueba sintéticas y verificar restauración web/Android, reinicio y offline. Los datos públicos permanecen separados; una futura caché pública tendrá pruebas de retención/borrado y no viajará como anotación privada en una copia.

## Dispositivos y comprensión

CAL-02 exige al menos Android físico representativo y uno de recursos modestos, registrando modelo, SO, versión/commit y resultado. Probar cámara con envases reales, iluminación, linterna, permiso denegado/bloqueado, ajustes, segundo plano y reescaneo. Entrada manual siempre disponible; respuestas tardías no sustituyen el producto activo.

Probar comparación/cesta, teclado, fuente ampliada, controles alcanzables, lector TalkBack, temas y errores sin depender del color. Red lenta/sin red, límites de biblioteca, importación/exportación y actualización deben formar parte del recorrido. Si se distribuye iOS, añadir build nativa, dispositivo y VoiceOver antes de declararlo soportado.

CAL-01/GLU-01 validan que participantes entienden precio observado frente a precio actual garantizado, parcial frente a completo, diferencia de muestra frente a ahorro real, y declaración de gluten frente a certificación. Registrar tarea, hallazgo, severidad, corrección y revalidación. No dar por realizadas sesiones o revisión experta al pasar tests.

## CI y controles por cambio

El workflow existente comprueba app, Firebase emulado, dependencias, secretos y Android. Revisar protección de rama por separado: un workflow correcto no garantiza que GitHub impida integrar sin él. Los resultados siempre se asocian a un commit, no a todas las revisiones futuras.

Comandos actuales de referencia, con Node/npm fijados y Java 21 para emuladores:

```bash
npm ci
npm run check
npm run test:e2e
npm run secrets:check
npm run audit:security
```

Pruebas de reglas/servidor con `demo-sin-gluten`, sin credenciales de producción; comandos en [Despliegue y pruebas](DESPLIEGUE_Y_PRUEBAS.md). Cambios de SDK, permisos o configuración nativa requieren build pertinente. Documentación solamente: revisar enlaces, coherencia de prioridades/IDs, diff y secretos; no reconstruir APK ni reiniciar Expo sin necesidad.

## Seguridad y bloqueos de distribución

SEG-01 sigue abierto: tres avisos de origen transitivo en herramientas de desarrollo (Zod, node-forge, OpenTelemetry), ocho entradas afectadas de app y cero en servidor en el informe registrado. Excepciones exactas temporales hasta **22-11-2026**; [Dependencias](DEPENDENCIAS.md) detalla exposición y versiones.

`audit:security` permite esa excepción controlada; **`audit:release` sigue bloqueado** y debe pasar para publicación general. No ampliar excepciones para simular limpieza, ocultar avisos ni aplicar `audit fix --force`. Un aviso nuevo se evalúa por alcance y puede bloquear antes. Revisar seguridad antes de beta y de cada distribución.

Clave histórica revocada, archivos de entorno excluidos y escaneo de archivos/historial con excepción exacta documentada. No registrar códigos de autorización, tokens ni valores de `.env` en evidencia. Sin secretos administrativos en variables públicas. [Credenciales](SEGURIDAD_CREDENCIALES.md).

Nube opcional fuera del MVP. Si en el futuro se activa, deberá pasar aislamiento entre cuentas, autorización administrativa, validación, cuotas, moderación, borrado/TTL, conflictos, coste y recuperación remota. Tener pruebas en emulador no acredita ese despliegue.

## Métricas y límites operativos

No hay telemetría remota configurada ni beta medida. Empezar con registro local de pruebas y sesiones consentidas, sin enviar cesta, notas o historial identificable. No incorporar un receptor de pago para obtener métricas.

| Señal propuesta | Cómo interpretarla |
| --- | --- |
| Cobertura de producto | Productos con al menos una observación elegible / N consultados; indicar zona, fechas, filtros, páginas y fallos aparte. |
| Cobertura de cesta | Cestas completas por establecimiento / cestas evaluadas, con criterio y muestra declarados; no confundir con porcentaje de cadenas cubiertas. |
| Diferencia estimada | Solo entre cestas completas y condiciones equivalentes de la muestra. Ahorro real requiere contrastar compra equivalente efectuada. |
| Comprensión y utilidad | Personas que completan la tarea y explican faltantes/condiciones; registrar número de sesiones y hallazgos. |
| Latencia y recursos | Separar frío/caliente, offline/red, proveedor/cálculo/render; equipo, SO, datos y repetición registrados antes de fijar umbrales. |
| Fallos y disponibilidad | Versión, plataforma, sesiones e incidentes; distinguir caída externa de fallo local. No inferir 99,5 % de estabilidad de unos pocos recorridos. |
| Tráfico | Peticiones por acción, cancelaciones/429 y caché; no consultar automáticamente toda la biblioteca/cesta. |

DAT-01 establece línea base de cobertura antes de integrar nuevas fuentes; DAT-02/DAT-03 necesitan justificar retención/volumen. Límites actuales de proveedor en [Comparador](COMPARADOR_DE_PRECIOS.md); presupuesto de consultas desde cesta se fijará antes de implementarlo. No prometer consultas ilimitadas porque no se pague backend.

## Beta, publicación y mantenimiento

BET-01 propone 5–10 participantes con consentimiento, versión identificable y soporte. Cerrar antes fallos críticos, CAL-01/CAL-02, revisión de gluten aplicable, datos recuperables y revisión de seguridad. Ajustar alcance si cobertura insuficiente; no sustituir faltantes con precios inventados ni cambiar silenciosamente la promesa.

Antes de publicación general REL-02:

- Flujo de cesta/comparación definido para esa versión, cobertura y limitaciones entendidas; evidencia de pruebas y compras de muestra.
- Controles sobre el commit final, `audit:release` y secretos correctos, sin fallos críticos abiertos.
- Plataformas/dispositivos y accesibilidad comprobados; no anunciar iOS nativo sin build y prueba.
- Migraciones, copias, borrado y recuperación ensayados con datos existentes; soporte asignado.
- Nombre y presentación comercial revisados, Mesa conservada, firma de publicación custodiada fuera de Git y canal elegido.
- Privacidad, licencias/atribución, ayuda y soporte coherentes con datos realmente tratados.
- Distribución gradual y mecanismo para detenerla/corregirla; no reinstalar ni retroceder sin compatibilidad de datos comprobada.

No contratar cuentas de tienda o backend por cerrar documentación. La APK actual tiene firma de desarrollo y no acredita publicación. Mantener nube desactivada en todos los perfiles, revisión semanal de dependencias y excepciones antes del 22-11-2026. Registrar responsable, versión, evidencia y límites de cada entrega; la app profesional exige ese mantenimiento además de nuevas funciones.
