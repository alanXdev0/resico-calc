import { MICROS, formatCents, formatPercent, type Cents } from '../lib/decimal';
import type { TaxRates } from '../lib/engine';
import { retIvaParts, type IvaSplit } from '../lib/iva';
import { cx } from './ui';

/** Reparto visual del IVA de la factura: cuánto retiene el cliente y cuánto llega a tu cuenta. */
export function IvaBreakdown({ split, rates }: { split: IvaSplit; rates: TaxRates }) {
  if (split.iva === 0n) {
    return (
      <div className="rounded-lg border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-muted">
        <span className="font-medium text-fg">IVA 0 %:</span> no le cobras IVA al cliente en esta factura. El IVA
        que pagas en tus gastos sigue siendo acreditable.
      </div>
    );
  }

  const share = split.share?.share ?? 0n; // parte retenida, en millonésimas del IVA (solo para la barra)
  const retainedPct = share > MICROS ? 100 : Number(share) / 10_000;
  const parts = split.retenido > 0n ? retIvaParts(rates) : null;
  const ivaPct = `${formatPercent(rates.iva)} %`;
  const rows: { key: string; swatch: string; label: string; part: string; amount: Cents }[] = [];
  if (parts) {
    rows.push({
      key: 'retenido',
      swatch: 'bg-minus',
      label: 'Lo retiene el cliente y lo paga al SAT por ti',
      part: parts.retained,
      amount: split.retenido,
    });
  }
  rows.push({
    key: 'recibido',
    swatch: 'bg-plus',
    label: parts ? 'Llega a tu cuenta' : 'Llega completo a tu cuenta',
    part: parts ? parts.received : ivaPct,
    amount: split.recibido,
  });

  return (
    <div className="rounded-lg border border-line bg-surface-2/50 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium text-fg">Cómo se reparte el IVA</h3>
        <span className="font-mono text-xs tabular-nums text-muted">
          IVA {ivaPct} = <span className="text-fg">${formatCents(split.iva)}</span>
        </span>
      </div>

      <div
        className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-surface"
        role="img"
        aria-label={
          parts
            ? `IVA de ${ivaPct}: el cliente retiene ${parts.retained} y llega a tu cuenta ${parts.received}`
            : `IVA de ${ivaPct}: llega completo a tu cuenta`
        }
      >
        {retainedPct > 0 && <div className="bg-minus/80" style={{ width: `${retainedPct}%` }} />}
        {retainedPct < 100 && <div className="flex-1 bg-plus/80" />}
      </div>

      <dl className="mt-3 space-y-1.5 text-xs">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className={cx('size-2 shrink-0 rounded-full', row.swatch)} aria-hidden="true" />
            <dt className="min-w-0 flex-1 text-muted">
              {row.label}{' '}
              <span className="whitespace-nowrap font-mono text-faint">· {row.part}</span>
            </dt>
            <dd className="font-mono tabular-nums text-fg">${formatCents(row.amount)}</dd>
          </div>
        ))}
      </dl>

      {split.recibido > 0n && (
        <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-faint">
          Este IVA no es ingreso tuyo: los <span className="font-mono text-muted">${formatCents(split.recibido)}</span>{' '}
          que llegan a tu cuenta se pagan al SAT en tu declaración mensual de IVA, menos el IVA de tus gastos.
        </p>
      )}
    </div>
  );
}
