// IGB AEC Suite — shared UI pieces: header, settings dialog, toasts, banners,
// formatters, Excel export. No framework; plain DOM.

import { KEYS, getKey, setKey, CLAUDE_MODEL } from './claude-client.js';

const SHARED = new URL('../', import.meta.url);
export const LOGO_URL = new URL('img/logo_igb.png', SHARED).href;
export const DEMO_URL = new URL('../demo/', SHARED).href;

// ---------- formatters ----------

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const mxn0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

export const fmt = {
  money: (n) => mxn.format(n ?? 0),
  money0: (n) => mxn0.format(n ?? 0),
  num: (n) => num.format(n ?? 0),
  pct: (n, digits = 1) => `${(n ?? 0).toFixed(digits)}%`,
  date: (d = new Date()) => d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
};

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- lazy script loading (vendored UMD libs) ----------

const scripts = new Map();
export function loadScript(relPath) {
  const src = new URL(relPath, SHARED).href;
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(`No se pudo cargar ${relPath}`));
      document.head.appendChild(el);
    }));
  }
  return scripts.get(src);
}

// ---------- header ----------

/**
 * Render the app header into `mount`.
 * @param {HTMLElement} mount
 * @param {{num?:string, title:string, settings?:boolean, extra?:string}} opts
 */
export function appHeader(mount, { num, title, settings = true, extra = '' }) {
  mount.innerHTML = `
    <header class="app-header">
      <div class="container">
        <a class="brand" href="${DEMO_URL}" title="Volver a las herramientas">IGB<span class="sep">·</span>AEC</a>
        <span class="tool-title">${num ? `<span class="tool-num">${escapeHtml(num)}</span>` : ''}${escapeHtml(title)}</span>
        <span class="spacer"></span>
        ${extra}
        ${settings ? `<button class="btn btn-ghost btn-sm" data-action="settings" type="button"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#e6c169" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg> Ajustes</button>` : ''}
        <a class="back" href="${DEMO_URL}">← Herramientas</a>
      </div>
    </header>`;
  mount.querySelector('[data-action=settings]')?.addEventListener('click', () => openSettings());
}

// ---------- settings dialog ----------

/**
 * Open the API key settings dialog. Resolves true if the user saved.
 * @param {{gemini?:boolean}} opts  Show the Gemini key field (Tool 03).
 */
export function openSettings({ gemini = false } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.innerHTML = `
      <form method="dialog">
        <div class="modal-head"><h2 style="margin:0">Ajustes</h2></div>
        <div class="modal-body">
          <div class="field">
            <label for="k-anthropic">API key de Anthropic (Claude)</label>
            <input id="k-anthropic" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${escapeHtml(getKey(KEYS.anthropic))}">
            <span class="hint">Modelo: <code>${CLAUDE_MODEL}</code>. Se guarda solo en este navegador.</span>
          </div>
          ${gemini ? `
          <div class="field">
            <label for="k-gemini">API key de Google Gemini (renders)</label>
            <input id="k-gemini" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${escapeHtml(getKey(KEYS.gemini))}">
            <span class="hint">El proyecto de Google Cloud debe tener facturación activa para generar imágenes.</span>
          </div>` : ''}
          <p class="dim" style="font-size:.8rem;margin:0">Las claves nunca se envían a servidores de IGB: van directo a Anthropic / Google.</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" value="clear" type="submit">Borrar claves</button>
          <span class="spacer"></span>
          <button class="btn" value="cancel" type="submit">Cancelar</button>
          <button class="btn btn-primary" value="save" type="submit">Guardar</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => {
      const action = dlg.returnValue;
      if (action === 'save') {
        setKey(KEYS.anthropic, dlg.querySelector('#k-anthropic').value);
        if (gemini) setKey(KEYS.gemini, dlg.querySelector('#k-gemini').value);
        toast('Ajustes guardados', 'ok');
      } else if (action === 'clear') {
        setKey(KEYS.anthropic, '');
        setKey(KEYS.gemini, '');
        toast('Claves borradas de este navegador');
      }
      dlg.remove();
      resolve(action === 'save');
    });
    dlg.showModal();
  });
}

// ---------- toast ----------

export function toast(message, kind = '') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 8000 : 3500);
}

// ---------- banners ----------

const BANNER_ICON = { info: 'i', warn: '!', danger: '!', ok: '✓' };

/** HTML for a banner. `html` is trusted markup. */
export function banner(kind, html) {
  return `<div class="banner banner-${kind}" role="${kind === 'danger' ? 'alert' : 'note'}"><span class="icon">${BANNER_ICON[kind] ?? 'i'}</span><div>${html}</div></div>`;
}

// ---------- busy state ----------

/** Put a button in a loading state; returns a function that restores it. */
export function busy(button, label = 'Generando…') {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHtml(label)}`;
  return () => { button.disabled = false; button.innerHTML = original; };
}

// ---------- downloads ----------

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s) {
  return String(s || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/**
 * Export sheets to .xlsx.
 * @param {string} filename
 * @param {Array<{name:string, rows:Array<Array<any>>, cols?:number[]}>} sheets  rows[0] = header
 */
export async function exportExcel(filename, sheets) {
  await loadScript('vendor/xlsx.full.min.js');
  const { XLSX } = window;
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.cols) ws['!cols'] = s.cols.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}
