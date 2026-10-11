// Regenerates the "modo respaldo" package in ejemplo/ for the workshop example:
//   ejemplo/foto.jpg        example "finished project" photo (AI-generated, labeled as such in the UI)
//   ejemplo/contenido.json  Claude output
//   ejemplo/render-N.jpg    Gemini renders using the photo as reference
// Usage (repo root, macOS — uses `sips` to compress):
//   ANTHROPIC_API_KEY=... GEMINI_API_KEY=... node tools/04-contenido/generate-example.mjs [--new-photo]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { ANTHROPIC_API_KEY: ak, GEMINI_API_KEY: gk } = process.env;
if (!ak || !gk) { console.error('Set ANTHROPIC_API_KEY and GEMINI_API_KEY'); process.exit(1); }
const mem = new Map([['igb-aec.anthropic_key', ak], ['igb-aec.gemini_key', gk]]);
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };

const { generateJSON } = await import('../../shared/js/claude-client.js');
const { generateImage } = await import('../../shared/js/gemini-client.js');
const { SCHEMA, EXAMPLE, RENDER_VARIANTS, buildSystem, buildContent, renderPrompt } = await import('./prompt.js');

const dir = new URL('./ejemplo/', import.meta.url).pathname;
const compress = (src, dst, px = 1024, q = 72) => execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(q), '-Z', String(px), src, '--out', dst], { stdio: 'ignore' });
const saveImage = (img, name, px) => {
  const raw = `${dir}${name}.raw`;
  writeFileSync(raw, Buffer.from(img.base64, 'base64'));
  compress(raw, `${dir}${name}.jpg`, px);
  execFileSync('rm', [raw]);
};

if (!existsSync(`${dir}foto.jpg`) || process.argv.includes('--new-photo')) {
  const t = Date.now();
  const img = await generateImage({
    aspectRatio: '4:3',
    prompt: 'Professional architectural photograph of a finished contemporary two-story family house (about 180 m2) on a 15x20 m lot in Cadereyta de Montes, Querétaro, Mexico, semi-desert climate. Exposed board-formed concrete combined with warm wood slats, floor-to-ceiling windows, a double carport, drought-tolerant native landscaping with agaves. Clear late-afternoon light, blue sky. Eye-level three-quarter view from the street. Photorealistic, no people, no text.',
  });
  saveImage(img, 'foto', 1024);
  console.log(`photo ${img.model} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
const photo = { mimeType: 'image/jpeg', base64: readFileSync(`${dir}foto.jpg`).toString('base64') };

let t = Date.now();
const { data, usage, model } = await generateJSON({ system: buildSystem(), prompt: buildContent(EXAMPLE, photo), schema: SCHEMA, effort: 'low', maxTokens: 16000 });
console.log(`claude ${model} ${((Date.now() - t) / 1000).toFixed(1)}s out=${usage.output_tokens}`);
writeFileSync(`${dir}contenido.json`, JSON.stringify(data, null, 2) + '\n');

t = Date.now();
const results = await Promise.allSettled(RENDER_VARIANTS.map((v) => generateImage({ prompt: renderPrompt(v), images: [photo], aspectRatio: '4:3' })));
results.forEach((res, i) => {
  if (res.status === 'fulfilled') { saveImage(res.value, `render-${i + 1}`, 900); console.log(`render ${i + 1} ok ${res.value.model}`); }
  else console.log(`render ${i + 1} FAILED ${res.reason?.message}`);
});
console.log(`renders ${((Date.now() - t) / 1000).toFixed(1)}s`);
console.log(execFileSync('du', ['-ch', ...['foto.jpg', 'contenido.json', 'render-1.jpg', 'render-2.jpg', 'render-3.jpg'].map((f) => dir + f).filter(existsSync)]).toString());
