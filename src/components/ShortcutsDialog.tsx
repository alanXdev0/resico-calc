import { Modal } from './Modal';
import { Kbd } from './ui';

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Enfocar el monto' },
  { keys: ['Enter'], label: 'En el monto: copiar el resultado principal' },
  { keys: ['Esc'], label: 'Salir del campo / cerrar' },
  { keys: ['M'], label: 'Cambiar Bruto ↔ Neto' },
  { keys: ['1', '–', '5'], label: 'Preset de IVA (PM, PF, Exportación, Frontera, Personalizado)' },
  { keys: ['R'], label: 'Activar / desactivar retención ISR' },
  { keys: ['D'], label: 'Activar / desactivar moneda extranjera' },
  { keys: ['S'], label: 'Copiar subtotal' },
  { keys: ['T'], label: 'Copiar total a recibir' },
  { keys: ['C'], label: 'Copiar resumen en Markdown' },
  { keys: ['⇧', 'C'], label: 'Copiar resumen en texto plano' },
  { keys: ['G'], label: 'Abrir la guía fiscal' },
  { keys: ['L'], label: 'Tema claro / oscuro' },
  { keys: ['?'], label: 'Mostrar esta ayuda' },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Atajos de teclado">
      <ul className="divide-y divide-line px-5 py-2">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-muted">{s.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {s.keys.map((k) =>
                k === '–' ? (
                  <span key={k} className="text-faint">
                    –
                  </span>
                ) : (
                  <Kbd key={k} always>
                    {k}
                  </Kbd>
                ),
              )}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
