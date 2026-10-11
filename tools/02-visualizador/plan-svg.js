// Tool 02 — deterministic floor-plan renderer.
// Takes Claude's geometry (metres), validates it against the lot and draws a clean,
// dimensioned SVG. Pure functions, no DOM: runs in the browser and in Node.

const S = 40;            // px per metre
const WALL = 0.15 * S;   // wall stroke
const M = { left: 78, top: 96, right: 28, bottom: 56 };
const GAP = 60;          // between levels

const FILL = { // blueprint tints on navy
  estancia: '#16305f', comedor: '#16305f', cocina: '#132c58', recamara: '#142e5c', bano: '#112a52',
  cochera: '#0f2148', patio: '#103329', jardin: '#113a2a', circulacion: '#0e2047', escalera: '#13284f',
  servicio: '#0f2148', estudio: '#152d59', local: '#16305f', otro: '#12264f',
};
const OPEN = new Set(['patio', 'jardin']);

const r2 = (n) => Math.round(n * 100) / 100;
const f2 = (n) => r2(n).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Clamp to the lot, drop degenerate rooms, flag overlaps. Returns a cleaned copy + warnings. */
export function validarPlano(plano) {
  const avisos = [];
  const F = Math.max(3, Number(plano?.terreno?.frente) || 0);
  const D = Math.max(3, Number(plano?.terreno?.fondo) || 0);
  const niveles = (plano.niveles || []).slice(0, 3).map((nv, i) => {
    const espacios = [];
    for (const e0 of nv.espacios || []) {
      let { x, y, w, h } = e0;
      if (![x, y, w, h].every(Number.isFinite)) continue;
      const x2 = Math.min(F, x + w), y2 = Math.min(D, y + h);
      x = Math.max(0, x); y = Math.max(0, y);
      if (x2 - x < 0.6 || y2 - y < 0.6) { avisos.push(`Se omitió "${e0.nombre}" (fuera del terreno).`); continue; }
      if (x2 - x < w - 0.05 || y2 - y < h - 0.05) avisos.push(`"${e0.nombre}" se ajustó al límite del terreno.`);
      espacios.push({ ...e0, x: r2(x), y: r2(y), w: r2(x2 - x), h: r2(y2 - y) });
    }
    for (let a = 0; a < espacios.length; a++) {
      for (let b = a + 1; b < espacios.length; b++) {
        const A = espacios[a], B = espacios[b];
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ox > 0.1 && oy > 0.1 && ox * oy > 0.25) avisos.push(`${nv.nombre}: "${A.nombre}" y "${B.nombre}" se traslapan ${f2(ox * oy)} m².`);
      }
    }
    const ids = new Set(espacios.map((e) => e.id));
    const ok = (a) => ids.has(a.espacio) && Number.isFinite(a.posicion);
    return { nombre: nv.nombre || `Nivel ${i + 1}`, espacios, puertas: (nv.puertas || []).filter(ok), ventanas: (nv.ventanas || []).filter(ok) };
  });
  const techado = (nv) => nv.espacios.filter((e) => !OPEN.has(e.tipo)).reduce((s, e) => s + e.w * e.h, 0);
  const areas = niveles.map(techado);
  return {
    plano: { ...plano, terreno: { frente: F, fondo: D }, niveles },
    avisos,
    areas,
    areaTotal: r2(areas.reduce((a, b) => a + b, 0)),
  };
}

/** Wall segment of a room side, in metres: {x1,y1,x2,y2, nx,ny (inward normal)} */
function lado(e, l) {
  switch (l) {
    case 'norte': return { x1: e.x, y1: e.y, x2: e.x + e.w, y2: e.y, nx: 0, ny: 1 };
    case 'sur': return { x1: e.x, y1: e.y + e.h, x2: e.x + e.w, y2: e.y + e.h, nx: 0, ny: -1 };
    case 'oeste': return { x1: e.x, y1: e.y, x2: e.x, y2: e.y + e.h, nx: 1, ny: 0 };
    default: return { x1: e.x + e.w, y1: e.y, x2: e.x + e.w, y2: e.y + e.h, nx: -1, ny: 0 };
  }
}

