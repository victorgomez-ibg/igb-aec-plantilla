// Regenerates ejemplo-propuesta.json (the "modo respaldo" output for the workshop example)
// by running the real prompt against the API.
// Usage (repo root):  ANTHROPIC_API_KEY=... node tools/03-propuestas/generate-example.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }
const mem = new Map([['igb-aec.anthropic_key', key]]);
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };

const { generateJSON } = await import('../../shared/js/claude-client.js');
const { SCHEMA, EXAMPLE, buildSystem, buildPrompt, calcularPropuesta } = await import('./prompt.js');

const ivaPct = JSON.parse(readFileSync(new URL('../../data/fianzas_retenciones.json', import.meta.url))).iva;
const t0 = Date.now();
const { data: scope, usage, model } = await generateJSON({
  system: buildSystem(), prompt: buildPrompt(EXAMPLE), schema: SCHEMA, effort: process.env.EFFORT || 'low',
});
console.log(`model=${model} seconds=${((Date.now() - t0) / 1000).toFixed(1)} in=${usage.input_tokens} out=${usage.output_tokens}`);
const r = calcularPropuesta({ monto: EXAMPLE.monto, plazoSemanas: EXAMPLE.plazoSemanas, ivaPct }, scope);
console.log(scope.titulo_proyecto);
for (const f of r.fases) console.log(`${f.n}\t${f.nombre}\tsem ${f.semanaInicio}-${f.semanaFin}\t${f.pctInversion}%\t${f.importe}`);
console.log(r.totales);
if (process.argv.includes('--write')) {
  writeFileSync(new URL('./ejemplo-propuesta.json', import.meta.url), JSON.stringify(scope, null, 2) + '\n');
  console.log('wrote ejemplo-propuesta.json');
}
