import type { CalcOutput } from '../lib/calculator';
import { formatCents, formatScaled } from '../lib/decimal';
import { applyRate } from '../lib/engine';
import { RESICO_ANUAL, RESICO_MENSUAL, findTier } from '../lib/presets';
import { Segmented, cx } from './ui';

export type TableView = 'mensual' | 'anual';

const pct = (rate: bigint) => `${formatScaled(rate, 4, 2)} %`;

export function ResicoPanel({
  out,
  view,
  onView,
}: {
  out: CalcOutput;
  view: TableView;
  onView: (view: TableView) => void;
}) {
  const table = view === 'mensual' ? RESICO_MENSUAL : RESICO_ANUAL;
  const subtotal = out.breakdown?.subtotal ?? null;
  const income = subtotal === null || subtotal === 0n ? null : view === 'mensual' ? subtotal : subtotal * 12n;
  const tierIndex = income === null ? -1 : findTier(income, table);
  const tier = tierIndex >= 0 ? table[tierIndex] : undefined;
  const exceeds = income !== null && tierIndex === -1;

  const estimate =
    view === 'mensual' && tier && subtotal !== null && out.breakdown
      ? (() => {
          const causado = applyRate(subtotal, tier.tasa);
          const retenido = out.breakdown.retIsr;
          return { causado, retenido, diff: causado - retenido };
        })()
      : null;

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">Tabla ISR RESICO</h2>
        <div className="w-44">
          <Segmented<TableView>
            label="Periodo de la tabla"
            size="sm"
            value={view}
            onChange={onView}
            options={[
              { value: 'mensual', label: 'Mensual' },
              { value: 'anual', label: 'Anual' },
            ]}
          />
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <table className="w-full text-sm">
          <caption className="sr-only">Tasas de ISR RESICO {view}</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="pb-2 font-medium">Ingresos {view === 'mensual' ? 'del mes' : 'del año'} hasta</th>
              <th className="pb-2 text-right font-medium">Tasa</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {table.map((row, i) => (
              <tr
                key={row.tasa.toString()}
                className={cx(i === tierIndex ? 'bg-accent-soft text-accent' : 'text-muted')}
                aria-current={i === tierIndex ? 'true' : undefined}
              >
                <td className="rounded-l-md px-2 py-1.5">${formatCents(row.hasta)}</td>
                <td className="rounded-r-md px-2 py-1.5 text-right">{pct(row.tasa)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {income !== null && (
          <p className="mt-3 text-xs text-muted">
            {view === 'mensual' ? 'Subtotal de esta factura' : 'Proyección anual (subtotal × 12)'}:{' '}
            <span className="font-mono text-fg">${formatCents(income)}</span>
            {tier && <> → tasa {pct(tier.tasa)}</>}
          </p>
        )}

        {exceeds && (
          <p className="mt-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
            Supera el límite de RESICO ($3,500,000.00 de ingresos anuales).
          </p>
        )}

        {estimate && (
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 rounded-lg border border-line bg-surface-2/50 p-3 text-xs">
            <dt className="col-span-2 mb-1 font-medium text-fg">Si esta fuera tu única factura cobrada del mes</dt>
            <dt className="text-muted">ISR mensual estimado ({pct(tier!.tasa)})</dt>
            <dd className="text-right font-mono tabular-nums">${formatCents(estimate.causado)}</dd>
            <dt className="text-muted">(−) ISR retenido en el CFDI</dt>
            <dd className="text-right font-mono tabular-nums">${formatCents(estimate.retenido)}</dd>
            <dt className="border-t border-line pt-1.5 font-medium text-fg">
              {estimate.diff >= 0n ? 'ISR por pagar' : 'Retención excede el ISR estimado'}
            </dt>
            <dd
              className={cx(
                'border-t border-line pt-1.5 text-right font-mono font-medium tabular-nums',
                estimate.diff >= 0n ? 'text-fg' : 'text-accent',
              )}
            >
              ${formatCents(estimate.diff >= 0n ? estimate.diff : -estimate.diff)}
            </dd>
          </dl>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          La tasa se aplica sobre el total de ingresos efectivamente cobrados en el periodo (sin IVA), no por
          factura. Arts. 113-E y 113-F LISR. Estimación de referencia; confirma con tu contador.
        </p>
      </div>
    </section>
  );
}