function abertura(e, a, largo) {
  const s = lado(e, a.lado);
  const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  const len = Math.min(largo, L - 0.3);
  if (len < 0.5) return null;
  const c = Math.min(Math.max(a.posicion, 0), 1) * L;
  const t0 = Math.min(Math.max(c - len / 2, 0.15), L - 0.15 - len);
  const ux = (s.x2 - s.x1) / L, uy = (s.y2 - s.y1) / L;
  return { ax: s.x1 + ux * t0, ay: s.y1 + uy * t0, bx: s.x1 + ux * (t0 + len), by: s.y1 + uy * (t0 + len), nx: s.nx, ny: s.ny, len };
}

function chain(breaks, fixed, horizontal, ox, oy, cls) {
  let out = '';
  const pts = [...new Set(breaks.map(r2))].sort((a, b) => a - b);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (b - a < 0.3) continue;
    if (horizontal) {
      const X1 = ox + a * S, X2 = ox + b * S, Y = fixed;
      out += `<line class="${cls}" x1="${X1}" y1="${Y}" x2="${X2}" y2="${Y}"/><line class="tick" x1="${X1 - 4}" y1="${Y + 4}" x2="${X1 + 4}" y2="${Y - 4}"/><line class="tick" x1="${X2 - 4}" y1="${Y + 4}" x2="${X2 + 4}" y2="${Y - 4}"/>`;
      if ((b - a) * S > 26) out += `<text class="dim" x="${(X1 + X2) / 2}" y="${Y - 5}" text-anchor="middle">${f2(b - a)}</text>`;
    } else {
      const Y1 = oy + a * S, Y2 = oy + b * S, X = fixed;
      out += `<line class="${cls}" x1="${X}" y1="${Y1}" x2="${X}" y2="${Y2}"/><line class="tick" x1="${X - 4}" y1="${Y1 + 4}" x2="${X + 4}" y2="${Y1 - 4}"/><line class="tick" x1="${X - 4}" y1="${Y2 + 4}" x2="${X + 4}" y2="${Y2 - 4}"/>`;
      if ((b - a) * S > 26) out += `<text class="dim" x="${X - 6}" y="${(Y1 + Y2) / 2}" text-anchor="middle" transform="rotate(-90 ${X - 6} ${(Y1 + Y2) / 2})">${f2(b - a)}</text>`;
    }
  }
  return out;
}

