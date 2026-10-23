import { useEffect, useRef } from 'react';

type Handler = (event: KeyboardEvent) => void;

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Atajos de una sola tecla (estilo GitHub / Linear), indexados por `event.key`.
 * Se ignoran mientras se escribe en un campo (salvo Escape, que sale del campo),
 * con Ctrl/Cmd/Alt presionados, o si hay un diálogo abierto.
 */
export function useHotkeys(handlers: Record<string, Handler>) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) {
        if (event.key === 'Escape') (event.target as HTMLElement).blur();
        return;
      }
      if (document.querySelector('dialog[open]')) return;
      const handler = ref.current[event.key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
