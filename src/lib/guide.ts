import { MICROS, divRound, type Cents, type Micros } from './decimal';
import type { CalcOutput } from './calculator';
import { applyRate, computeForward, factor, type Breakdown, type TaxRates } from './engine';
import { ISR_RET_PM, IVA_PRESETS, RESICO_MENSUAL, findTier } from './presets';

/** Subtotal del ejemplo cuando el usuario aún no captura un monto: $10,000.00. */
export const GUIDE_EXAMPLE_SUBTOTAL: Cents = 1_000_000n;

const PM_RATES: TaxRates = { iva: IVA_PRESETS.pm.iva, retIva: IVA_PRESETS.pm.retIva, retIsr: ISR_RET_PM };

export interface GuideExample {
  /** `true` si los números son los de la factura capturada; `false` si es el ejemplo. */
  own: boolean;
  presetLabel: string;
  rates: TaxRates;
  breakdown: Breakdown;
  factor: Micros;
  /** Cuánto se recibe por cada $100.00 de subtotal. */
  per100: Cents;
  /** Estimación de ISR mensual si esta fuera la única factura cobrada del mes. `null` si excede RESICO. */
  isr: { tasa: Micros; causado: Cents; retenido: Cents; diff: Cents } | null;
  /** IVA del mes antes de restar el IVA de gastos. */
  iva: { cobrado: Cents; retenido: Cents; porPagar: Cents };
}

/**
 * Números para la guía fiscal: los de la factura actual si ya hay cálculo; si no, un subtotal
 * de $10,000 con las tasas elegidas (o con Persona Moral si las tasas aún no son válidas).
 */
export function guideExample(out: CalcOutput): GuideExample {
  const rates = out.rates ?? PM_RATES;
  const own = out.breakdown !== null && out.rates !== null;
  const breakdown = own && out.breakdown ? out.breakdown : computeForward(GUIDE_EXAMPLE_SUBTOTAL, rates);
  const f = factor(rates);

  const tier = RESICO_MENSUAL[findTier(breakdown.subtotal, RESICO_MENSUAL)];
  const isr = tier
    ? (() => {
        const causado = applyRate(breakdown.subtotal, tier.tasa);
        return { tasa: tier.tasa, causado, retenido: breakdown.retIsr, diff: causado - breakdown.retIsr };
      })()
    : null;

  return {
    own,
    presetLabel: out.rates ? out.preset.label : IVA_PRESETS.pm.label,
    rates,
    breakdown,
    factor: f,
    per100: divRound(10_000n * f, MICROS),
    isr,
    iva: { cobrado: breakdown.iva, retenido: breakdown.retIva, porPagar: breakdown.iva - breakdown.retIva },
  };
}
