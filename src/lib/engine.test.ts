import { describe, expect, it } from 'vitest';
import { MICROS, divRound } from './decimal';
import {
  applyRate,
  computeForward,
  computeReverse,
  convertFromMxn,
  convertToMxn,
  factor,
  type TaxRates,
} from './engine';
import { IVA_PRESETS, ISR_RET_PM, fronteraPreset } from './presets';

const PM: TaxRates = { iva: IVA_PRESETS.pm.iva, retIva: IVA_PRESETS.pm.retIva, retIsr: ISR_RET_PM };
const PF: TaxRates = { iva: IVA_PRESETS.pf.iva, retIva: 0n, retIsr: 0n };
const EXPORT: TaxRates = { iva: 0n, retIva: 0n, retIsr: 0n };
const FRONTERA_PM: TaxRates = { iva: fronteraPreset('pm').iva, retIva: fronteraPreset('pm').retIva, retIsr: ISR_RET_PM };
const FRONTERA_PF: TaxRates = { iva: fronteraPreset('pf').iva, retIva: 0n, retIsr: 0n };
/** Caso extremo personalizado: factor < 1. */
const HEAVY: TaxRates = { iva: 160_000n, retIva: 160_000n, retIsr: 100_000n };

describe('applyRate (Importe = Base × TasaOCuota, half-up a centavos)', () => {
  it('evita los errores de punto flotante en mitades exactas', () => {
    // $11.60 × 1.25 % = $0.145 → $0.15. Con Math.round(11.6 * 0.0125 * 100) se obtiene 14.
    expect(Math.round(11.6 * 0.0125 * 100)).toBe(14);
    expect(applyRate(1_160n, 12_500n)).toBe(15n);
    // $82.80 × 1.25 % = $1.035 → $1.04. En flotante 82.8 * 0.0125 * 100 = 103.4999… → 103.
    expect(Math.round(82.8 * 0.0125 * 100)).toBe(103);
    expect(applyRate(8_280n, 12_500n)).toBe(104n);
    // $2.80 × 1.25 % = $0.035 → $0.04
    expect(applyRate(280n, 12_500n)).toBe(4n);
  });

  it('calcula importes exactos con montos grandes', () => {
    expect(applyRate(123_456_789_012n, 160_000n)).toBe(19_753_086_242n);
    expect(applyRate(100_000_000n, 106_667n)).toBe(10_666_700n); // 1,000,000.00 × 0.106667
  });
});

describe('computeForward (Bruto → Neto)', () => {
  it('Persona Moral nacional: IVA 16 %, Ret. IVA 2/3, Ret. ISR 1.25 %', () => {
    expect(computeForward(1_000_000n, PM)).toEqual({
      subtotal: 1_000_000n,
      iva: 160_000n,
      retIva: 106_667n,
      retIsr: 12_500n,
      total: 1_040_833n,
    });
  });

  it('Persona Física nacional: solo IVA 16 %', () => {
    expect(computeForward(1_000_000n, PF).total).toBe(1_160_000n);
  });

  it('Exportación: tasa 0 %, sin retenciones', () => {
    expect(computeForward(5_000_000n, EXPORT)).toEqual({
      subtotal: 5_000_000n,
      iva: 0n,
      retIva: 0n,
      retIsr: 0n,
      total: 5_000_000n,
    });
  });

  it('Zona fronteriza: IVA 8 % con y sin retención proporcional', () => {
    expect(computeForward(1_000_000n, FRONTERA_PM)).toEqual({
      subtotal: 1_000_000n,
      iva: 80_000n,
      retIva: 53_333n,
      retIsr: 12_500n,
      total: 1_014_167n,
    });
    expect(computeForward(1_000_000n, FRONTERA_PF).total).toBe(1_080_000n);
  });

  it('el total sale de los importes ya redondeados (regla del CFDI)', () => {
    const b = computeForward(1_160n, PM); // $11.60
    expect(b).toEqual({ subtotal: 1_160n, iva: 186n, retIva: 124n, retIsr: 15n, total: 1_207n });
    expect(b.total).toBe(b.subtotal + b.iva - b.retIva - b.retIsr);
  });

  it('el total NO siempre crece con el subtotal (por eso la inversa busca, no despeja)', () => {
    expect(computeForward(679n, PM).total).toBe(708n);
    expect(computeForward(680n, PM).total).toBe(707n);
  });

  it('rechaza subtotales negativos', () => {
    expect(() => computeForward(-1n, PM)).toThrow(RangeError);
  });
});

