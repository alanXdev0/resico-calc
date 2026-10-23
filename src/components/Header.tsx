import { useRegisterSW } from 'virtual:pwa-register/react';
import { useInstallPrompt, useOnline } from '../hooks/usePwa';
import { BookIcon, DownloadIcon, KeyboardIcon, LogoMark, MoonIcon, SunIcon } from './icons';
import { cx } from './ui';

function PwaStatus() {
  const online = useOnline();
  const {
    offlineReady: [offlineReady],
  } = useRegisterSW();
  const cached = offlineReady || Boolean(navigator.serviceWorker?.controller);

  const label = !online ? 'Sin conexión' : cached ? 'Offline listo' : 'En línea';
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-muted md:inline-flex"
      title={cached ? 'La app está en caché y funciona sin internet' : undefined}
    >
      <span className={cx('size-1.5 rounded-full', !online ? 'bg-warn' : cached ? 'bg-accent' : 'bg-faint')} />
      {label}
    </span>
  );
}

export function Header({
  theme,
  onToggleTheme,
  onShowShortcuts,
  onShowGuide,
}: {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onShowShortcuts: () => void;
  onShowGuide: () => void;
}) {
  const install = useInstallPrompt();
  const iconButton =
    'inline-flex size-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-fg';

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <a href="/" className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="size-7 shrink-0" />
          <span className="truncate font-mono text-sm font-semibold tracking-tight">
            resico<span className="text-faint">/</span>calc
          </span>
          <span className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
            PPFF · CFDI 4.0
          </span>
        </a>
        <div className="flex items-center gap-2">
          <PwaStatus />
          {install && (
            <button
              type="button"
              onClick={install}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/50 px-3 text-xs font-medium text-accent hover:bg-accent-soft"
            >
              <DownloadIcon className="size-3.5" />
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={onShowGuide}
            title="Guía fiscal (G)"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <BookIcon />
            <span className="max-[359px]:sr-only">Guía fiscal</span>
          </button>
          <button type="button" onClick={onShowShortcuts} className={iconButton} aria-label="Atajos de teclado (?)" title="Atajos de teclado (?)">
            <KeyboardIcon />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className={iconButton}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro (L)' : 'Cambiar a tema oscuro (L)'}
            title={theme === 'dark' ? 'Tema claro (L)' : 'Tema oscuro (L)'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
