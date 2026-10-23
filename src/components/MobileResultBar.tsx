import type { CalcInput, CalcOutput } from '../lib/calculator';
import { formatCents, plainCents } from '../lib/decimal';
import { CopyButton } from './CopyButton';
import { cx } from './ui';

/**
 * Resultado principal fijo abajo en pantallas chicas, donde la tarjeta del CFDI
 * queda debajo de todos los campos. Se oculta cuando la tarjeta ya está a la vista.
 */
export function MobileResultBar({
  input,
  out,
  hidden,
  onShowDetail,
}: {
  input: CalcInput;
  out: CalcOutput;
  hidden: boolean;
  onShowDetail: () => void;
}) {
  const b = out.breakdown;
  const bruto = input.mode === 'bruto';
  const primary = b ? (bruto ? b.total : b.subtotal) : null;
  const secondary = b ? (bruto ? `Subtotal $${formatCents(b.subtotal)}` : `Recibes $${formatCents(b.total)}`) : null;

  return (
    <div
      aria-hidden={hidden}
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform lg:hidden',
        hidden && 'pointer-events-none translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button type="button" onClick={onShowDetail} className="min-w-0 flex-1 text-left" tabIndex={hidden ? -1 : 0}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
            {bruto ? 'Total a recibir' : 'Subtotal a facturar'}
          </span>
          <span className={cx('block font-mono text-xl font-semibold tabular-nums', b ? 'text-accent' : 'text-faint')}>
            ${primary === null ? '0.00' : formatCents(primary)}
          </span>
          <span className="block truncate text-[11px] text-faint">
            {secondary ? `${secondary} · ver desglose ↓` : 'Captura un monto'}
          </span>
        </button>
        <CopyButton
          value={primary === null ? null : plainCents(primary)}
          label={bruto ? 'Total' : 'Subtotal'}
          className="size-11 border border-line-strong"
        />
      </div>
    </div>
  );
}
