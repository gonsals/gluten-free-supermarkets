import { measureText, perUnitMilli } from '@/src/domain/measure';
import type { PriceQuote } from '@/src/domain/comparison';
import { quoteMoney } from '@/src/domain/comparison';
import { Copy } from '@/src/shared/ui';

export function UnitPrice({ quote }: { quote: PriceQuote }) {
  if (!quote.pack || quote.packInvalid)
    return (
      <Copy muted>
        Contenido del envase desconocido o no compatible; no calculamos precio por unidad.
      </Copy>
    );
  const perUnit = perUnitMilli(quote.amountMilli, quote.pack);
  return (
    <Copy muted>
      {measureText(quote.pack)} por envase · {perUnit ? quoteMoney(perUnit) : '<0,001 €'}/
      {quote.pack.unit === 'unit' ? 'unidad' : quote.pack.unit}. Precio unitario redondeado a tres
      decimales.
    </Copy>
  );
}
