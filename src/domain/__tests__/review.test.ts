import { productReviewCases } from '@/tests/review/product-cases';
import { normalizeProduct } from '../product';
import { BARCODE } from '@/tests/fixtures';

describe('Casos reproducibles para revisión del lenguaje y evidencia', () => {
  test.each(productReviewCases)('$id: $focus', ({ raw, expected, traces, queriedAt }) => {
    const date = queriedAt ?? '2026-10-25T08:00:00.000Z';
    const result = normalizeProduct(raw, BARCODE, 'production', new Date(date));
    expect(result.assessment.state).toBe(expected);
    expect(result.assessment.traceWarnings).toEqual(traces);
    expect(result.source.fetchedAt).toBe(date);
    expect(result.source.provider).toBe('open_food_facts');
  });
});