function nivelSVG(nv, F, D, ox, oy, area, planta = true) {
  const P = (x, y) => `${ox + x * S},${oy + y * S}`;
  let g = '';
  // street + lot
  g += `<rect class="street" x="${ox - 10}" y="${oy - 30}" width="${F * S + 20}" height="22"/>`;
  g += `<text class="street-t" x="${ox + (F * S) / 2}" y="${oy - 15}" text-anchor="middle">CALLE</text>`;
  g += `<rect class="lot" x="${ox}" y="${oy}" width="${F * S}" height="${D * S}"/>`;

  const open = nv.espacios.filter((e) => OPEN.has(e.tipo));
  const built = nv.espacios.filter((e) => !OPEN.has(e.tipo));
  for (const e of [...open, ...built]) {
    g += `<rect class="${OPEN.has(e.tipo) ? 'room open' : 'room'}" x="${ox + e.x * S}" y="${oy + e.y * S}" width="${e.w * S}" height="${e.h * S}" fill="${FILL[e.tipo] || FILL.otro}"/>`;
  }
  // stairs hatch
  for (const e of built.filter((e) => e.tipo === 'escalera')) {
    const n = Math.max(4, Math.floor((Math.max(e.w, e.h)) / 0.28));
    for (let i = 1; i < n; i++) {
      g += e.h >= e.w
        ? `<line class="step" x1="${ox + e.x * S}" y1="${oy + (e.y + (e.h * i) / n) * S}" x2="${ox + (e.x + e.w) * S}" y2="${oy + (e.y + (e.h * i) / n) * S}"/>`
        : `<line class="step" x1="${ox + (e.x + (e.w * i) / n) * S}" y1="${oy + e.y * S}" x2="${ox + (e.x + (e.w * i) / n) * S}" y2="${oy + (e.y + e.h) * S}"/>`;
    }
  }
  // walls (built rooms)
  for (const e of built) g += `<rect class="wall" x="${ox + e.x * S}" y="${oy + e.y * S}" width="${e.w * S}" height="${e.h * S}"/>`;

  const byId = new Map(nv.espacios.map((e) => [e.id, e]));
  // windows
  for (const v of nv.ventanas) {
    const e = byId.get(v.espacio);
    const o = e && abertura(e, v, Math.min(Math.max(Number(v.largo) || 1.2, 0.8), 3));
    if (!o) continue;
    const dx = o.nx * WALL * 0.5, dy = o.ny * WALL * 0.5;
    g += `<line class="gap" x1="${ox + o.ax * S}" y1="${oy + o.ay * S}" x2="${ox + o.bx * S}" y2="${oy + o.by * S}"/>`;
    g += `<line class="win" x1="${ox + o.ax * S + dx}" y1="${oy + o.ay * S + dy}" x2="${ox + o.bx * S + dx}" y2="${oy + o.by * S + dy}"/>`;
    g += `<line class="win" x1="${ox + o.ax * S - dx}" y1="${oy + o.ay * S - dy}" x2="${ox + o.bx * S - dx}" y2="${oy + o.by * S - dy}"/>`;
    g += `<line class="win thin" x1="${ox + o.ax * S}" y1="${oy + o.ay * S}" x2="${ox + o.bx * S}" y2="${oy + o.by * S}"/>`;
  }
  // doors
  for (const d of nv.puertas) {
    const e = byId.get(d.espacio);
    const acceso = planta && d.acceso;
    const o = e && abertura(e, d, acceso ? 1.0 : 0.9);
    if (!o) continue;
    const L = o.len * S;
    const hx = ox + o.ax * S, hy = oy + o.ay * S;               // hinge
    const lx = hx + o.nx * L, ly = hy + o.ny * L;               // open leaf end
    const bx = ox + o.bx * S, by = oy + o.by * S;               // strike side
    const sweep = (o.nx * (by - hy) - o.ny * (bx - hx)) > 0 ? 0 : 1;
    g += `<line class="gap" x1="${hx}" y1="${hy}" x2="${bx}" y2="${by}"/>`;
    g += `<line class="${acceso ? 'door main' : 'door'}" x1="${hx}" y1="${hy}" x2="${lx}" y2="${ly}"/>`;
    g += `<path class="${acceso ? 'swing main' : 'swing'}" d="M${lx},${ly} A${L},${L} 0 0 ${sweep} ${bx},${by}"/>`;
    if (acceso) g += `<text class="acc" x="${(hx + bx) / 2 - o.nx * 18}" y="${(hy + by) / 2 - o.ny * 18 + 4}" text-anchor="middle">▲ ACCESO</text>`;
  }
  // labels
  for (const e of nv.espacios) {
    const cx = ox + (e.x + e.w / 2) * S, cy = oy + (e.y + e.h / 2) * S;
    const wpx = e.w * S, hpx = e.h * S;
    const vertical0 = wpx < 70 && hpx > wpx * 1.6;
    const along = vertical0 ? hpx : wpx, across = vertical0 ? wpx : hpx;
    const fs = Math.max(8, Math.min(14, (along - 8) / Math.max(4, e.nombre.length * 0.6), across / 3.2));
    const vertical = vertical0;
    const tr = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
    g += `<g${tr}><text class="rname" x="${cx}" y="${cy - (hpx > 46 ? 3 : -4)}" text-anchor="middle" font-size="${fs.toFixed(1)}">${esc(e.nombre)}</text>`;
    const room = vertical ? hpx : wpx;
    const dimLong = `${f2(e.w)} × ${f2(e.h)} · ${r2(e.w * e.h).toFixed(1)} m²`;
    const dimShort = `${f2(e.w)} × ${f2(e.h)}`;
    const dimTxt = dimLong.length * 5.9 < room - 8 ? dimLong : dimShort.length * 5.9 < room - 6 ? dimShort : '';
    if ((vertical ? wpx : hpx) > 40 && dimTxt) g += `<text class="rdim" x="${cx}" y="${cy + fs * 0.9 + 2}" text-anchor="middle">${dimTxt}</text>`;
    g += '</g>';
  }
  // dimension chains: rooms (inner) + lot (outer)
  const xs = [0, F, ...nv.espacios.flatMap((e) => [e.x, e.x + e.w])];
  const ys = [0, D, ...nv.espacios.flatMap((e) => [e.y, e.y + e.h])];
  g += chain(xs, oy - 44, true, ox, oy, 'dimln');
  g += chain([0, F], oy - 68, true, ox, oy, 'dimln outer');
  g += chain(ys, ox - 26, false, ox, oy, 'dimln');
  g += chain([0, D], ox - 52, false, ox, oy, 'dimln outer');
  // title
  g += `<text class="lvl" x="${ox}" y="${oy + D * S + 30}">${esc(nv.nombre.toUpperCase())}</text>`;
  g += `<text class="lvl-a" x="${ox + F * S}" y="${oy + D * S + 30}" text-anchor="end">${r2(area).toFixed(1)} m² techados</text>`;
  return g;
}

