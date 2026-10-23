import { MICROS, divRound, formatCents, formatPercent, formatPercentShort, type Cents, type Micros } from './decimal';
import { computeForward, type Breakdown, type TaxRates } from './engine';

/**
 * Explicaciones del IVA en lenguaje llano: qué parte del IVA se retiene,
 * cuánto llega a la cuenta del emisor y ejemplos "por cada $100".
 * Cuando la retención es 2/3 del IVA siempre se dice a qué porcentaje equivale
 * ("2/3 = 10.6667 %"), porque la fracción sola no dice cuánto es.
 */

export interface RetIvaShare {
  /** Proporción del IVA que se retiene, en millonésimas del IVA (666669n ≈ 66.67 %). */
  share: Micros;
  /** "2/3" cuando la tasa corresponde a dos terceras partes del IVA; `null` si es otra proporción. */
  fraction: string | null;
  /** Fracción que sí recibe el emisor ("1/3"), si aplica. */
  rest: string | null;
}

/** Qué parte del IVA trasladado representa la retención. `null` si no hay IVA o no hay retención. */
export function retIvaShare(iva: Micros, retIva: Micros): RetIvaShare | null {
  if (iva === 0n || retIva === 0n) return null;
  const share = divRound(retIva * MICROS, iva);
  // Tolerancia de 1 millonésima: 0.106667 y 0.106666 son ambos "2/3 de 16 %" según el sistema.
  const diffTwoThirds = retIva * 3n - iva * 2n;
  if (diffTwoThirds >= -3n && diffTwoThirds <= 3n) return { share, fraction: '2/3', rest: '1/3' };
  return { share, fraction: null, rest: null };
}

export interface RetIvaParts {
  /** Lo que retiene el cliente: "2/3 = 10.6667 %" o solo "10 %". */
  retained: string;
  /** Lo que recibe el emisor: "1/3 = 5.3333 %" o solo "6 %". */
  received: string;
}

/** Retención de IVA y su complemento, como porcentajes del subtotal. `null` si no hay retención. */
export function retIvaParts(rates: Pick<TaxRates, 'iva' | 'retIva'>): RetIvaParts | null {
  if (rates.retIva === 0n) return null;
  const share = retIvaShare(rates.iva, rates.retIva);
  const retained = `${formatPercent(rates.retIva)} %`;
  const received = `${formatPercent(rates.iva - rates.retIva)} %`;
  return {
    retained: share?.fraction ? `${share.fraction} = ${retained}` : retained,
    received: share?.rest ? `${share.rest} = ${received}` : received,
  };
}

export interface IvaSplit {
  /** IVA cobrado al cliente. */
  iva: Cents;
  /** IVA que retiene el cliente y entera al SAT. */
  retenido: Cents;
  /** IVA que llega a la cuenta del emisor (puede ser negativo si la retención excede el IVA). */
  recibido: Cents;
  share: RetIvaShare | null;
}

export function ivaSplit(b: Pick<Breakdown, 'iva' | 'retIva'>, rates: Pick<TaxRates, 'iva' | 'retIva'>): IvaSplit {
  return { iva: b.iva, retenido: b.retIva, recibido: b.iva - b.retIva, share: retIvaShare(rates.iva, rates.retIva) };
}

/** Ejemplo con $100.00 de subtotal para explicar las tasas sin jerga. */
export function per100(rates: Pick<TaxRates, 'iva' | 'retIva'>): IvaSplit {
  const b = computeForward(10_000n, { iva: rates.iva, retIva: rates.retIva, retIsr: 0n });
  return ivaSplit(b, rates);
}

export interface RateText {
  /** Etiqueta corta para la línea: "16 %", "2/3 = 10.6667 %". */
  short: string;
  /** Sobre qué se calcula: "16 % del subtotal", "16 % × 2/3 = 10.6667 % del subtotal". */
  detail: string;
}

export function rateText(kind: 'iva' | 'retIsr' | 'retIva', rates: TaxRates): RateText {
  if (kind !== 'retIva') {
    const rate = rates[kind];
    if (kind === 'retIsr' && rate === 0n) return { short: '0 %', detail: 'No aplica' };
    return { short: `${formatPercent(rate)} %`, detail: `${formatPercent(rate)} % del subtotal` };
  }
  if (rates.retIva === 0n) return { short: '0 %', detail: 'No aplica' };
  const pct = `${formatPercent(rates.retIva)} %`;
  const share = retIvaShare(rates.iva, rates.retIva);
  if (share?.fraction) {
    return {
      short: `${share.fraction} = ${pct}`,
      detail: `${formatPercent(rates.iva)} % × ${share.fraction} = ${pct} del subtotal`,
    };
  }
  return { short: pct, detail: share ? `${formatPercentShort(share.share)} % del IVA` : `${pct} del subtotal` };
}

/** Una línea en lenguaje llano para resúmenes: "IVA 16 %: cobras $1,600.00; el cliente retiene…". */
export function ivaSentence(split: IvaSplit, rates: Pick<TaxRates, 'iva' | 'retIva'>): string {
  if (split.iva === 0n) return 'IVA: tasa 0 %, no se cobra IVA en esta factura.';
  const head = `IVA ${formatPercent(rates.iva)} %: cobras $${formatCents(split.iva)}`;
  const parts = retIvaParts(rates);
  if (!parts || split.retenido === 0n) return `${head} y lo recibes completo.`;
  return `${head}; el cliente retiene $${formatCents(split.retenido)} (${parts.retained}) y recibes $${formatCents(
    split.recibido,
  )} (${parts.received}).`;
}
