import {
  MICROS,
  parseFx,
  parseMoney,
  parsePercent,
  type Cents,
  type Micros,
} from './decimal';
import {
  MIN_FACTOR,
  computeForward,
  computeReverse,
  convertToMxn,
  factor,
  type Breakdown,
  type ReverseResult,
  type TaxRates,
} from './engine';
import { IVA_PRESETS, fronteraPreset, type IvaPreset, type PresetId, type Receptor } from './presets';

export type Mode = 'bruto' | 'neto';
export type Currency = 'USD' | 'EUR';
export type Field = 'amount' | 'fx' | 'iva' | 'retIva' | 'isr' | 'rates';

export interface CalcInput {
  mode: Mode;
  amount: string;
  fxEnabled: boolean;
  currency: Currency;
  fx: string;
  presetId: PresetId;
  receptor: Receptor;
  customIva: string;
  customRetIva: string;
  isrEnabled: boolean;
  isrRate: string;
}

export interface Issue {
  field: Field;
  message: string;
}

export interface CalcOutput {
  /** Preset resuelto (con las tasas personalizadas si aplica). */
  preset: IvaPreset;
  rates: TaxRates | null;
  factor: Micros | null;
  /** Monto capturado, en la moneda capturada. */
  amount: Cents | null;
  fx: Micros | null;
  /** Monto capturado convertido a MXN (igual a `amount` si no hay divisa). */
  amountMxn: Cents | null;
  breakdown: Breakdown | null;
  reverse: ReverseResult | null;
  errors: Issue[];
  warnings: Issue[];
  /** Campo obligatorio aún vacío (no es error: el usuario no ha terminado de capturar). */
  missing: 'amount' | 'fx' | null;
}

/** Retención ISR máxima que admite el catálogo c_TasaOCuota para ISR retenido. */
const ISR_MAX_CFDI: Micros = 350_000n;

function readRate(raw: string, field: Field, label: string, errors: Issue[], warnings: Issue[]): Micros | null {
  if (raw.trim() === '') {
    errors.push({ field, message: `Captura la tasa de ${label}` });
    return null;
  }
  const parsed = parsePercent(raw);
  if (!parsed) {
    errors.push({ field, message: `Tasa de ${label} inválida` });
    return null;
  }
  if (parsed.value > MICROS) {
    errors.push({ field, message: `La tasa de ${label} no puede exceder 100 %` });
    return null;
  }
  if (parsed.rounded) {
    warnings.push({ field, message: `Tasa de ${label} redondeada a 4 decimales (TasaOCuota de 6 decimales)` });
  }
  return parsed.value;
}

function resolvePreset(input: CalcInput, errors: Issue[], warnings: Issue[]): IvaPreset {
  if (input.presetId === 'frontera') return fronteraPreset(input.receptor);
  if (input.presetId !== 'custom') return IVA_PRESETS[input.presetId];

  const iva = readRate(input.customIva, 'iva', 'IVA trasladado', errors, warnings);
  const retIva = readRate(input.customRetIva, 'retIva', 'retención de IVA', errors, warnings);
  if (iva !== null && retIva !== null && retIva > iva) {
    warnings.push({ field: 'retIva', message: 'La retención de IVA excede el IVA trasladado' });
  }
  return {
    id: 'custom',
    label: 'Personalizado',
    hint: 'Tasas libres',
    iva: iva ?? 0n,
    retIva: retIva ?? 0n,
    retieneIsr: input.isrEnabled,
    legal: 'Tasas capturadas manualmente.',
  };
}

export function calculate(input: CalcInput): CalcOutput {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const preset = resolvePreset(input, errors, warnings);

  let retIsr: Micros | null = 0n;
  if (input.isrEnabled) {
    retIsr = readRate(input.isrRate, 'isr', 'retención de ISR', errors, warnings);
    if (retIsr !== null && retIsr > ISR_MAX_CFDI) {
      warnings.push({ field: 'isr', message: 'El CFDI admite retenciones de ISR de hasta 35 %' });
    }
  }

  let rates: TaxRates | null = null;
  let f: Micros | null = null;
  if (!errors.length && retIsr !== null) {
    rates = { iva: preset.iva, retIva: preset.retIva, retIsr };
    f = factor(rates);
    if (f < MIN_FACTOR) {
      errors.push({ field: 'rates', message: 'Las retenciones son mayores que subtotal + IVA (factor ≤ 1 %)' });
      rates = null;
    }
  }

  let fx: Micros | null = null;
  if (input.fxEnabled && input.fx.trim() !== '') {
    const parsed = parseFx(input.fx);
    if (!parsed) errors.push({ field: 'fx', message: 'Tipo de cambio inválido' });
    else if (parsed.value === 0n) errors.push({ field: 'fx', message: 'El tipo de cambio debe ser mayor a cero' });
    else {
      fx = parsed.value;
      if (parsed.rounded) warnings.push({ field: 'fx', message: 'Tipo de cambio redondeado a 6 decimales' });
    }
  }

  let amount: Cents | null = null;
  if (input.amount.trim() !== '') {
    const parsed = parseMoney(input.amount);
    if (!parsed) errors.push({ field: 'amount', message: 'Monto inválido: usa solo dígitos y punto decimal' });
    else {
      amount = parsed.value;
      if (parsed.rounded) warnings.push({ field: 'amount', message: 'Monto redondeado a centavos' });
    }
  }

  const amountMxn = amount === null ? null : input.fxEnabled ? (fx === null ? null : convertToMxn(amount, fx)) : amount;

  let breakdown: Breakdown | null = null;
  let reverse: ReverseResult | null = null;
  if (rates && amountMxn !== null) {
    if (input.mode === 'bruto') breakdown = computeForward(amountMxn, rates);
    else {
      reverse = computeReverse(amountMxn, rates);
      breakdown = reverse.breakdown;
    }
  }

  const missing =
    input.amount.trim() === '' ? 'amount' : input.fxEnabled && input.fx.trim() === '' ? 'fx' : null;

  return { preset, rates, factor: f, amount, fx, amountMxn, breakdown, reverse, errors, warnings, missing };
}
