// Regenerates ejemplo-alcance.json (the "modo respaldo" scope for the workshop example)
// by running the real prompt against the API.
// Usage (repo root):  ANTHROPIC_API_KEY=... node tools/01-presupuestador/generate-example.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }
const mem = new Map([['igb-aec.anthropic_key', key]]);
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };

const { generateJSON } = await import('../../shared/js/claude-client.js');
const { calcularPresupuesto, zonasDisponibles } = await import('../../shared/js/calculo.js');
const { SCHEMA, EXAMPLE, buildSystem, buildPrompt } = await import('./prompt.js');

const load = (f) => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url)));
const precios = load('precios_materiales_2026.json');
const costosM2 = load('costos_m2_queretaro.json');
const ivaPct = load('fianzas_retenciones.json').iva;

const params = { ...EXAMPLE, zonaLabel: zonasDisponibles(costosM2).find((z) => z.key === EXAMPLE.zona).label };
const t0 = Date.now();
const { data: scope, usage, model } = await generateJSON({
  system: buildSystem(precios), prompt: buildPrompt(params), schema: SCHEMA, effort: process.env.EFFORT || 'medium',
});
console.log(`model=${model} seconds=${((Date.now() - t0) / 1000).toFixed(1)} in=${usage.input_tokens} out=${usage.output_tokens}`);

const r = calcularPresupuesto({ params, scope, precios, costosM2, ivaPct });
console.log(`partidas=${r.lineas.length} verificado=${r.totales.verificado} subtotal=${r.totales.subtotal} total=${r.totales.total} costoM2=${r.totales.costoM2}`);
console.log('faltantes:', r.categoriasFaltantes, '\navisos:', r.avisos.map((a) => a.texto));
for (const l of r.lineas) console.log(`${l.n}\t${l.categoria}\t${l.origen}\t${l.unidad}\t${l.cantidad}\t${l.pu}\t${l.importe}\t${l.descripcion}`);

if (process.argv.includes('--write')) {
  writeFileSync(new URL('./ejemplo-alcance.json', import.meta.url), JSON.stringify(scope, null, 2) + '\n');
  console.log('wrote ejemplo-alcance.json');
}
