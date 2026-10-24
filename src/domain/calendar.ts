/** Calendar dates are entered and displayed in the device's local time zone. */
export function calendarDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarInstant(value: string, endOfDay = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Introduce una fecha válida con formato AAAA-MM-DD.');
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  if (!Number.isFinite(date.getTime()) || calendarDate(date) !== value)
    throw new Error('Introduce una fecha válida con formato AAAA-MM-DD.');
  return date.toISOString();
}
