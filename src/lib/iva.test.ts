import { describe, expect, it } from 'vitest';
import { formatPercentShort } from './decimal';
import { computeForward, type TaxRates } from './engine';
import { ivaSentence, ivaSplit, per100, rateText, retIvaParts, retIvaShare } from './iva';

const PM: TaxRates = { iva: 160_000n, retIva: 106_667n, retIsr: 12_500n };
const PF: TaxRates = { iva: 160_000n, retIva: 0n, retIsr: 0n };
const EXPORT: TaxRates = { iva: 0n, retIva: 0n, retIsr: 0n };
const FRONTERA_PM: TaxRates = { iva: 80_000n, retIva: 53_333n, retIsr: 12_500n };
const CUSTOM: TaxRates = { iva: 160_000n, retIva: 100_000n, retIsr: 0n };

describe('formatPercentShort', () => {
  it('redondea a 2 decimales y quita ceros', () => {
    expect(formatPercentShort(106_667n)).toBe('10.67');
    expect(formatPercentShort(666_669n)).toBe('66.67');
    expect(formatPercentShort(160_000n)).toBe('16');
    expect(formatPercentShort(12_500n)).toBe('1.25');
  });
});

describe('retIvaShare', () => {
  it('reconoce 2/3 del IVA en 16 % y 8 %, con ambas variantes de TasaOCuota', () => {
    expect(retIvaShare(160_000n, 106_667n)).toEqual({ share: 666_669n, fraction: '2/3', rest: '1/3' });
    expect(retIvaShare(160_000n, 106_666n)?.fraction).toBe('2/3');
    expect(retIvaShare(80_000n, 53_333n)?.fraction).toBe('2/3');
  });

  it('otras proporciones no se nombran como fracción', () => {
    expect(retIvaShare(160_000n, 100_000n)).toEqual({ share: 625_000n, fraction: null, rest: null });
    expect(retIvaShare(160_000n, 160_000n)?.fraction).toBeNull();
  });

  it('sin IVA o sin retención no hay proporción', () => {
    expect(retIvaShare(0n, 0n)).toBeNull();
    expect(retIvaShare(160_000n, 0n)).toBeNull();
  });
});

describe('2/3 siempre con su porcentaje', () => {
  it('16 %: 2/3 = 10.6667 % y 1/3 = 5.3333 %', () => {
    expect(retIvaParts(PM)).toEqual({ retained: '2/3 = 10.6667 %', received: '1/3 = 5.3333 %' });
  });

  it('frontera 8 %: 2/3 = 5.3333 % y 1/3 = 2.6667 %', () => {
    expect(retIvaParts(FRONTERA_PM)).toEqual({ retained: '2/3 = 5.3333 %', received: '1/3 = 2.6667 %' });
  });

  it('retención que no es 2/3: solo porcentajes', () => {
    expect(retIvaParts(CUSTOM)).toEqual({ retained: '10 %', received: '6 %' });
    expect(retIvaParts(PF)).toBeNull();
  });
});

describe('reparto del IVA', () => {
  it('por cada $100 de subtotal con Persona Moral', () => {
    expect(per100(PM)).toMatchObject({ iva: 1_600n, retenido: 1_067n, recibido: 533n });
  });

  it('frase con montos y porcentajes', () => {
    expect(ivaSentence(ivaSplit(computeForward(1_000_000n, PM), PM), PM)).toBe(
      'IVA 16 %: cobras $1,600.00; el cliente retiene $1,066.67 (2/3 = 10.6667 %) y recibes $533.33 (1/3 = 5.3333 %).',
    );
    expect(ivaSentence(ivaSplit(computeForward(1_000_000n, CUSTOM), CUSTOM), CUSTOM)).toBe(
      'IVA 16 %: cobras $1,600.00; el cliente retiene $1,000.00 (10 %) y recibes $600.00 (6 %).',
    );
  });

  it('frases sin retención y con tasa 0 %', () => {
    expect(ivaSentence(ivaSplit(computeForward(1_000_000n, PF), PF), PF)).toBe(
      'IVA 16 %: cobras $1,600.00 y lo recibes completo.',
    );
    expect(ivaSentence(ivaSplit(computeForward(1_000_000n, EXPORT), EXPORT), EXPORT)).toBe(
      'IVA: tasa 0 %, no se cobra IVA en esta factura.',
    );
  });
});

describe('rateText', () => {
  it('describe cada tasa en lenguaje llano', () => {
    expect(rateText('iva', PM)).toEqual({ short: '16 %', detail: '16 % del subtotal' });
    expect(rateText('retIsr', PM)).toEqual({ short: '1.25 %', detail: '1.25 % del subtotal' });
    expect(rateText('retIva', PM)).toEqual({ short: '2/3 = 10.6667 %', detail: '16 % × 2/3 = 10.6667 % del subtotal' });
    expect(rateText('retIva', FRONTERA_PM).short).toBe('2/3 = 5.3333 %');
    expect(rateText('retIva', PF)).toEqual({ short: '0 %', detail: 'No aplica' });
    expect(rateText('retIsr', PF)).toEqual({ short: '0 %', detail: 'No aplica' });
    expect(rateText('retIva', CUSTOM)).toEqual({ short: '10 %', detail: '62.5 % del IVA' });
  });
});
