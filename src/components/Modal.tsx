import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Kbd, cx } from './ui';

/**
 * Modal sobre `<dialog>` nativo: foco atrapado, Esc para cerrar y fondo inerte gratis.
 * El encabezado (y `toolbar`, si se pasa) queda fijo; el cuerpo hace scroll.
 */
export function Modal({
  open,
  onClose,
  title,
  toolbar,
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Contenido fijo bajo el título (p. ej. un índice de secciones). */
  toolbar?: ReactNode;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
      className={cx(
        'm-auto flex-col overflow-hidden rounded-xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex',
        size === 'lg'
          ? 'max-h-[min(88dvh,56rem)] w-[min(46rem,calc(100vw-1.5rem))]'
          : 'max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))]',
      )}
    >
      <div className="shrink-0 border-b border-line">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-xs text-muted hover:text-fg">
            <Kbd always>Esc</Kbd>
          </button>
        </div>
        {toolbar}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
