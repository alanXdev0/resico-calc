import { formatCents, formatPercent, formatPercentShort, formatScaled, formatTasaOCuota, type Cents } from './decimal';
import type { CalcInput, CalcOutput } from './calculator';
import { ivaSentence, ivaSplit, rateText, retIvaShare } from './iva';

export interface SummaryLine {
  key: 'subtotal' | 'iva' | 'retIsr' | 'retIva' | 'total';
  label: string;
  sign: '' | '+' | '−';
  /** Tasa en lenguaje llano ("16 % del subtotal", "2/3 del IVA = 10.6667 % del subtotal"); vacío si no aplica. */
  rate: string;
  amount: Cents;
}

/** Líneas en el orden de la tarjeta. Las retenciones con tasa 0 se omiten. */
export function summaryLines(out: CalcOutput): SummaryLine[] {
  const { breakdown: b, rates } = out;
  if (!b || !rates) return [];
  const lines: SummaryLine[] = [
    { key: 'subtotal', label: 'Subtotal', sign: '', rate: '', amount: b.subtotal },
    { key: 'iva', label: 'IVA', sign: '+', rate: rateText('iva', rates).detail, amount: b.iva },
  ];
  if (rates.retIsr > 0n) {
    lines.push({ key: 'retIsr', label: 'Retención ISR', sign: '−', rate: rateText('retIsr', rates).detail, amount: b.retIsr });
  }
  if (rates.retIva > 0n) {
    const share = retIvaShare(rates.iva, rates.retIva);
    const pct = `${formatPercent(rates.retIva)} %`;
    const rate = share?.fraction
      ? `${share.fraction} del IVA = ${pct} del subtotal`
      : share
        ? `${pct} del subtotal (${formatPercentShort(share.share)} % del IVA)`
        : `${pct} del subtotal`;
    lines.push({ key: 'retIva', label: 'Retención IVA', sign: '−', rate, amount: b.retIva });
  }
  lines.push({ key: 'total', label: 'Total a recibir', sign: '', rate: '', amount: b.total });
  return lines;
}

function headerLines(input: CalcInput, out: CalcOutput): string[] {
  const lines: string[] = [];
  const mode = input.mode === 'bruto' ? 'Bruto → Neto' : 'Neto → Bruto';
  lines.push(`Receptor: ${out.preset.label} · Modo: ${mode}`);
  if (input.fxEnabled && out.amount !== null && out.fx !== null && out.amountMxn !== null) {
    lines.push(
      `Conversión: ${input.currency} ${formatCents(out.amount)} × ${formatScaled(out.fx, 6, 2)} = MXN ${formatCents(out.amountMxn)}`,
    );
  }
  if (out.reverse && !out.reverse.exact) {
    lines.push(
      `Nota: ningún subtotal da exactamente ${formatCents(out.reverse.target)}; se recibe ${formatCents(out.reverse.delta)} más.`,
    );
  }
  return lines;
}

function footerLines(out: CalcOutput): string[] {
  const { breakdown: b, rates } = out;
  if (!b || !rates) return [];
  const tasas = [`IVA ${formatTasaOCuota(rates.iva)}`];
  if (rates.retIsr > 0n) tasas.push(`Ret. ISR ${formatTasaOCuota(rates.retIsr)}`);
  if (rates.retIva > 0n) tasas.push(`Ret. IVA ${formatTasaOCuota(rates.retIva)}`);
  return [ivaSentence(ivaSplit(b, rates), rates), `TasaOCuota CFDI: ${tasas.join(' · ')}`];
}

export function buildMarkdown(input: CalcInput, out: CalcOutput): string {
  const lines = summaryLines(out);
  if (!lines.length) return '';
  const rows = lines.map((l) => {
    const label = l.sign ? `(${l.sign}) ${l.label}` : l.label;
    const amount = formatCents(l.amount);
    return l.key === 'total' ? `| **${label}** | | **$${amount}** |` : `| ${label} | ${l.rate} | $${amount} |`;
  });
  return [
    '### Factura RESICO PF',
    '',
    ...headerLines(input, out).map((l) => `${l}  `),
    '',
    '| Concepto | Tasa | Importe MXN |',
    '|---|---|---:|',
    ...rows,
    '',
    ...footerLines(out).map((l) => `${l}  `),
  ].join('\n');
}

export function buildPlainText(input: CalcInput, out: CalcOutput): string {
  const lines = summaryLines(out);
  if (!lines.length) return '';
  const cells = lines.map((l) => ({
    label: l.sign ? `(${l.sign}) ${l.label}` : l.label,
    rate: l.rate,
    amount: `$${formatCents(l.amount)}`,
  }));
  const wLabel = Math.max(...cells.map((c) => c.label.length));
  const wRate = Math.max(...cells.map((c) => c.rate.length));
  const wAmount = Math.max(...cells.map((c) => c.amount.length));
  const rule = '-'.repeat(wLabel + wRate + wAmount + 4);
  const body = cells.map((c) => `${c.label.padEnd(wLabel)}  ${c.rate.padEnd(wRate)}  ${c.amount.padStart(wAmount)}`);
  // Separador antes del total.
  body.splice(body.length - 1, 0, rule);
  return ['FACTURA RESICO PF', ...headerLines(input, out), rule, ...body, '', ...footerLines(out)].join('\n');
}
