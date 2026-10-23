import { describe, expect, it } from 'vitest';
import {
  divCeil,
  divFloor,
  divRound,
  formatCents,
  formatPercent,
  formatTasaOCuota,
  parseDecimal,
  parseFx,
  parseMoney,
  parsePercent,
  plainCents,
} from './decimal';

describe('divRound / divFloor / divCeil', () => {
  it('redondea half-up, simétrico respecto a cero', () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(-5n, 2n)).toBe(-3n);
    expect(divRound(4n, 3n)).toBe(1n);
    expect(divRound(5n, 3n)).toBe(2n);
    expect(divRound(7n, -2n)).toBe(-4n);
  });

  it('floor y ceil respetan el signo', () => {
    expect(divFloor(7n, 2n)).toBe(3n);
    expect(divFloor(-7n, 2n)).toBe(-4n);
    expect(divCeil(7n, 2n)).toBe(4n);
    expect(divCeil(-7n, 2n)).toBe(-3n);
    expect(divFloor(6n, 3n)).toBe(2n);
    expect(divCeil(6n, 3n)).toBe(2n);
  });

  it('rechaza división entre cero', () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError);
  });
});

describe('parseDecimal', () => {
  it('acepta formatos comunes de captura', () => {
    expect(parseMoney('12,345.67')).toEqual({ value: 1_234_567n, rounded: false });
    expect(parseMoney('$ 1,000')).toEqual({ value: 100_000n, rounded: false });
    expect(parseMoney('  250 ')).toEqual({ value: 25_000n, rounded: false });
    expect(parseMoney('.5')).toEqual({ value: 50n, rounded: false });
    expect(parseMoney('5.')).toEqual({ value: 500n, rounded: false });
    expect(parseMoney('0')).toEqual({ value: 0n, rounded: false });
  });

  it('redondea half-up cuando sobran decimales', () => {
    expect(parseMoney('12.345')).toEqual({ value: 1_235n, rounded: true });
    expect(parseMoney('12.344')).toEqual({ value: 1_234n, rounded: true });
    expect(parseMoney('0.005')).toEqual({ value: 1n, rounded: true });
    expect(parseMoney('1.005')).toEqual({ value: 101n, rounded: true }); // con flotantes daría 100
    expect(parseMoney('9.999')).toEqual({ value: 1_000n, rounded: true });
  });

  it('rechaza entradas inválidas', () => {
    for (const bad of ['', ' ', '.', 'abc', '1.2.3', '-5', '1e3', '12a', '1,2.3.4']) {
      expect(parseMoney(bad), bad).toBeNull();
    }
  });

  it('interpreta porcentajes como TasaOCuota en millonésimas', () => {
    expect(parsePercent('16')?.value).toBe(160_000n);
    expect(parsePercent('10.6667')?.value).toBe(106_667n);
    expect(parsePercent('1.25')?.value).toBe(12_500n);
    expect(parsePercent('10.666666')).toEqual({ value: 106_667n, rounded: true });
  });

  it('acepta tipo de cambio con 6 decimales', () => {
    expect(parseFx('17.2345')?.value).toBe(17_234_500n);
    expect(parseFx('18.123456')).toEqual({ value: 18_123_456n, rounded: false });
    expect(parseDecimal('18.1234567', 6)).toEqual({ value: 18_123_457n, rounded: true });
  });
});

describe('formato', () => {
  it('formatea centavos con y sin separadores', () => {
    expect(formatCents(123_456_789n)).toBe('1,234,567.89');
    expect(formatCents(5n)).toBe('0.05');
    expect(formatCents(100n)).toBe('1.00');
    expect(formatCents(-150n)).toBe('-1.50');
    expect(plainCents(123_456_789n)).toBe('1234567.89');
  });

  it('formatea tasas como porcentaje y como TasaOCuota', () => {
    expect(formatPercent(106_667n)).toBe('10.6667');
    expect(formatPercent(160_000n)).toBe('16');
    expect(formatPercent(12_500n)).toBe('1.25');
    expect(formatPercent(0n)).toBe('0');
    expect(formatTasaOCuota(106_667n)).toBe('0.106667');
    expect(formatTasaOCuota(160_000n)).toBe('0.160000');
    expect(formatTasaOCuota(0n)).toBe('0.000000');
  });
});
