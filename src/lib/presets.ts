import type { Cents, Micros } from './decimal';

export type PresetId = 'pm' | 'pf' | 'export' | 'frontera' | 'custom';
export type Receptor = 'pm' | 'pf';

export interface IvaPreset {
  id: PresetId;
  label: string;
  /** Texto corto para chips y atajos. */
  hint: string;
  iva: Micros;
  retIva: Micros;
  /** Si el receptor normalmente retiene ISR 1.25 % (art. 113-J LISR: solo personas morales). */
  retieneIsr: boolean;
  legal: string;
}

/** 16 % × 2/3 = 10.6666…% → TasaOCuota 0.106667 (6 decimales). Algunos PAC usan 0.106666. */
export const RET_IVA_DOS_TERCIOS_16: Micros = 106_667n;
/** 8 % × 2/3 = 5.3333…% → TasaOCuota 0.053333. */
export const RET_IVA_DOS_TERCIOS_8: Micros = 53_333n;

export const ISR_RET_PM: Micros = 12_500n;

export const IVA_PRESETS: Record<Exclude<PresetId, 'custom' | 'frontera'>, IvaPreset> = {
  pm: {
    id: 'pm',
    label: 'Persona Moral nacional',
    hint: 'Cobras IVA 16 % · te retienen 2/3 = 10.6667 %',
    iva: 160_000n,
    retIva: RET_IVA_DOS_TERCIOS_16,
    retieneIsr: true,
    legal: 'Art. 1-A fr. II LIVA y art. 3 fr. I RLIVA: retención de 2/3 del IVA (16 % × 2/3 = 10.6667 %).',
  },
  pf: {
    id: 'pf',
    label: 'Persona Física nacional',
    hint: 'Cobras IVA 16 % · sin retenciones',
    iva: 160_000n,
    retIva: 0n,
    retieneIsr: false,
    legal: 'Las personas físicas no retienen IVA ni ISR a contribuyentes RESICO.',
  },
  export: {
    id: 'export',
    label: 'Exportación de servicios',
    hint: 'IVA 0 % · sin retenciones',
    iva: 0n,
    retIva: 0n,
    retieneIsr: false,
    legal: 'Tasa 0 % por servicios aprovechados en el extranjero (art. 29 fr. IV LIVA).',
  },
};

export function fronteraPreset(receptor: Receptor): IvaPreset {
  return {
    id: 'frontera',
    label: 'Zona fronteriza',
    hint: receptor === 'pm' ? 'Cobras IVA 8 % · te retienen 2/3 = 5.3333 %' : 'Cobras IVA 8 % · sin retenciones',
    iva: 80_000n,
    retIva: receptor === 'pm' ? RET_IVA_DOS_TERCIOS_8 : 0n,
    retieneIsr: receptor === 'pm',
    legal:
      'Estímulo fiscal de IVA en región fronteriza (requiere inscripción en el padrón y que el servicio se preste en la región; verifica la vigencia del decreto).',
  };
}

/** Orden de los presets en la UI; el índice + 1 es su atajo de teclado. */
export const PRESET_ORDER: PresetId[] = ['pm', 'pf', 'export', 'frontera', 'custom'];

export const PRESET_LABELS: Record<PresetId, string> = {
  pm: 'Persona Moral',
  pf: 'Persona Física',
  export: 'Exportación',
  frontera: 'Frontera 8 %',
  custom: 'Personalizado',
};

/** Atajos de ISR. 1.25 % es la retención; el resto son las tasas de la tabla RESICO. */
export const ISR_CHIPS: { value: string; label: string; hint: string }[] = [
  { value: '1.25', label: '1.25 %', hint: 'Retención PM' },
  { value: '1.00', label: '1.00 %', hint: 'Tabla' },
  { value: '1.10', label: '1.10 %', hint: 'Tabla' },
  { value: '1.50', label: '1.50 %', hint: 'Tabla' },
  { value: '2.00', label: '2.00 %', hint: 'Tabla' },
  { value: '2.50', label: '2.50 %', hint: 'Tabla' },
];

export interface ResicoTier {
  /** Límite superior del rango, inclusive, en centavos. */
  hasta: Cents;
  tasa: Micros;
}

/** Tabla mensual del art. 113-E LISR. */
export const RESICO_MENSUAL: ResicoTier[] = [
  { hasta: 2_500_000n, tasa: 10_000n },
  { hasta: 5_000_000n, tasa: 11_000n },
  { hasta: 8_333_333n, tasa: 15_000n },
  { hasta: 20_833_333n, tasa: 20_000n },
  { hasta: 350_000_000n, tasa: 25_000n },
];

/** Tabla anual del art. 113-F LISR. */
export const RESICO_ANUAL: ResicoTier[] = [
  { hasta: 30_000_000n, tasa: 10_000n },
  { hasta: 60_000_000n, tasa: 11_000n },
  { hasta: 100_000_000n, tasa: 15_000n },
  { hasta: 250_000_000n, tasa: 20_000n },
  { hasta: 350_000_000n, tasa: 25_000n },
];

/** Índice del rango que corresponde a `ingresos`, o -1 si supera el límite de RESICO. */
export function findTier(ingresos: Cents, table: ResicoTier[]): number {
  return table.findIndex((tier) => ingresos <= tier.hasta);
}