/**
 * Draw the validated plan. Returns { svg, avisos, areas, areaTotal }.
 * Several levels are drawn side by side.
 */
export function dibujarPlano(plano0) {
  const v = validarPlano(plano0);
  const { frente: F, fondo: D } = v.plano.terreno;
  const n = Math.max(1, v.plano.niveles.length);
  const panelW = M.left + F * S + M.right;
  const W = panelW * n + GAP * (n - 1);
  const H = M.top + D * S + M.bottom;
  let body = '';
  v.plano.niveles.forEach((nv, i) => { body += nivelSVG(nv, F, D, i * (panelW + GAP) + M.left, M.top, v.areas[i], i === 0); });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Archivo, 'Helvetica Neue', Arial, sans-serif" role="img" aria-label="${esc(v.plano.titulo || 'Planta arquitectónica')}">
<style>
.street{fill:#081430}.street-t{font-size:11px;letter-spacing:.3em;fill:#9fb2d4;font-weight:700;font-family:'Space Mono',Menlo,monospace}
.lot{fill:#0b1a3d;stroke:rgba(230,193,105,.55);stroke-width:1.2;stroke-dasharray:8 5}
.room{stroke:none}.room.open{stroke:#4fd08a;stroke-width:1;stroke-dasharray:4 3}
.wall{fill:none;stroke:#eef2f8;stroke-width:${WALL};stroke-linejoin:miter}
.step{stroke:#9fb2d4;stroke-width:1}
.gap{stroke:#0b1a3d;stroke-width:${WALL + 2};stroke-linecap:butt}
.win{stroke:#e6c169;stroke-width:1.6}.win.thin{stroke-width:1}
.door{stroke:#eef2f8;stroke-width:2}.swing{fill:none;stroke:#9fb2d4;stroke-width:.9;stroke-dasharray:3 2}
.door.main,.swing.main{stroke:#f7dc93}.door.main{stroke-width:3}
.acc{font-size:9.5px;font-weight:700;fill:#e6c169;letter-spacing:.06em}
.rname{fill:#ffffff;font-weight:700}.rdim{fill:#9fb2d4;font-size:9.5px;font-family:'Space Mono',Menlo,monospace}
.dimln{stroke:rgba(230,193,105,.6);stroke-width:.9}.dimln.outer{stroke:#e6c169;stroke-width:1.1}.tick{stroke:#e6c169;stroke-width:1.2}
.dim{font-size:10px;fill:#eef2f8;font-family:'Space Mono',Menlo,monospace}
.lvl{font-size:13px;font-weight:700;fill:#e6c169;letter-spacing:.08em;font-family:'Space Mono',Menlo,monospace}.lvl-a{font-size:11px;fill:#9fb2d4}
</style>
<rect width="100%" height="100%" fill="#0a1836"/>
${body}
</svg>`;
  return { svg, avisos: v.avisos, areas: v.areas, areaTotal: v.areaTotal, terreno: v.plano.terreno };
}
