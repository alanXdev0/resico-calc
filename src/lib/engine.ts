import { MICROS, divCeil, divFloor, divRound, type Cents, type Micros } from './decimal';

/**
 * Motor de cálculo de una factura (un solo concepto) para RESICO Personas Físicas.
 *
 * Reglas de redondeo alineadas con el CFDI 4.0:
 *  - Cada impuesto: Importe = Base × TasaOCuota, redondeado half-up a 2 decimales (centavos).
 *  - Total = SubTotal + TotalImpuestosTrasladados − TotalImpuestosRetenidos,
 *    calculado a partir de los importes YA redondeados (así lo valida el SAT).
 */

export interface TaxRates {
  /** Tasa de IVA trasladado (0.160000 → 160000n). */
  iva: Micros;
  /** Tasa de IVA retenido (0.106667 → 106667n). */
  retIva: Micros;
  /** Tasa de ISR retenido (0.012500 → 12500n). 0 si no hay retención. */
  retIsr: Micros;
}

export interface Breakdown {
  subtotal: Cents;
  iva: Cents;
  retIva: Cents;
  retIsr: Cents;
  total: Cents;
}

export interface ReverseResult {
  breakdown: Breakdown;
  /** Neto que el usuario pidió recibir. */
  target: Cents;
  /** `breakdown.total − target`. 0 si se encontró un subtotal exacto. */
  delta: Cents;
  exact: boolean;
}

/** Factor mínimo admitido (1 %). Por debajo, la combinación de tasas no tiene sentido fiscal. */
export const MIN_FACTOR: Micros = 10_000n;

export function applyRate(base: Cents, rate: Micros): Cents {
  return divRound(base * rate, MICROS);
}

/** Factor = 1 + %IVA − %RetIVA − %RetISR, en millonésimas. */
export function factor(rates: TaxRates): Micros {
  return MICROS + rates.iva - rates.retIva - rates.retIsr;
}

export function assertValidRates(rates: TaxRates): void {
  for (const [name, value] of Object.entries(rates)) {
    if (value < 0n) throw new RangeError(`La tasa ${name} no puede ser negativa`);
    if (value > MICROS) throw new RangeError(`La tasa ${name} no puede exceder 100 %`);
  }
  if (factor(rates) < MIN_FACTOR) {
    throw new RangeError('Las retenciones superan al subtotal más IVA: el factor resultante es ≤ 1 %');
  }
}

/** Bruto → Neto: a partir del subtotal calcula impuestos y total a recibir. */
export function computeForward(subtotal: Cents, rates: TaxRates): Breakdown {
  if (subtotal < 0n) throw new RangeError('El subtotal no puede ser negativo');
  const iva = applyRate(subtotal, rates.iva);
  const retIva = applyRate(subtotal, rates.retIva);
  const retIsr = applyRate(subtotal, rates.retIsr);
  return { subtotal, iva, retIva, retIsr, total: subtotal + iva - retIva - retIsr };
}

/**
 * Neto → Bruto: encuentra el subtotal a facturar para recibir exactamente `net`.
 *
 * La fórmula ideal es Subtotal = Neto / Factor, pero como cada impuesto se redondea
 * por separado, `round(Neto / Factor)` puede quedar 1 centavo arriba o abajo, y hay
 * netos que ningún subtotal produce. Por eso:
 *
 *  1. Cada línea de impuesto introduce un error de redondeo de a lo más ±½ centavo,
 *     así que |total(S) − S·Factor| ≤ E = ½ × (número de tasas distintas de cero).
 *  2. Todo S con total(S) = Neto está en [(Neto − E)/Factor, (Neto + E)/Factor];
 *     se evalúa esa ventana completa (unos cuantos centavos).
 *  3. Si hay subtotales exactos se elige el más cercano a Neto/Factor.
 *     Si no existe ninguno, se elige el que deja el menor excedente (nunca menos
 *     de lo pedido), y se reporta la diferencia.
 */
export function computeReverse(net: Cents, rates: TaxRates): ReverseResult {
  if (net < 0n) throw new RangeError('El neto no puede ser negativo');
  assertValidRates(rates);
  const f = factor(rates);

  const lines = BigInt([rates.iva, rates.retIva, rates.retIsr].filter((r) => r !== 0n).length);
  // Límites en medios centavos para mantener todo en enteros: (2·Neto ∓ líneas) / (2·Factor).
  const lo = divFloor((2n * net - lines) * MICROS, 2n * f);
  const hi = divCeil((2n * net + lines) * MICROS, 2n * f);
  const ideal2 = divRound(2n * net * MICROS, f); // 2 × Neto/Factor, para comparar distancias sin fracciones

  let best: { breakdown: Breakdown; excess: bigint; distance: bigint } | null = null;
  for (let s = lo < 0n ? 0n : lo; s <= hi; s++) {
    const breakdown = computeForward(s, rates);
    const excess = breakdown.total - net;
    if (excess < 0n) continue;
    const distance = 2n * s > ideal2 ? 2n * s - ideal2 : ideal2 - 2n * s;
    if (
      !best ||
      excess < best.excess ||
      (excess === best.excess && distance < best.distance)
    ) {
      best = { breakdown, excess, distance };
    }
  }

  // Por construcción total(hi) ≥ Neto, así que siempre hay candidato.
  if (!best) throw new Error('No se encontró subtotal: ventana de búsqueda inválida');
  return { breakdown: best.breakdown, target: net, delta: best.excess, exact: best.excess === 0n };
}

/** Convierte un monto en divisa (centavos) a MXN con un tipo de cambio en millonésimas. */
export function convertToMxn(foreign: Cents, fx: Micros): Cents {
  if (fx <= 0n) throw new RangeError('El tipo de cambio debe ser mayor a cero');
  return divRound(foreign * fx, MICROS);
}

/** Convierte MXN a divisa (referencia informativa). */
export function convertFromMxn(mxn: Cents, fx: Micros): Cents {
  if (fx <= 0n) throw new RangeError('El tipo de cambio debe ser mayor a cero');
  return divRound(mxn * MICROS, fx);
}
