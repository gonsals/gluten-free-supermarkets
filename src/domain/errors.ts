export type ErrorCode =
  | 'invalid_barcode'
  | 'not_found'
  | 'offline'
  | 'timeout'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_response'
  | 'storage_error'
  | 'cloud_disabled'
  | 'unauthorized'
  | 'cancelled';
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly retryAfterMs?: number,
  ) {
    super(code);
    this.name = 'AppError';
  }
}
export function errorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) return error.code;
  if (error instanceof Error && error.message === 'invalid_barcode') return 'invalid_barcode';
  if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
  return 'provider_error';
}
export const errorCopy: Record<ErrorCode, string> = {
  invalid_barcode:
    'Introduce un código EAN o UPC válido de 8, 12, 13 o 14 cifras. Comprueba también el último dígito.',
  not_found:
    'Este producto no aparece en la fuente. No significa que contenga gluten. Puedes revisar el código o consultar otro producto.',
  offline:
    'No hay conexión con la fuente. Puedes consultar los productos guardados en tu biblioteca.',
  timeout: 'La consulta ha tardado demasiado. Prueba de nuevo cuando tengas conexión.',
  rate_limited: 'La fuente ha recibido demasiadas consultas. Espera antes de volver a intentarlo.',
  provider_error: 'No se ha podido completar la consulta. Vuelve a intentarlo en unos minutos.',
  invalid_response:
    'La fuente ha devuelto datos que no podemos interpretar. No se ha emitido una conclusión sobre gluten.',
  storage_error:
    'No se ha podido guardar el cambio en este dispositivo. Comprueba el espacio y vuelve a intentarlo.',
  cloud_disabled:
    'La sincronización no está configurada. Puedes seguir usando la biblioteca en este dispositivo.',
  unauthorized: 'Inicia sesión para utilizar esta función.',
  cancelled: 'Consulta cancelada.',
};
