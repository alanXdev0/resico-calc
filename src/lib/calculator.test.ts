import { describe, expect, it } from 'vitest';
import { calculate, type CalcInput } from './calculator';
import { buildMarkdown, buildPlainText, summaryLines } from './summary';
import { RESICO_ANUAL, RESICO_MENSUAL, findTier } from './presets';

const base: CalcInput = {
  mode: 'bruto',
  amount: '10,000',
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

const run = (patch: Partial<CalcInput>) => calculate({ ...base, ...patch });

describe('calculate', () => {
  it('Bruto → Neto con Persona Moral', () => {
    const out = run({});
    expect(out.errors).toEqual([]);
    expect(out.breakdown?.total).toBe(1_040_833n);
    expect(out.factor).toBe(1_040_833n);
  });

  it('Neto → Bruto con Persona Moral', () => {
    const out = run({ mode: 'neto', amount: '10,408.33' });
    expect(out.breakdown?.subtotal).toBe(1_000_000n);
    expect(out.reverse?.exact).toBe(true);
  });

  it('sin retención de ISR', () => {
    const out = run({ isrEnabled: false });
    expect(out.rates?.retIsr).toBe(0n);
    expect(out.breakdown?.total).toBe(1_053_333n);
  });

  it('ISR personalizado (override)', () => {
    expect(run({ isrRate: '2.5' }).breakdown?.retIsr).toBe(25_000n);
    expect(run({ isrRate: 'x' }).errors[0]?.field).toBe('isr');
  });

  it('zona fronteriza depende del receptor', () => {
    expect(run({ presetId: 'frontera', receptor: 'pm' }).breakdown?.retIva).toBe(53_333n);
    expect(run({ presetId: 'frontera', receptor: 'pf', isrEnabled: false }).breakdown?.total).toBe(1_080_000n);
  });

  it('exportación con USD y tipo de cambio FIX', () => {
    const out = run({
      presetId: 'export',
      isrEnabled: false,
      fxEnabled: true,
      amount: '1,000',
      fx: '17.2345',
    });
    expect(out.amount).toBe(100_000n);
    expect(out.amountMxn).toBe(1_723_450n);
    expect(out.breakdown?.total).toBe(1_723_450n);
  });

  it('divisa sin tipo de cambio: pendiente (sin error ni resultado); inválido o cero: error', () => {
    const out = run({ fxEnabled: true, fx: '' });
    expect(out.errors).toEqual([]);
    expect(out.missing).toBe('fx');
    expect(out.breakdown).toBeNull();
    expect(run({ fxEnabled: true, fx: '0' }).errors[0]?.field).toBe('fx');
    expect(run({ fxEnabled: true, fx: 'abc' }).errors[0]?.field).toBe('fx');
  });

  it('personalizado: valida y advierte', () => {
    expect(run({ presetId: 'custom', customIva: '16', customRetIva: '10.6667' }).breakdown?.retIva).toBe(106_667n);
    expect(run({ presetId: 'custom', customIva: 'abc' }).errors[0]?.field).toBe('iva');
    expect(run({ presetId: 'custom', customIva: '120' }).errors[0]?.field).toBe('iva');
    expect(run({ presetId: 'custom', customIva: '8', customRetIva: '16' }).warnings[0]?.field).toBe('retIva');
    expect(run({ presetId: 'custom', customIva: '16.00001' }).warnings[0]?.field).toBe('iva');
  });

  it('factor ≤ 1 % es un error, no un cálculo absurdo', () => {
    const out = run({ presetId: 'custom', customIva: '0', customRetIva: '0', isrRate: '100' });
    expect(out.errors.map((e) => e.field)).toContain('rates');
    expect(out.breakdown).toBeNull();
  });

  it('monto vacío: sin errores ni resultado; monto inválido: error', () => {
    const empty = run({ amount: '' });
    expect(empty.errors).toEqual([]);
    expect(empty.missing).toBe('amount');
    expect(empty.breakdown).toBeNull();
    expect(run({}).missing).toBeNull();
    expect(run({ amount: '12abc' }).errors[0]?.field).toBe('amount');
    expect(run({ amount: '100.555' }).warnings[0]?.field).toBe('amount');
  });
});

describe('resumen copiable', () => {
  it('Markdown con tasas en lenguaje llano, reparto del IVA y TasaOCuota', () => {
    const md = buildMarkdown(base, calculate(base));
    expect(md).toContain('| (+) IVA | 16 % del subtotal | $1,600.00 |');
    expect(md).toContain('| (−) Retención ISR | 1.25 % del subtotal | $125.00 |');
    expect(md).toContain('| (−) Retención IVA | 2/3 del IVA = 10.6667 % del subtotal | $1,066.67 |');
    expect(md).toContain('| **Total a recibir** | | **$10,408.33** |');
    expect(md).toContain(
      'IVA 16 %: cobras $1,600.00; el cliente retiene $1,066.67 (2/3 = 10.6667 %) y recibes $533.33 (1/3 = 5.3333 %).',
    );
    expect(md).toContain('TasaOCuota CFDI: IVA 0.160000 · Ret. ISR 0.012500 · Ret. IVA 0.106667');
  });

  it('retención de IVA personalizada que no es 2/3', () => {
    const input = { ...base, presetId: 'custom' as const, customIva: '16', customRetIva: '10' };
    expect(buildMarkdown(input, calculate(input))).toContain('| (−) Retención IVA | 10 % del subtotal (62.5 % del IVA) |');
  });

  it('omite retenciones en cero', () => {
    const input = { ...base, presetId: 'export' as const, isrEnabled: false };
    const keys = summaryLines(calculate(input)).map((l) => l.key);
    expect(keys).toEqual(['subtotal', 'iva', 'total']);
  });

  it('texto plano alineado en columnas', () => {
    const text = buildPlainText(base, calculate(base));
    const all = text.split('\n');
    const table = all.slice(2, all.indexOf(''));
    expect(table.length).toBe(7); // regla, 4 conceptos, regla, total
    expect(new Set(table.map((l) => l.length)).size).toBe(1);
    expect(text).toContain('$10,408.33');
    expect(text).toContain('recibes $533.33');
  });

  it('avisa cuando el neto no se puede lograr exacto', () => {
    const input = { ...base, mode: 'neto' as const, amount: '10,000.02' };
    expect(buildMarkdown(input, calculate(input))).toContain('se recibe 0.01 más');
  });

  it('incluye la conversión de divisa', () => {
    const input = { ...base, fxEnabled: true, amount: '1000', fx: '17.2345' };
    expect(buildPlainText(input, calculate(input))).toContain('USD 1,000.00 × 17.2345 = MXN 17,234.50');
  });

  it('sin resultado no hay resumen', () => {
    expect(buildMarkdown({ ...base, amount: '' }, calculate({ ...base, amount: '' }))).toBe('');
  });
});

describe('tablas RESICO', () => {
  it('ubica el rango mensual (límites inclusivos)', () => {
    expect(findTier(2_500_000n, RESICO_MENSUAL)).toBe(0); // $25,000.00 → 1.00 %
    expect(findTier(2_500_001n, RESICO_MENSUAL)).toBe(1); // $25,000.01 → 1.10 %
    expect(findTier(8_333_333n, RESICO_MENSUAL)).toBe(2);
    expect(findTier(350_000_001n, RESICO_MENSUAL)).toBe(-1); // fuera de RESICO
  });

  it('ubica el rango anual', () => {
    expect(findTier(30_000_000n, RESICO_ANUAL)).toBe(0);
    expect(findTier(250_000_001n, RESICO_ANUAL)).toBe(4);
  });
});