describe('computeReverse (Neto → Bruto)', () => {
  it('recupera el subtotal de un neto conocido', () => {
    const r = computeReverse(1_040_833n, PM);
    expect(r.exact).toBe(true);
    expect(r.breakdown.subtotal).toBe(1_000_000n);
    expect(r.breakdown.total).toBe(1_040_833n);
  });

  it('corrige el centavo cuando round(Neto / Factor) falla', () => {
    const net = 1_000_012n; // quiero recibir $10,000.12
    const naive = divRound(net * MICROS, factor(PM));
    expect(naive).toBe(960_780n);
    expect(computeForward(naive, PM).total).toBe(1_000_011n); // la fórmula ingenua deja $0.01 menos

    const r = computeReverse(net, PM);
    expect(r.exact).toBe(true);
    expect(r.breakdown.subtotal).toBe(960_781n);
    expect(r.breakdown.total).toBe(net);
  });

  it('cuando ningún subtotal da el neto exacto, nunca deja menos de lo pedido', () => {
    const r = computeReverse(1_000_002n, PM); // $10,000.02 es inalcanzable con PM
    expect(r.exact).toBe(false);
    expect(r.delta).toBe(1n);
    expect(r.breakdown.total).toBe(1_000_003n);
    expect(r.breakdown.subtotal).toBe(960_772n);

    const pf = computeReverse(1_000_003n, PF); // también pasa con 16 % sin retenciones
    expect(pf.exact).toBe(false);
    expect(pf.breakdown.total).toBe(1_000_004n);
  });

  it('exportación: subtotal = neto', () => {
    const r = computeReverse(1_234_567n, EXPORT);
    expect(r.breakdown.subtotal).toBe(1_234_567n);
    expect(r.exact).toBe(true);
  });

  it('neto cero', () => {
    const r = computeReverse(0n, PM);
    expect(r.breakdown.subtotal).toBe(0n);
    expect(r.exact).toBe(true);
  });

  it('valida tasas y factor', () => {
    expect(() => computeReverse(100n, { iva: 0n, retIva: 0n, retIsr: MICROS })).toThrow(RangeError);
    expect(() => computeReverse(100n, { iva: -1n, retIva: 0n, retIsr: 0n })).toThrow(RangeError);
    expect(() => computeReverse(-1n, PM)).toThrow(RangeError);
  });

  /** PRNG determinista para que la prueba sea reproducible. */
  function mulberry32(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  const cases: [string, TaxRates][] = [
    ['PM', PM],
    ['PF', PF],
    ['Exportación', EXPORT],
    ['Frontera PM', FRONTERA_PM],
    ['Factor < 1', HEAVY],
  ];

  it.each(cases)('propiedades con 3,000 netos aleatorios: %s', (_name, rates) => {
    const rand = mulberry32(20261023);
    for (let i = 0; i < 3_000; i++) {
      // Netos de $0.01 a $5,000,000.00, con más densidad en montos chicos.
      const net = BigInt(Math.floor(rand() ** 3 * 500_000_000)) + 1n;
      const r = computeReverse(net, rates);
      const s = r.breakdown.subtotal;

      // 1. El desglose es consistente con el cálculo directo.
      expect(computeForward(s, rates)).toEqual(r.breakdown);
      // 2. Nunca se recibe menos de lo pedido, y el excedente es a lo más 1 centavo.
      expect(r.delta).toBe(r.breakdown.total - net);
      expect(r.delta >= 0n && r.delta <= 1n).toBe(true);
      expect(r.exact).toBe(r.delta === 0n);
      // 3. Si se reporta inexacto, de verdad no existe subtotal exacto cerca.
      if (!r.exact) {
        for (let d = -15n; d <= 15n; d++) {
          if (s + d < 0n) continue;
          expect(computeForward(s + d, rates).total).not.toBe(net);
        }
      }
    }
  });
});

describe('conversión de divisa', () => {
  it('USD → MXN con FIX de 4 decimales', () => {
    expect(convertToMxn(100_000n, 17_234_500n)).toBe(1_723_450n); // USD 1,000.00 × 17.2345
    expect(convertToMxn(1n, 17_234_500n)).toBe(17n); // USD 0.01 → MXN 0.17
  });

  it('MXN → divisa (referencia)', () => {
    expect(convertFromMxn(1_723_450n, 17_234_500n)).toBe(100_000n);
  });

  it('rechaza tipo de cambio cero', () => {
    expect(() => convertToMxn(100n, 0n)).toThrow(RangeError);
  });
});
