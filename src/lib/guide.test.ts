import { describe, expect, it } from 'vitest';
import { calculate, type CalcInput } from './calculator';
import { guideExample } from './guide';

const base: CalcInput = {
  mode: 'bruto',
  amount: '',
  fxEnabled: false,
  currency: 'USD',
  fx: '',
  presetId: 'pm',
  receptor: 'pm',
  customIva: '16',
  customRetIva: '0',
  isrEnabled: true,
  isrRate: '1.25',
};

describe('guideExample', () => {
  it('sin monto: ejemplo de $10,000 a una empresa', () => {
    const g = guideExample(calculate(base));
    expect(g.own).toBe(false);
    expect(g.breakdown.total).toBe(1_040_833n);
    expect(g.per100).toBe(10_408n); // $104.08 por cada $100
    expect(g.isr).toEqual({ tasa: 10_000n, causado: 10_000n, retenido: 12_500n, diff: -2_500n });
    expect(g.iva).toEqual({ cobrado: 160_000n, retenido: 106_667n, porPagar: 53_333n });
  });

  it('sin monto pero con otro preset: ejemplo de $10,000 con esas tasas', () => {
    const g = guideExample(calculate({ ...base, presetId: 'pf', isrEnabled: false }));
    expect(g.own).toBe(false);
    expect(g.presetLabel).toBe('Persona Física nacional');
    expect(g.breakdown.total).toBe(1_160_000n);
    expect(g.isr?.diff).toBe(10_000n); // nadie le retiene: paga $100.00 de ISR
  });

  it('con monto: usa la factura del usuario', () => {
    const g = guideExample(calculate({ ...base, amount: '45,000' }));
    expect(g.own).toBe(true);
    expect(g.breakdown.subtotal).toBe(4_500_000n);
    expect(g.isr?.tasa).toBe(11_000n); // $45,000 cae en el rango de 1.10 %
  });

  it('con tasas inválidas cae al ejemplo de Persona Moral', () => {
    const g = guideExample(calculate({ ...base, amount: '5000', isrRate: 'abc' }));
    expect(g.own).toBe(false);
    expect(g.presetLabel).toBe('Persona Moral nacional');
  });

  it('fuera del límite de RESICO no estima ISR', () => {
    expect(guideExample(calculate({ ...base, amount: '4,000,000' })).isr).toBeNull();
  });
});
