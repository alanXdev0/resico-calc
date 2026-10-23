import { useId, type KeyboardEvent, type ReactNode, type Ref } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Tecla de atajo. Se oculta en pantallas táctiles salvo con `always` (p. ej. dentro de la ayuda). */
export function Kbd({ children, className, always }: { children: ReactNode; className?: string; always?: boolean }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-mono text-[11px] leading-none text-muted',
        !always && 'pointer-coarse:hidden',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Card({
  step,
  title,
  aside,
  children,
  className,
}: {
  step?: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold">
          {step && <span className="font-mono text-xs text-faint">{step}</span>}
          {title}
        </h2>
        {aside}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  sub?: ReactNode;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-line bg-surface-2 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'flex-1 rounded-md text-center transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm',
              active ? 'bg-surface font-medium text-fg shadow-sm ring-1 ring-line-strong' : 'text-muted hover:text-fg',
            )}
          >
            <span className="block">{opt.label}</span>
            {opt.sub && <span className="mt-0.5 block text-[11px] font-normal text-faint">{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  kbd,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  kbd?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          {label}
          {kbd && <Kbd>{kbd}</Kbd>}
        </label>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-2',
        )}
      >
        <span
          className={cx(
            'inline-block size-4 rounded-full shadow transition-transform',
            checked ? 'translate-x-5 bg-accent-fg' : 'translate-x-1 bg-muted',
          )}
        />
      </button>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  error,
  hint,
  size = 'md',
  inputRef,
  onKeyDown,
  onBlur,
  placeholder,
  labelAside,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: string;
  hint?: ReactNode;
  size?: 'md' | 'lg';
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  labelAside?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        {labelAside}
      </div>
      <div
        className={cx(
          'flex items-center rounded-lg border bg-bg transition-colors focus-within:ring-2',
          error
            ? 'border-danger/70 focus-within:ring-danger/30'
            : 'border-line-strong focus-within:border-accent focus-within:ring-accent/25',
        )}
      >
        {prefix && (
          <span className={cx('select-none pl-3 font-mono text-faint', size === 'lg' ? 'text-base' : 'text-sm')}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          className={cx(
            'w-full min-w-0 bg-transparent font-mono tabular-nums outline-none placeholder:text-faint',
            size === 'lg' ? 'px-3 py-3 text-2xl sm:text-3xl' : 'px-3 py-2 text-sm',
          )}
        />
        {suffix && <span className="select-none pr-3 font-mono text-sm text-faint">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={`${id}-desc`} className={cx('mt-1.5 text-xs', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Botón tipo "chip" para valores rápidos. */
export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'rounded-md border px-2.5 py-1 font-mono text-xs transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line-strong text-muted hover:border-faint hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}
