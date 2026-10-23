import type { Ref } from 'react';
import type { CalcInput, CalcOutput, Currency, Mode } from '../lib/calculator';
import { formatCents, formatScaled, parseMoney } from '../lib/decimal';
import { ExternalIcon, SwapIcon } from './icons';
import { Card, Kbd, Segmented, Switch, TextField } from './ui';

const BANXICO_FIX_URL = 'https://www.banxico.org.mx/tipcamb/main.do?page=tip&idioma=sp';

export function AmountSection({
  input,
  out,
  update,
  amountRef,
  onSubmitAmount,
}: {
  input: CalcInput;
  out: CalcOutput;
  update: (patch: Partial<CalcInput>) => void;
  amountRef: Ref<HTMLInputElement>;
  /** Enter en el campo de monto: copia el resultado principal. */
  onSubmitAmount: () => void;
}) {
  const errorOf = (field: string) => out.errors.find((e) => e.field === field)?.message;
  const warningOf = (field: string) => out.warnings.find((e) => e.field === field)?.message;
  const currencyCode = input.fxEnabled ? input.currency : 'MXN';

  const amountHint = (() => {
    const warning = warningOf('amount');
    if (warning) return <span className="text-warn">{warning}</span>;
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pointer-coarse:hidden">
        <span>
          <Kbd>/</Kbd> enfocar
        </span>
        <span>
          <Kbd>Enter</Kbd> copia el {input.mode === 'bruto' ? 'total' : 'subtotal'}
        </span>
      </span>
    );
  })();

  const formatOnBlur = () => {
    const parsed = parseMoney(input.amount);
    if (parsed) update({ amount: formatCents(parsed.value) });
  };

  return (
    <Card
      step="01"
      title="Monto"
      aside={
        <span className="hidden items-center gap-1.5 text-xs text-faint sm:flex pointer-coarse:hidden">
          <Kbd>M</Kbd> cambia modo
        </span>
      }
    >
      <div className="space-y-5">
        <Segmented<Mode>
          label="Dirección del cálculo"
          value={input.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'bruto', label: 'Bruto → Neto', sub: 'Tengo el subtotal' },
            { value: 'neto', label: 'Neto → Bruto', sub: 'Sé cuánto quiero recibir' },
          ]}
        />

        <TextField
          size="lg"
          inputRef={amountRef}
          label={input.mode === 'bruto' ? 'Subtotal antes de impuestos' : 'Neto que quieres recibir en tu cuenta'}
          labelAside={
            <button
              type="button"
              onClick={() => update({ mode: input.mode === 'bruto' ? 'neto' : 'bruto' })}
              className="inline-flex items-center gap-1 text-xs text-faint hover:text-fg"
              title="Cambiar dirección del cálculo (M)"
            >
              <SwapIcon className="size-3.5" />
              invertir
            </button>
          }
          prefix={currencyCode}
          placeholder="0.00"
          value={input.amount}
          onChange={(amount) => update({ amount })}
          onBlur={formatOnBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              formatOnBlur();
              onSubmitAmount();
            }
          }}
          error={errorOf('amount')}
          hint={amountHint}
        />

        <div className="rounded-lg border border-line bg-surface-2/50 p-4">
          <Switch
            checked={input.fxEnabled}
            onChange={(fxEnabled) => update({ fxEnabled })}
            label="Monto en moneda extranjera"
            kbd="D"
            description="Captura el monto en USD o EUR y conviértelo a MXN con el tipo de cambio FIX."
          />
          {input.fxEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted">Divisa</span>
                <Segmented<Currency>
                  label="Divisa"
                  size="sm"
                  value={input.currency}
                  onChange={(currency) => update({ currency })}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                  ]}
                />
              </div>
              <TextField
                label={`Tipo de cambio (MXN por 1 ${input.currency})`}
                labelAside={
                  <a
                    href={BANXICO_FIX_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-faint hover:text-fg"
                  >
                    FIX Banxico <ExternalIcon className="size-3" />
                  </a>
                }
                prefix="$"
                placeholder="17.2345"
                value={input.fx}
                onChange={(fx) => update({ fx })}
                error={errorOf('fx')}
                hint={
                  warningOf('fx') ??
                  (out.amount !== null && out.fx !== null && out.amountMxn !== null
                    ? `${input.currency} ${formatCents(out.amount)} × ${formatScaled(out.fx, 6, 2)} = MXN ${formatCents(out.amountMxn)}`
                    : 'El CFDI admite TipoCambio con hasta 6 decimales.')
                }
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
