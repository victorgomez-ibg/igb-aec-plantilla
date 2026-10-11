// IGB AEC Suite — access to the verified data layer (data/*.json).
//
// Tools must read numbers only through here so the tier and staleness rules
// in data/SOURCES.md are applied consistently.

const DATA_BASE = new URL('../../data/', import.meta.url);

export const DATA_FILES = {
  precios: 'precios_materiales_2026.json',
  costosM2: 'costos_m2_queretaro.json',
  nom001: 'nom_001_sede_2012.json',
  estructural: 'normativa_estructural_qro.json',
  fianzas: 'fianzas_retenciones.json',
  uma: 'uma_salarios.json',
};

const cache = new Map();

/** Load one or more data files by key (see DATA_FILES). Returns an object keyed the same way. */
export async function loadData(...keys) {
  const entries = await Promise.all(keys.map(async (key) => {
    const file = DATA_FILES[key];
    if (!file) throw new Error(`Unknown data key: ${key}`);
    if (!cache.has(file)) {
      cache.set(file, fetch(new URL(file, DATA_BASE)).then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar data/${file} (HTTP ${r.status})`);
        return r.json();
      }));
    }
    return [key, await cache.get(file)];
  }));
  return Object.fromEntries(entries);
}

export const TIER_LABEL = {
  1: 'Tier 1 · autoritativo',
  2: 'Tier 2 · direccional',
  3: 'Tier 3 · adaptación',
};

/** HTML for a tier badge. */
export function tierBadge(tier) {
  const t = Number(tier);
  return `<span class="badge badge-tier${t}" title="Ver data/SOURCES.md">${TIER_LABEL[t] ?? 'Tier ?'}</span>`;
}

/** Refresh interval in months for a `_meta.refresh` value. */
const REFRESH_MONTHS = { quarterly: 3, yearly: 12, annual: 12, monthly: 1 };

/**
 * Staleness check for a data file's _meta. `fecha` is "YYYY-MM" (or "YYYY-MM-DD").
 * Returns { known, stale, ageMonths, fecha }. `known:false` when the file has no date.
 */
export function freshness(meta, now = new Date()) {
  const fecha = meta?.fecha;
  if (!fecha) return { known: false, stale: false, ageMonths: null, fecha: null };
  const [y, m] = String(fecha).split('-').map(Number);
  const ageMonths = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  const limit = REFRESH_MONTHS[meta.refresh] ?? 3;
  return { known: true, stale: ageMonths > limit, ageMonths, fecha };
}

/** Midpoint (or single value) of a price entry {min,max} | {valor}. */
export function priceOf(entry) {
  if (entry == null) return null;
  if (typeof entry.valor === 'number') return entry.valor;
  if (typeof entry.min === 'number' && typeof entry.max === 'number') return (entry.min + entry.max) / 2;
  return null;
}

/** Human range string for a price entry. */
export function rangeOf(entry, fmt = (n) => n.toLocaleString('es-MX')) {
  if (typeof entry?.valor === 'number') return `$${fmt(entry.valor)}`;
  if (typeof entry?.min === 'number') return `$${fmt(entry.min)} – $${fmt(entry.max)}`;
  return '—';
}
