import type { CalcInput, CalcOutput } from '../lib/calculator';
import { formatCents, formatScaled, formatTasaOCuota, plainCents, type Cents } from '../lib/decimal';
import { convertFromMxn } from '../lib/engine';
import { ivaSplit, rateText } from '../lib/iva';
import { buildMarkdown, buildPlainText } from '../lib/summary';
import { CopyButton } from './CopyButton';
import { IvaBreakdown } from './IvaBreakdown';
import { AlertIcon, FileTextIcon, HashIcon } from './icons';
import { Kbd, cx } from './ui';

interface Row {
  key: string;
  label: string;
  sign: '' | '+' | '−';
  /** Porcentaje visible junto a la etiqueta ("16 %", "2/3 del IVA"). */
  pill?: string;
  /** Explicación en una línea: qué hace y sobre qué se calcula. */
  detail: string;
  amount: Cents | null;
  inactive?: boolean;
  primary?: boolean;
}

function Amount({ value, className }: { value: Cents | null; className?: string }) {
  return (
    <span className={cx('font-mono tabular-nums', className)}>
      {value === null ? <span className="text-faint">—</span> : `$${formatCents(value)}`}
    </span>
  );
}

export function InvoiceCard({ input, out }: { input: CalcInput; out: CalcOutput }) {
  const b = out.breakdown;
  const rates = out.rates ?? { iva: out.preset.iva, retIva: out.preset.retIva, retIsr: 0n };
  const neto = input.mode === 'neto';

  const iva = rateText('iva', rates);
  const retIsr = rateText('retIsr', rates);
  const retIva = rateText('retIva', rates);
  const rows: Row[] = [
    {
      key: 'subtotal',
      label: neto ? 'Subtotal a facturar' : 'Subtotal',
      sign: '',
      detail: neto ? 'Captura este monto en el CFDI' : 'El precio de tu servicio, sin impuestos',
      amount: b?.subtotal ?? null,
      primary: neto,
    },
    {
      key: 'iva',
      label: 'IVA',
      sign: '+',
      pill: iva.short,
      detail: rates.iva === 0n ? 'Tasa 0 %: no se cobra IVA' : `Se suma · ${iva.detail}`,
      amount: b?.iva ?? null,
    },
    {
      key: 'retIsr',
      label: 'Retención de ISR',
      sign: '−',
      pill: retIsr.short,
      detail: rates.retIsr === 0n ? retIsr.detail : `Se resta · ${retIsr.detail}`,
      amount: b?.retIsr ?? null,
      inactive: rates.retIsr === 0n,
    },
    {
      key: 'retIva',
      label: 'Retención de IVA',
      sign: '−',
      pill: retIva.short,
      detail: rates.retIva === 0n ? retIva.detail : `Se resta · ${retIva.detail}`,
      amount: b?.retIva ?? null,
      inactive: rates.retIva === 0n,
    },
  ];

  const markdown = b ? buildMarkdown(input, out) : null;
  const text = b ? buildPlainText(input, out) : null;
  const retenido = b ? b.retIva + b.retIsr : null;
  const showFx = input.fxEnabled && out.fx !== null && b !== null;
  const split = b ? ivaSplit(b, rates) : null;

  return (
    <section aria-label="Desglose de la factura" className="overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Vista previa del CFDI</h2>
          <p className="truncate text-xs text-muted">
            {out.preset.label} · {neto ? 'Neto → Bruto' : 'Bruto → Neto'}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <CopyButton variant="button" value={markdown} label="Resumen Markdown">
            <span className="hidden sm:inline">Markdown</span>
            <span className="sm:hidden">MD</span>
          </CopyButton>
          <CopyButton variant="button" value={text} label="Resumen en texto" className="hidden sm:inline-flex">
            Texto
          </CopyButton>
        </div>
      </header>

      <div className="px-2 pt-2 sm:px-3">
        <ul className="divide-y divide-line/70">
          {rows.map((row) => (
            <li
              key={row.key}
              className={cx(
                'flex items-center gap-2 rounded-lg px-2 py-2.5',
                row.inactive && 'opacity-45',
                row.primary && b && 'bg-accent-soft',
              )}
            >
              <span
                className={cx(
                  'w-4 shrink-0 text-center font-mono text-sm',
                  row.sign === '+' ? 'text-plus' : row.sign === '−' ? 'text-minus' : 'text-faint',
                )}
              >
                {row.sign || '·'}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cx(
                    'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm',
                    row.primary && b ? 'font-semibold text-accent' : 'text-fg',
                  )}
                >
                  {row.label}
                  {row.pill && (
                    <span
                      className={cx(
                        'rounded px-1.5 py-px font-mono text-[11px] font-medium leading-4',
                        row.sign === '+' ? 'bg-plus/12 text-plus' : 'bg-minus/12 text-minus',
                      )}
                    >
                      {row.pill}
                    </span>
                  )}
                </div>
                <div className={cx('text-[11px]', row.primary && b ? 'text-accent/80' : 'text-faint')}>{row.detail}</div>
              </div>
              <Amount value={row.amount} className={cx('text-sm sm:text-base', row.primary && b && 'font-semibold text-accent')} />
              <CopyButton value={row.amount === null ? null : plainCents(row.amount)} label={row.label} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-4 border-t border-dashed border-line-strong sm:mx-5" />

      <div className="flex items-end justify-between gap-3 px-4 pt-4 pb-5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            Total a recibir
            {!neto && <Kbd>T</Kbd>}
          </div>
          <div className={cx('mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl', b ? 'text-accent' : 'text-faint')}>
            {b ? `$${formatCents(b.total)}` : '$0.00'}
          </div>
          {showFx && out.fx !== null && b && (
            <div className="mt-1 font-mono text-xs text-muted">
              ≈ {input.currency} {formatCents(convertFromMxn(b.total, out.fx))}
            </div>
          )}
        </div>
        <CopyButton value={b ? plainCents(b.total) : null} label="Total" className="size-10 border border-line-strong" />
      </div>

      {split && (
        <div className="mx-4 mb-4 sm:mx-5">
          <IvaBreakdown split={split} rates={rates} />
        </div>
      )}

      {out.reverse && !out.reverse.exact && (
        <div className="mx-4 mb-4 flex gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs leading-relaxed text-warn sm:mx-5">
          <AlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Por el redondeo a centavos de cada impuesto, ningún subtotal da exactamente{' '}
            <span className="font-mono">${formatCents(out.reverse.target)}</span>. Con este subtotal recibes{' '}
            <span className="font-mono">${formatCents(out.reverse.delta)}</span> más.
          </p>
        </div>
      )}

      {out.errors.length > 0 && (
        <ul className="mx-4 mb-4 space-y-1 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger sm:mx-5">
          {out.errors.map((e) => (
            <li key={e.field + e.message} className="flex gap-2">
              <AlertIcon className="mt-0.5 size-3.5 shrink-0" />
              {e.message}
            </li>
          ))}
        </ul>
      )}

      {!b && out.errors.length === 0 && (
        <p className="mx-4 mb-4 text-center text-xs text-faint sm:mx-5">
          {out.missing === 'fx' ? (
            'Captura el tipo de cambio para convertir a MXN.'
          ) : (
            <>
              Captura un monto para ver el desglose. <Kbd>/</Kbd>
            </>
          )}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2/50 px-4 py-2.5 font-mono text-[11px] text-muted sm:px-5">
        <span className="inline-flex items-center gap-1">
          <HashIcon className="size-3" />
          Factor {out.factor !== null ? formatScaled(out.factor, 6, 6) : '—'}
        </span>
        {retenido !== null && retenido > 0n && <span>Retenido ${formatCents(retenido)}</span>}
        {showFx && out.amount !== null && out.fx !== null && out.amountMxn !== null && (
          <span>
            {input.currency} {formatCents(out.amount)} × {formatScaled(out.fx, 6, 2)}
          </span>
        )}
        <span className="ml-auto hidden items-center gap-1 sm:inline-flex pointer-coarse:hidden">
          <FileTextIcon className="size-3" />
          <Kbd>C</Kbd> copia resumen
        </span>
        <details className="group w-full font-sans">
          <summary className="cursor-pointer list-none text-[11px] text-faint hover:text-muted [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform group-open:rotate-90">›</span> Datos para el CFDI
            (TasaOCuota)
          </summary>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-mono text-[11px]">
            <dt className="text-faint">IVA · Traslado</dt>
            <dd className="text-right text-muted">{formatTasaOCuota(rates.iva)}</dd>
            {rates.retIsr > 0n && (
              <>
                <dt className="text-faint">ISR · Retención</dt>
                <dd className="text-right text-muted">{formatTasaOCuota(rates.retIsr)}</dd>
              </>
            )}
            {rates.retIva > 0n && (
              <>
                <dt className="text-faint">IVA · Retención</dt>
                <dd className="text-right text-muted">{formatTasaOCuota(rates.retIva)}</dd>
              </>
            )}
          </dl>
        </details>
      </footer>
    </section>
  );
}
