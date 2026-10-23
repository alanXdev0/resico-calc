import { toast } from './toast';

/** Copia texto al portapapeles; usa `execCommand` como respaldo en contextos no seguros (http). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previous = document.activeElement as HTMLElement | null;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    previous?.focus();
    return ok;
  }
}

/** Copia y avisa con un toast. `label` describe lo copiado ("Total", "Resumen Markdown"). */
export async function copyWithToast(text: string | null | undefined, label: string): Promise<boolean> {
  if (!text) {
    toast('Nada que copiar todavía: captura un monto', 'error');
    return false;
  }
  const ok = await copyText(text);
  const preview = text.includes('\n') ? '' : ` · ${text}`;
  toast(ok ? `${label} copiado${preview}` : 'No se pudo copiar al portapapeles', ok ? 'ok' : 'error');
  return ok;
}
