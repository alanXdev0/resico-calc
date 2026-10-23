import { useEffect, useState, type ReactNode } from 'react';
import { copyWithToast } from '../lib/clipboard';
import { CheckIcon, CopyIcon } from './icons';
import { cx } from './ui';

export function CopyButton({
  value,
  label,
  children,
  className,
  variant = 'icon',
}: {
  /** Texto a copiar. `null` deshabilita el botón. */
  value: string | null;
  /** Qué se copia, para el aria-label y el toast. */
  label: string;
  children?: ReactNode;
  className?: string;
  variant?: 'icon' | 'button';
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const onClick = async () => {
    if (await copyWithToast(value, label)) setCopied(true);
  };

  const icon = copied ? <CheckIcon className="text-accent" /> : <CopyIcon />;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={value === null}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-fg disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
      >
        {icon}
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={value === null}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
      className={cx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-30',
        className,
      )}
    >
      {icon}
    </button>
  );
}
