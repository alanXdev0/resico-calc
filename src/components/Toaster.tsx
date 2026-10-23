import { useEffect, useState } from 'react';
import { subscribeToasts, type Toast } from '../lib/toast';
import { AlertIcon, CheckIcon } from './icons';
import { cx } from './ui';

export function Toaster() {
  const [current, setCurrent] = useState<Toast | null>(null);
  useEffect(() => subscribeToasts(setCurrent), []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 lg:bottom-5 flex justify-center px-4">
      {current && (
        <div
          key={current.id}
          className={cx(
            'toast-in flex max-w-full items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm shadow-lg shadow-black/20',
            current.tone === 'ok' ? 'border-line-strong' : 'border-danger/60',
          )}
        >
          {current.tone === 'ok' ? <CheckIcon className="text-accent" /> : <AlertIcon className="text-danger" />}
          <span className="truncate font-mono text-xs">{current.message}</span>
        </div>
      )}
    </div>
  );
}
