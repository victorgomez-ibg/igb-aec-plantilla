// IGB AEC Suite — "Ejemplos precargados": searchable, filterable preset cards.
// Each tool passes its presets; picking one calls onSelect(preset). Pure UI, no API calls.

import { escapeHtml } from './ui-components.js';

/**
 * @param {HTMLElement} mount
 * @param {{ presets: Array<{id:string,title:string,meta:string,cat:string,tags?:string[],respaldo?:boolean,note?:string}>,
 *           onSelect: (p:any)=>void, title?: string, respaldoLabel?: string }} opts
 */
export function presetPicker(mount, { presets, onSelect, title = 'Ejemplos precargados', respaldoLabel = 'Respaldo' }) {
  const cats = ['Todos', ...new Set(presets.map((p) => p.cat))];
  let cat = 'Todos';
  let q = '';
  let selected = null;

  mount.classList.add('presets', 'no-print');
  mount.innerHTML = `
    <div class="presets-head">
      <span class="eyebrow">${escapeHtml(title)} <span class="dim">· ${presets.length}</span></span>
      <div class="preset-cats" role="group" aria-label="Filtrar por categoría">
        ${cats.map((c) => `<button type="button" class="preset-cat" data-cat="${escapeHtml(c)}" aria-pressed="${c === cat}">${escapeHtml(c)}</button>`).join('')}
      </div>
      <input type="search" class="preset-search" placeholder="Buscar ejemplo…" aria-label="Buscar ejemplo">
    </div>
    <div class="preset-row" role="list"></div>
    <p class="preset-empty dim" hidden>Ningún ejemplo coincide con el filtro.</p>`;

  const row = mount.querySelector('.preset-row');
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function paint() {
    const list = presets.filter((p) => (cat === 'Todos' || p.cat === cat)
      && (!q || norm([p.title, p.meta, p.cat, ...(p.tags || [])].join(' ')).includes(norm(q))));
    row.innerHTML = list.map((p) => `
      <button type="button" class="preset" role="listitem" data-id="${escapeHtml(p.id)}" aria-pressed="${p.id === selected}">
        <span class="preset-top"><span class="preset-kind">${escapeHtml(p.cat)}</span>${p.respaldo ? `<span class="badge badge-tier1" title="Tiene un resultado precargado: funciona sin internet ni saldo de API">${escapeHtml(respaldoLabel)} ✓</span>` : ''}</span>
        <strong>${escapeHtml(p.title)}</strong>
        <span class="preset-meta">${escapeHtml(p.meta)}</span>
        ${p.tags?.length ? `<span class="preset-tags">${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</span>` : ''}
      </button>`).join('');
    mount.querySelector('.preset-empty').hidden = list.length > 0;
  }

  mount.querySelector('.preset-cats').addEventListener('click', (e) => {
    const b = e.target.closest('.preset-cat');
    if (!b) return;
    cat = b.dataset.cat;
    mount.querySelectorAll('.preset-cat').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paint();
  });
  mount.querySelector('.preset-search').addEventListener('input', (e) => { q = e.target.value.trim(); paint(); });
  row.addEventListener('click', (e) => {
    const b = e.target.closest('.preset');
    if (!b) return;
    const p = presets.find((x) => x.id === b.dataset.id);
    selected = p.id;
    row.querySelectorAll('.preset').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll('.toast-host .toast').forEach((t) => t.remove()); // one notice at a time
    onSelect(p);
  });
  paint();
  return { select(id) { const p = presets.find((x) => x.id === id); if (p) { selected = id; paint(); document.querySelectorAll('.toast-host .toast').forEach((t) => t.remove()); onSelect(p); } } };
}
