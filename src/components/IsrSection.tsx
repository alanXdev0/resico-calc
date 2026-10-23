import type { CalcInput, CalcOutput } from '../lib/calculator';
import { formatTasaOCuota, parsePercent } from '../lib/decimal';
import { ISR_CHIPS } from '../lib/presets';
import { Card, Chip, Switch, TextField } from './ui';

export function IsrSection({
  input,
  out,
  update,
}: {
  input: CalcInput;
  out: CalcOutput;
  update: (patch: Partial<CalcInput>) => void;
}) {
  const current = parsePercent(input.isrRate)?.value ?? null;
  const error = out.errors.find((e) => e.field === 'isr')?.message;
  const warning = out.warnings.find((e) => e.field === 'isr')?.message;
  const [retention, ...table] = ISR_CHIPS;

  return (
    <Card step="03" title="ISR">
      <div className="space-y-4">
        <Switch
          checked={input.isrEnabled}
          onChange={(isrEnabled) => update({ isrEnabled })}
          label="Retención de ISR"
          kbd="R"
          description="Solo las personas morales retienen ISR a RESICO PF: 1.25 % del subtotal (art. 113-J LISR)."
        />

        {input.isrEnabled ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {retention && (
                  <Chip
                    active={current === parsePercent(retention.value)?.value}
                    onClick={() => update({ isrRate: retention.value })}
                  >
                    {retention.label} <span className="text-faint">· {retention.hint}</span>
                  </Chip>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] uppercase tracking-wide text-faint">Tabla RESICO</span>
                {table.map((chip) => (
                  <Chip
                    key={chip.value}
                    active={current === parsePercent(chip.value)?.value}
                    onClick={() => update({ isrRate: chip.value })}
                  >
                    {chip.label}
                  </Chip>
                ))}
              </div>
            </div>
            <TextField
              label="Tasa personalizada"
              suffix="%"
              value={input.isrRate}
              onChange={(isrRate) => update({ isrRate })}
              error={error}
              hint={warning ?? (current !== null ? `TasaOCuota ${formatTasaOCuota(current)}` : undefined)}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-3 py-2.5 text-xs text-muted">
            Sin retención de ISR en este CFDI. Activa el switch si el receptor es persona moral.
          </p>
        )}
      </div>
    </Card>
  );
}
