import type { ReactNode } from 'react';
import type { CalcOutput } from '../lib/calculator';
import { formatCents, formatPercent, formatScaled, type Cents } from '../lib/decimal';
import { guideExample } from '../lib/guide';
import { retIvaParts } from '../lib/iva';
import { Modal } from './Modal';
import { cx } from './ui';

const SECTIONS = [
  { id: 'guia-resico', label: '¿Qué es RESICO?' },
  { id: 'guia-factura', label: 'Tu factura' },
  { id: 'guia-retenciones', label: '¿Quién retiene?' },
  { id: 'guia-modos', label: '¿Qué modo uso?' },
  { id: 'guia-pagos', label: 'Pagos mensuales' },
  { id: 'guia-glosario', label: 'Glosario' },
  { id: 'guia-errores', label: 'Errores comunes' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const money = (c: Cents) => `$${formatCents(c)}`;
const pct = (rate: bigint) => `${formatPercent(rate)} %`;

function Section({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-b border-line px-5 py-5 last:border-b-0">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <div className="mt-2.5 space-y-2.5 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Step({
  n,
  title,
  amount,
  sign,
  children,
  muted,
}: {
  n: number;
  title: string;
  amount: Cents;
  sign?: '+' | '−' | '=';
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <li className={cx('flex gap-3', muted && 'opacity-60')}>
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[11px] text-muted">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium text-fg">{title}</span>
          <span
            className={cx(
              'font-mono tabular-nums',
              sign === '+' ? 'text-plus' : sign === '−' ? 'text-minus' : sign === '=' ? 'font-semibold text-accent' : 'text-fg',
            )}
          >
            {sign && sign !== '=' ? `${sign} ` : ''}
            {money(amount)}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="font-medium text-fg">{term}</dt>
      <dd className="text-[13px]">{children}</dd>
    </div>
  );
}

export function GuideDialog({ open, onClose, out }: { open: boolean; onClose: () => void; out: CalcOutput }) {
  const g = guideExample(out);
  const { breakdown: b, rates } = g;
  const parts = retIvaParts(rates);
  const ivaRecibido = b.iva - b.retIva;

  const toolbar = (
    <nav aria-label="Secciones de la guía" className="flex gap-1.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="shrink-0 rounded-md border border-line-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-faint hover:text-fg"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );

  return (
    <Modal open={open} onClose={onClose} title="Guía fiscal" toolbar={toolbar} size="lg">
      <Section id="guia-resico" title="¿Qué es RESICO?">
        <p>
          El <strong className="text-fg">Régimen Simplificado de Confianza</strong> es para personas físicas con ingresos
          de hasta <strong className="text-fg">$3,500,000 al año</strong>. Pagas ISR con una tasa baja, de 1 % a 2.5 %,
          sobre lo que cobras, sin deducir gastos. El IVA funciona igual que en cualquier otro régimen.
        </p>
        <p>
          Al facturar un servicio, al precio se le <strong className="text-plus">suma IVA</strong> y, si tu cliente es una
          empresa, se le <strong className="text-minus">restan retenciones</strong>. Esta calculadora hace esa cuenta con
          centavos exactos, como la valida el SAT.
        </p>
      </Section>

      <Section id="guia-factura" title="Tu factura, paso a paso">
        <p className="inline-flex rounded-md bg-surface-2 px-2 py-1 text-xs">
          {g.own ? `Con los números de tu factura · ${g.presetLabel}` : `Ejemplo con un subtotal de $10,000.00 · ${g.presetLabel}`}
        </p>
        <ol className="space-y-3.5 pt-1">
          <Step n={1} title="Subtotal" amount={b.subtotal}>
            El precio de tu servicio, sin impuestos. Es tu ingreso y sobre él se calculan todos los impuestos.
          </Step>
          <Step n={2} title={`IVA ${pct(rates.iva)}`} amount={b.iva} sign="+">
            {rates.iva === 0n
              ? 'La tasa es 0 % (por ejemplo, en la exportación de servicios): no le cobras IVA al cliente, pero sí declaras la operación.'
              : `Se lo cobras al cliente además del precio. No es dinero tuyo: lo recaudas para pagarlo al SAT.`}
          </Step>
          <Step n={3} title={`Retención de ISR ${pct(rates.retIsr)}`} amount={b.retIsr} sign="−" muted={rates.retIsr === 0n}>
            {rates.retIsr === 0n
              ? 'Tu cliente no te retiene ISR: lo pagas tú completo en tu declaración mensual.'
              : `Tu cliente te descuenta ${pct(rates.retIsr)} del subtotal y lo paga al SAT a tu nombre. Es un adelanto de tu ISR: lo restas en tu declaración mensual.`}
          </Step>
          <Step
            n={4}
            title={`Retención de IVA ${parts ? parts.retained : '0 %'}`}
            amount={b.retIva}
            sign="−"
            muted={rates.retIva === 0n}
          >
            {parts
              ? `Tu cliente se queda con parte del IVA (${parts.retained} del subtotal) y lo paga al SAT por ti. A ti te llega el resto: ${money(ivaRecibido)}.`
              : 'No hay retención de IVA: recibes el IVA completo y lo pagas tú al SAT.'}
          </Step>
          <Step n={5} title="Total a recibir" amount={b.total} sign="=">
            Es lo que te depositan.
            {ivaRecibido > 0n && ` Ojo: incluye ${money(ivaRecibido)} de IVA que todavía tienes que pagar al SAT.`}
          </Step>
        </ol>
      </Section>

      <Section id="guia-retenciones" title="¿Quién te retiene qué?">
        <p>Depende de a quién le facturas:</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[30rem] text-left text-xs">
            <thead className="bg-surface-2 text-faint">
              <tr>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">IVA</th>
                <th className="px-3 py-2 font-medium">Retención IVA</th>
                <th className="px-3 py-2 font-medium">Retención ISR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-muted">
              <tr>
                <td className="px-3 py-2 font-sans text-fg">Empresa mexicana (persona moral)</td>
                <td className="px-3 py-2">16 %</td>
                <td className="px-3 py-2">2/3 = 10.6667 %</td>
                <td className="px-3 py-2">1.25 %</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-sans text-fg">Persona física</td>
                <td className="px-3 py-2">16 %</td>
                <td className="px-3 py-2">No</td>
                <td className="px-3 py-2">No</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-sans text-fg">Cliente en el extranjero</td>
                <td className="px-3 py-2">0 %</td>
                <td className="px-3 py-2">No</td>
                <td className="px-3 py-2">No</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-sans text-fg">Empresa en zona fronteriza</td>
                <td className="px-3 py-2">8 %</td>
                <td className="px-3 py-2">2/3 = 5.3333 %</td>
                <td className="px-3 py-2">1.25 %</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Solo las empresas (personas morales) están obligadas a retener. Lo que te retienen no se pierde: el cliente lo
          paga al SAT a tu nombre y tú lo restas en tus declaraciones.
        </p>
      </Section>

      <Section id="guia-modos" title="¿Qué modo uso?">
        <p>
          <strong className="text-fg">Bruto → Neto</strong>: ya acordaste un precio, por ejemplo “son $10,000 más IVA”.
          Capturas el subtotal y ves cuánto te llega.
        </p>
        <p>
          <strong className="text-fg">Neto → Bruto</strong>: sabes cuánto quieres que te depositen, por ejemplo “quiero
          recibir $10,000”. La calculadora te dice qué subtotal facturar. Como cada impuesto se redondea a centavos, a
          veces ningún subtotal da la cantidad exacta; en ese caso te da el que deja $0.01 más, nunca menos.
        </p>
        <p>
          <strong className="text-fg">Moneda extranjera</strong>: si cobras en dólares o euros, captura el monto y el tipo
          de cambio FIX para hacer la cuenta en pesos.
        </p>
      </Section>

      <Section id="guia-pagos" title="Después de facturar: tus pagos mensuales">
        <p>
          Cada mes presentas tu declaración a más tardar el <strong className="text-fg">día 17 del mes siguiente</strong>.
          En RESICO solo cuenta lo <strong className="text-fg">efectivamente cobrado</strong>: si te pagan después (factura
          PPD), el ingreso cuenta en el mes en que te pagan y emites el complemento de pago.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <p className="text-xs font-medium text-fg">ISR del mes</p>
            <p className="mt-1 text-xs">Ingresos cobrados (sin IVA) × tasa RESICO − ISR que te retuvieron</p>
            {g.isr ? (
              <dl className="mt-2.5 space-y-1 font-mono text-xs tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt>
                    {money(b.subtotal)} × {formatScaled(g.isr.tasa, 4, 2)} %
                  </dt>
                  <dd className="text-fg">{money(g.isr.causado)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>− retenido</dt>
                  <dd className="text-fg">{money(g.isr.retenido)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line pt-1">
                  <dt className="font-sans">{g.isr.diff >= 0n ? 'ISR a pagar' : 'La retención lo cubre'}</dt>
                  <dd className={g.isr.diff >= 0n ? 'text-fg' : 'text-accent'}>
                    {money(g.isr.diff >= 0n ? g.isr.diff : 0n)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-warn">Este monto supera el límite de RESICO.</p>
            )}
          </div>
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <p className="text-xs font-medium text-fg">IVA del mes</p>
            <p className="mt-1 text-xs">IVA que cobraste − IVA que te retuvieron − IVA de tus gastos</p>
            <dl className="mt-2.5 space-y-1 font-mono text-xs tabular-nums">
              <div className="flex justify-between gap-3">
                <dt>IVA cobrado</dt>
                <dd className="text-fg">{money(g.iva.cobrado)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>− retenido</dt>
                <dd className="text-fg">{money(g.iva.retenido)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-1">
                <dt className="font-sans">A pagar, antes de gastos</dt>
                <dd className="text-fg">{money(g.iva.porPagar)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <p className="text-xs text-faint">
          Cálculo si esta fuera tu única factura cobrada del mes. La tasa RESICO depende del total que cobres en el mes
          (consulta la tabla en el panel “Tabla ISR RESICO”). El IVA que pagas en gastos de tu actividad se resta del IVA a
          pagar.
        </p>
      </Section>

      <Section id="guia-glosario" title="Glosario">
        <dl className="space-y-2.5">
          <Term term="CFDI">La factura electrónica que emites y que el SAT valida.</Term>
          <Term term="Persona moral">Una empresa o sociedad (S.A. de C.V., S.C., S.A.P.I., etc.).</Term>
          <Term term="Traslado">Un impuesto que le cobras a tu cliente; en tu factura, el IVA.</Term>
          <Term term="Retención">Un impuesto que tu cliente te descuenta y paga al SAT por ti.</Term>
          <Term term="TasaOCuota">
            El porcentaje escrito como decimal de 6 dígitos que pide el CFDI: 16 % = 0.160000 y 10.6667 % = 0.106667.
          </Term>
          <Term term="Tipo de cambio FIX">
            El tipo de cambio oficial que publica Banxico; se usa para pasar a pesos lo que cobras en dólares.
          </Term>
          <Term term="Factor">
            Cuánto recibes por cada peso de subtotal. Con factor {formatScaled(g.factor, 6, 6)} recibes {money(g.per100)}{' '}
            por cada $100.00.
          </Term>
          <Term term="IVA acreditable">El IVA que pagaste en gastos de tu actividad y que restas del IVA que cobraste.</Term>
        </dl>
      </Section>

      <Section id="guia-errores" title="Errores comunes">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
          <li>
            <strong className="text-fg">Gastarte el IVA.</strong> Parte de lo que te depositan es del SAT; apártalo.
          </li>
          <li>
            <strong className="text-fg">Aplicar la tasa RESICO por factura.</strong> Se calcula sobre el total cobrado en el
            mes.
          </li>
          <li>
            <strong className="text-fg">Cotizarle a una empresa sin contar las retenciones.</strong> Si necesitas recibir una
            cantidad exacta, usa Neto → Bruto.
          </li>
          <li>
            <strong className="text-fg">Cobrar 16 % a un cliente del extranjero.</strong> Si el servicio se aprovecha fuera
            de México (por ejemplo, desarrollo de software), va a tasa 0 % y se factura al RFC genérico XEXX010101000.
          </li>
          <li>
            <strong className="text-fg">Usar el 8 % fronterizo sin estar inscrito</strong> en el padrón del estímulo.
          </li>
        </ul>
        <p className="rounded-lg bg-surface-2/60 px-3 py-2.5 text-xs text-faint">
          Esta guía es informativa y no sustituye la asesoría de un contador. Las reglas pueden cambiar; verifica en
          sat.gob.mx.
        </p>
      </Section>
    </Modal>
  );
}
