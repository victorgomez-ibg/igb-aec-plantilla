// IGB AEC Suite — Gemini as a text/JSON fallback for Claude (browser + Node).
//
// Used only by claude-client.js when Claude can't answer (no credit, bad key,
// network or service error). Same prompts, same JSON schema, same verified data:
// the tools' deterministic code still does all the money math.

import { getKey, KEYS, AECError } from './claude-client.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
// Quality first, then speed. All verified available for the workshop key (2026-09-29).
export const GEMINI_TEXT_MODELS = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-2.5-flash'];

export function hasGeminiTextKey() { return getKey(KEYS.gemini).length > 20; }

const textOf = (x) => (typeof x === 'string' ? x : Array.isArray(x) ? x.map((b) => (typeof b === 'string' ? b : b.text || '')).join('\n\n') : '');

/** Anthropic-style user content (string or blocks) → Gemini parts. */
function toParts(prompt) {
  if (typeof prompt === 'string') return [{ text: prompt }];
  return prompt.map((b) => {
    if (b.type === 'image' && b.source?.type === 'base64') return { inline_data: { mime_type: b.source.media_type, data: b.source.data } };
    return { text: b.text ?? '' };
  });
}

async function call(model, { system, prompt, schema, maxTokens }) {
  const generationConfig = { maxOutputTokens: Math.min(maxTokens || 32000, 65536), temperature: 0.4 };
  if (schema) { generationConfig.responseMimeType = 'application/json'; generationConfig.responseJsonSchema = schema; }
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getKey(KEYS.gemini) },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: textOf(system) }] },
      contents: [{ role: 'user', parts: toParts(prompt) }],
      generationConfig,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${model}: ${body.error?.message || res.status}`);
  const cand = body.candidates?.[0];
  const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  if (!text) throw new Error(`Gemini ${model}: respuesta vacía (${cand?.finishReason || 'sin candidato'})`);
  if (cand.finishReason === 'MAX_TOKENS') throw new Error(`Gemini ${model}: respuesta incompleta`);
  return { text, usage: body.usageMetadata, model };
}

async function withModels(opts) {
  let last;
  for (const model of opts.models?.length ? opts.models : GEMINI_TEXT_MODELS) {
    try { return await call(model, opts); } catch (err) { last = err; console.warn('[gemini-text]', err.message); }
  }
  throw new AECError('Ni Claude ni Gemini respondieron. Activa el modo respaldo.', { cause: last, code: 'all_failed' });
}

export async function geminiJSON({ system, prompt, schema, maxTokens, models }) {
  const r = await withModels({ system, prompt, schema, maxTokens, models });
  try {
    return { data: JSON.parse(r.text.replace(/^```(?:json)?\s*|\s*```$/g, '')), usage: r.usage, model: r.model };
  } catch (err) {
    throw new AECError('Gemini devolvió un formato inválido. Inténtalo de nuevo o activa el modo respaldo.', { cause: err, code: 'bad_json' });
  }
}

export async function geminiText({ system, prompt, maxTokens, models }) {
  const r = await withModels({ system, prompt, maxTokens, models });
  return { text: r.text, usage: r.usage, model: r.model };
}
