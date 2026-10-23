import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AmountSection } from './components/AmountSection';
import { Header } from './components/Header';
import { InvoiceCard } from './components/InvoiceCard';
import { IsrSection } from './components/IsrSection';
import { IvaSection } from './components/IvaSection';
import { MobileResultBar } from './components/MobileResultBar';
import { ResicoPanel, type TableView } from './components/ResicoPanel';
import { GuideDialog } from './components/GuideDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { Toaster } from './components/Toaster';
import { useHotkeys } from './hooks/useHotkeys';
import { usePersistentState } from './hooks/usePersistentState';
import { calculate, type CalcInput } from './lib/calculator';
import { copyWithToast } from './lib/clipboard';
import { plainCents } from './lib/decimal';
import { IVA_PRESETS, PRESET_ORDER, fronteraPreset, type PresetId, type Receptor } from './lib/presets';
import { buildMarkdown, buildPlainText } from './lib/summary';
import { toast } from './lib/toast';

interface AppState extends CalcInput {
  theme: 'dark' | 'light';
  table: TableView;
}

const DEFAULTS: AppState = {
  mode: 'bruto',
  amount: '',
  fxEnabled: false,
  currency: 'USD',
  fx: '',
  presetId: 'pm',
  receptor: 'pm',
  customIva: '16',
  customRetIva: '0',
  isrEnabled: true,
  isrRate: '1.25',
  theme: 'dark',
  table: 'mensual',
};

export default function App() {
  const [state, update] = usePersistentState<AppState>('resico-calc:v1', DEFAULTS);
  const [helpOpen, setHelpOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardVisible, setCardVisible] = useState(false);

  const out = useMemo(() => calculate(state), [state]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => setCardVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0.35,
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#0b0d10' : '#f6f6f3');
  }, [state.theme]);

  /** Al elegir un preset, la retención de ISR sigue al tipo de receptor (el usuario puede cambiarla después). */
  const selectPreset = useCallback(
    (presetId: PresetId) =>
      update((prev) => {
        if (presetId === 'custom') return { presetId };
        const preset = presetId === 'frontera' ? fronteraPreset(prev.receptor) : IVA_PRESETS[presetId];
        return { presetId, isrEnabled: preset.retieneIsr };
      }),
    [update],
  );

  const selectReceptor = useCallback(
    (receptor: Receptor) => update({ receptor, isrEnabled: fronteraPreset(receptor).retieneIsr }),
    [update],
  );

  const b = out.breakdown;
  const copyTotal = () => copyWithToast(b && plainCents(b.total), 'Total');
  const copySubtotal = () => copyWithToast(b && plainCents(b.subtotal), 'Subtotal');
  const copyPrimary = () => (state.mode === 'bruto' ? copyTotal() : copySubtotal());
  const toggleTheme = () => update((prev) => ({ theme: prev.theme === 'dark' ? 'light' : 'dark' }));

  const presetKeys = Object.fromEntries(PRESET_ORDER.map((id, i) => [String(i + 1), () => selectPreset(id)]));

  useHotkeys({
    '/': () => amountRef.current?.focus(),
    m: () => update({ mode: state.mode === 'bruto' ? 'neto' : 'bruto' }),
    r: () => {
      toast(state.isrEnabled ? 'Retención ISR desactivada' : 'Retención ISR activada');
      update({ isrEnabled: !state.isrEnabled });
    },
    d: () => update({ fxEnabled: !state.fxEnabled }),
    s: copySubtotal,
    t: copyTotal,
    c: () => copyWithToast(b && buildMarkdown(state, out), 'Resumen Markdown'),
    C: () => copyWithToast(b && buildPlainText(state, out), 'Resumen en texto'),
    l: toggleTheme,
    '?': () => setHelpOpen(true),
    g: () => setGuideOpen(true),
    ...presetKeys,
  });

  return (
    <div className="min-h-dvh">
      <Header
        theme={state.theme}
        onToggleTheme={toggleTheme}
        onShowShortcuts={() => setHelpOpen(true)}
        onShowGuide={() => setGuideOpen(true)}
      />

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-6">
        <div className="min-w-0 space-y-4">
          <AmountSection input={state} out={out} update={update} amountRef={amountRef} onSubmitAmount={copyPrimary} />
          <IvaSection
            input={state}
            out={out}
            update={update}
            selectPreset={selectPreset}
            selectReceptor={selectReceptor}
          />
          <IsrSection input={state} out={out} update={update} />
        </div>

        {/* En pantallas bajas la columna fija tiene su propio scroll para que la tabla RESICO siga alcanzable. */}
        <aside className="min-w-0 space-y-4 [scrollbar-width:thin] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
          <div ref={cardRef} className="scroll-mt-4">
            <InvoiceCard input={state} out={out} />
          </div>
          <ResicoPanel out={out} view={state.table} onView={(table) => update({ table })} />
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs leading-relaxed text-faint lg:pb-10">
        <p>
          Herramienta de referencia para un CFDI de un solo concepto; no sustituye la asesoría de un contador. Los
          cálculos usan aritmética de centavos exacta y redondeo half-up por impuesto, como valida el SAT. Todo se
          calcula en tu navegador: ningún dato sale de tu equipo.
        </p>
      </footer>

      <MobileResultBar
        input={state}
        out={out}
        hidden={cardVisible}
        onShowDetail={() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} out={out} />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toaster />
    </div>
  );
}
