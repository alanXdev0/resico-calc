export interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

type Listener = (toast: Toast | null) => void;

const listeners = new Set<Listener>();
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string, tone: Toast['tone'] = 'ok') {
  const next = { id: ++seq, message, tone };
  listeners.forEach((l) => l(next));
  clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach((l) => l(null)), 1800);
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
