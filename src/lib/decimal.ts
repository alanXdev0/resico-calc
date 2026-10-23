/**
 * Aritmética de punto fijo sin errores de punto flotante.
 *
 * - Dinero: `bigint` en centavos (2 decimales, igual que MXN en el CFDI).
 * - Tasas: `bigint` en millonésimas, es decir `TasaOCuota × 10^6`
 *   (el CFDI 4.0 expresa TasaOCuota con 6 decimales: 0.160000, 0.106667, 0.012500).
 * - Tipo de cambio: `bigint` en millonésimas (el atributo TipoCambio admite hasta 6 decimales).
 */

export type Cents = bigint;
export type Micros = bigint;

export const MICROS = 1_000_000n;
/** Decimales de una tasa expresada en porcentaje (0.106667 → 10.6667 %). */
export const PERCENT_DECIMALS = 4;
export const FX_DECIMALS = 6;

/** División entera redondeando a la mitad hacia arriba (half-up, simétrico respecto a cero). */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('División entre cero');
  if (d < 0n) return divRound(-n, -d);
  if (n < 0n) return -divRound(-n, d);
  return (n * 2n + d) / (2n * d);
}

/** División entera hacia abajo (floor) para cualquier signo. */
export function divFloor(n: bigint, d: bigint): bigint {
  if (d < 0n) return divFloor(-n, -d);
  const q = n / d;
  return n % d !== 0n && n < 0n ? q - 1n : q;
}

/** División entera hacia arriba (ceil) para cualquier signo. */
export function divCeil(n: bigint, d: bigint): bigint {
  return -divFloor(-n, d);
}

export interface ParsedDecimal {
  /** Valor escalado: `valor × 10^decimals`. */
  value: bigint;
  /** `true` si la entrada traía más decimales de los permitidos y se redondeó. */
  rounded: boolean;
}

/**
 * Convierte texto capturado por el usuario a un entero escalado.
 * Acepta separadores de miles con coma, espacios y signo `$` ("$ 12,345.67").
 * Rechaza negativos, letras y más de un punto decimal. Devuelve `null` si no es válido.
 */
export function parseDecimal(input: string, decimals: number): ParsedDecimal | null {
  const clean = input.replace(/[\s$,_]/g, '');
  const match = /^(\d*)(?:\.(\d*))?$/.exec(clean);
  if (!match) return null;
  const intPart = match[1] ?? '';
  const fracPart = match[2] ?? '';
  if (intPart === '' && fracPart === '') return null;

  const scale = 10n ** BigInt(decimals);
  const whole = BigInt(intPart || '0') * scale;
  if (fracPart.length <= decimals) {
    return { value: whole + BigInt(fracPart.padEnd(decimals, '0') || '0'), rounded: false };
  }
  // Más decimales de los permitidos: se redondea half-up sobre la representación exacta.
  const extra = 10n ** BigInt(fracPart.length - decimals);
  return { value: whole + divRound(BigInt(fracPart), extra), rounded: true };
}

export const parseMoney = (input: string) => parseDecimal(input, 2);
/** "10.6667" (porcentaje) → 106667n millonésimas. */
export const parsePercent = (input: string) => parseDecimal(input, PERCENT_DECIMALS);
export const parseFx = (input: string) => parseDecimal(input, FX_DECIMALS);

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formatea centavos: 1234567n → "12,345.67" (o "12345.67" con `grouping: false`). */
export function formatCents(cents: Cents, { grouping = true } = {}): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const int = (abs / 100n).toString();
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${grouping ? groupThousands(int) : int}.${frac}`;
}

/** Valor listo para pegar en el portal del SAT: sin `$` ni separadores de miles. */
export const plainCents = (cents: Cents) => formatCents(cents, { grouping: false });

/** Formatea una cantidad escalada con `decimals` decimales, quitando ceros sobrantes hasta `minDecimals`. */
export function formatScaled(value: bigint, decimals: number, minDecimals = 0): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = 10n ** BigInt(decimals);
  let frac = (abs % scale).toString().padStart(decimals, '0');
  while (frac.length > minDecimals && frac.endsWith('0')) frac = frac.slice(0, -1);
  const int = (abs / scale).toString();
  return `${negative ? '-' : ''}${int}${frac ? `.${frac}` : ''}`;
}

/** 106667n → "10.6667" ; 160000n → "16". */
export const formatPercent = (rate: Micros) => formatScaled(rate, PERCENT_DECIMALS);

/** Porcentaje redondeado para lectura rápida: 106667n → "10.67" ; 160000n → "16". */
export function formatPercentShort(rate: Micros, decimals = 2): string {
  return formatScaled(divRound(rate, 10n ** BigInt(PERCENT_DECIMALS - decimals)), decimals);
}

/** 106667n → "0.106667" (formato del atributo TasaOCuota del CFDI). */
export const formatTasaOCuota = (rate: Micros) => formatScaled(rate, 6, 6);
