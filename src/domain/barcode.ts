export function normalizeBarcode(input: string): string {
  if (!/^[\d\s-]+$/.test(input)) throw new Error('invalid_barcode');
  const code = input.replace(/[\s-]/g, '');
  if (![8, 12, 13, 14].includes(code.length)) throw new Error('invalid_barcode');
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3)
    sum += Number(code[i]) * weight;
  if ((10 - (sum % 10)) % 10 !== Number(code.at(-1))) throw new Error('invalid_barcode');
  return code;
}
export function sameGtin(a: string, b: string): boolean {
  return a.padStart(14, '0') === b.padStart(14, '0');
}
