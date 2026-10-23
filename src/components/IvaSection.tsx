import type { CalcInput, CalcOutput } from '../lib/calculator';
import { divRound, formatCents, formatPercent, formatPercentShort, parsePercent } from '../lib/decimal';
import { per100, retIvaParts, retIvaShare } from '../lib/iva';
import {
  IVA_PRESETS,
  PRESET_LABELS,
  PRESET_ORDER,
  fronteraPreset,
  type PresetId,
  type Receptor,
} from '../lib/presets';
import { InfoIcon } from './icons';
import { Card, Chip, Kbd, Segmented, TextField, cx } from './ui';

function presetHint(id: PresetId, receptor: Receptor) {
  if (id === 'custom') return 'Tasas libres';
  if (id === 'frontera') return fronteraPreset(receptor).hint;
  return IVA_PRESETS[id].hint;
}

export function IvaSection({
  input,
  out,
  update,
  selectPreset,
  selectReceptor,
}: {
  input: CalcInput;
  out: CalcOutput;
  update: (patch: Partial<CalcInput>) => void;
  selectPreset: (id: PresetId) => void;
  selectReceptor: (receptor: Receptor) => void;
}) {
  const errorOf = (field: string) => out.errors.find((e) => e.field === field)?.message;
  const warningOf = (field: string) => out.warnings.find((e) => e.field === field)?.message;
  const customIva = parsePercent(input.customIva)?.value ?? null;
  const customRetIva = parsePercent(input.customRetIva)?.value ?? null;
  const twoThirds = customIva === null ? null : divRound(customIva * 2n, 3n);
  const customShare = customIva !== null && customRetIva !== null ? retIvaShare(customIva, customRetIva) : null;
  const example = per100(out.preset);
  const exampleParts = retIvaParts(out.preset);

  return (
    <Card
      step="02"
      title="IVA"
      aside={
        <span className="hidden items-center gap-1.5 text-xs text-faint sm:flex pointer-coarse:hidden">
          <Kbd>1</Kbd>–<Kbd>5</Kbd> presets
        </span>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Tipo de receptor / régimen de IVA" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {PRESET_ORDER.map((id, index) => {
            const active = input.presetId === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectPreset(id)}
                className={cx(
                  'group flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong hover:bg-surface-2',
                )}
              >
                <span className="min-w-0">
                  <span className={cx('block text-sm font-medium', active ? 'text-fg' : 'text-fg/90')}>
                    {PRESET_LABELS[id]}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {presetHint(id, input.receptor)}
                  </span>
                </span>
                <Kbd className={cx(active && 'border-accent/50 text-accent')}>{index + 1}</Kbd>
              </button>
            );
          })}
        </div>

        {input.presetId === 'frontera' && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">¿Quién recibe la factura?</span>
            <Segmented<Receptor>
              label="Receptor en zona fronteriza"
              size="sm"
              value={input.receptor}
              onChange={selectReceptor}
              options={[
                { value: 'pm', label: 'Persona Moral · retiene 2/3 = 5.3333 %' },
                { value: 'pf', label: 'Persona Física · sin retenciones' },
              ]}
            />
          </div>
        )}

        {input.presetId === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <TextField
                label="IVA que cobras (% del subtotal)"
                suffix="%"
                value={input.customIva}
                onChange={(customIva) => update({ customIva })}
                error={errorOf('iva')}
                hint={warningOf('iva')}
              />
              <div className="flex flex-wrap gap-1.5">
                {['16', '8', '0'].map((v) => (
                  <Chip key={v} active={customIva === parsePercent(v)?.value} onClick={() => update({ customIva: v })}>
                    {v} %
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <TextField
                label="Retención de IVA (% del subtotal)"
                suffix="%"
                value={input.customRetIva}
                onChange={(customRetIva) => update({ customRetIva })}
                error={errorOf('retIva')}
                hint={
                  warningOf('retIva') ??
                  (customShare && customIva !== null && customRetIva !== null
                    ? customShare.fraction
                      ? `Equivale a ${customShare.fraction} del IVA: ${formatPercent(customIva)} % × ${customShare.fraction} = ${formatPercent(customRetIva)} %`
                      : `Equivale a ${formatPercentShort(customShare.share)} % del IVA`
                    : undefined)
                }
              />
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  active={twoThirds !== null && customRetIva === twoThirds}
                  onClick={() => twoThirds !== null && update({ customRetIva: formatPercent(twoThirds) })}
                  title="Dos terceras partes del IVA trasladado"
                >
                  2/3 del IVA{twoThirds !== null ? ` = ${formatPercent(twoThirds)} %` : ''}
                </Chip>
                <Chip active={customRetIva === 0n} onClick={() => update({ customRetIva: '0' })}>
                  0 %
                </Chip>
              </div>
            </div>
          </div>
        )}

        {out.errors.some((e) => e.field === 'rates') && (
          <p className="text-xs text-danger">{errorOf('rates')}</p>
        )}

        <div className="rounded-lg bg-surface-2/60 px-3 py-3 text-xs">
          <p className="font-medium text-fg">Por cada $100.00 de subtotal</p>
          {example.iva === 0n ? (
            <p className="mt-1.5 text-muted">No cobras IVA: la factura lleva tasa 0 %.</p>
          ) : (
            <dl className="mt-2 grid max-w-sm grid-cols-[auto_1fr_auto] items-baseline gap-x-2 gap-y-1">
              <dt className="font-mono text-plus">+</dt>
              <dd className="text-muted">Cobras de IVA ({formatPercent(out.preset.iva)} %)</dd>
              <dd className="text-right font-mono tabular-nums text-fg">${formatCents(example.iva)}</dd>
              {example.retenido > 0n && (
                <>
                  <dt className="font-mono text-minus">−</dt>
                  <dd className="text-muted">El cliente retiene ({exampleParts?.retained})</dd>
                  <dd className="text-right font-mono tabular-nums text-fg">${formatCents(example.retenido)}</dd>
                </>
              )}
              <dt className="font-mono text-faint">=</dt>
              <dd className="font-medium text-fg">
                IVA que llega a tu cuenta{exampleParts && ` (${exampleParts.received})`}
              </dd>
              <dd className="text-right font-mono font-medium tabular-nums text-fg">${formatCents(example.recibido)}</dd>
            </dl>
          )}
          <p className="mt-2.5 flex gap-1.5 border-t border-line pt-2.5 leading-relaxed text-faint">
            <InfoIcon className="mt-0.5 size-3 shrink-0" />
            {out.preset.legal}
          </p>
        </div>
      </div>
    </Card>
  );
}
