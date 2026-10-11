// IGB AEC Suite — Claude API wrapper (browser).
//
// Every tool talks to Claude through this module; tools never build API requests
// themselves. Uses the official SDK, vendored as an esbuild bundle so the pages
// work without a CDN (see README → Rebuilding vendored libraries).
//
// Keys are entered by the user in ⚙ Ajustes and kept in this browser's
// localStorage. They are never sent anywhere except the provider's own API.

import { Anthropic } from '../vendor/anthropic-sdk.mjs';

export const CLAUDE_MODEL = 'claude-opus-5';

// Server-side refusal fallback: if Opus 5 declines, the API re-runs the request on
// Anthropic's recommended fallback model inside the same call.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const STORAGE_PREFIX = 'igb-aec.';
export const KEYS = { anthropic: 'anthropic_key', gemini: 'gemini_key' };

export function getKey(name) {
  try { return localStorage.getItem(STORAGE_PREFIX + name) || ''; } catch { return ''; }
}

export function setKey(name, value) {
  try {
    if (value) localStorage.setItem(STORAGE_PREFIX + name, value.trim());
    else localStorage.removeItem(STORAGE_PREFIX + name);
    return true;
  } catch { return false; }
}

export function hasClaudeKey() { return getKey(KEYS.anthropic).startsWith('sk-ant-'); }

/** Error with a Spanish, user-facing message. `cause` keeps the original error for the console. */
export class AECError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message);
    this.name = 'AECError';
    this.cause = cause;
    this.code = code;
  }
}

function client() {
  const apiKey = getKey(KEYS.anthropic);
  if (!apiKey) {
    throw new AECError('Falta la API key de Anthropic. Ábrela en ⚙ Ajustes.', { code: 'no_key' });
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

/** Map SDK errors to messages a workshop attendee can act on. */
export function toAECError(err) {
  if (err instanceof AECError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new AECError('La API key de Anthropic no es válida. Revísala en ⚙ Ajustes.', { cause: err, code: 'auth' });
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new AECError('La API key no tiene permiso para este modelo.', { cause: err, code: 'permission' });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AECError('Límite de uso alcanzado en Anthropic. Espera un minuto e inténtalo de nuevo.', { cause: err, code: 'rate_limit' });
  }
  if (err instanceof Anthropic.BadRequestError) {
    const msg = String(err.message || '');
    if (/credit balance/i.test(msg)) {
      return new AECError('La cuenta de Anthropic no tiene saldo. Recarga créditos en console.anthropic.com.', { cause: err, code: 'billing' });
    }
    return new AECError('Solicitud rechazada por la API de Anthropic.', { cause: err, code: 'bad_request' });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AECError('Sin conexión con Anthropic. Revisa internet o activa el modo respaldo.', { cause: err, code: 'network' });
  }
  if (err instanceof Anthropic.APIError) {
    return new AECError(`Error del servicio de Anthropic (${err.status ?? 'sin código'}). Inténtalo de nuevo.`, { cause: err, code: 'api' });
  }
  // Stream drops and fetch failures surface as plain errors, not APIConnectionError.
  if (/network|fetch|socket|connection|terminated|aborted/i.test(String(err?.message || err))) {
    return new AECError('Se cortó la conexión con Anthropic. Revisa internet o activa el modo respaldo.', { cause: err, code: 'network' });
  }
  return new AECError('Error inesperado. Revisa la consola del navegador.', { cause: err, code: 'unknown' });
}

async function run(params, { onProgress } = {}) {
  let message;
  try {
    const stream = client().beta.messages.stream({
      model: CLAUDE_MODEL,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      cache_control: { type: 'ephemeral' },
      ...params,
    });
    if (onProgress) {
      let chars = 0;
      stream.on('text', (delta) => { chars += delta.length; onProgress({ chars }); });
    }
    message = await stream.finalMessage();
  } catch (err) {
    const wrapped = toAECError(err);
    console.error('[claude-client]', wrapped.message, err);
    throw wrapped;
  }

  if (message.stop_reason === 'refusal') {
    console.warn('[claude-client] refusal', message.stop_details);
    throw new AECError('Claude no pudo procesar esta solicitud. Reformula la descripción.', { code: 'refusal' });
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AECError('La respuesta quedó incompleta (demasiado larga). Reduce el alcance e inténtalo de nuevo.', { code: 'max_tokens' });
  }
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, message };
}

// ---------- Gemini fallback ----------
// If Claude can't answer (no credit, bad/missing key, network, service error) and a
// Gemini key is saved, the same request goes to Gemini. After a billing/auth failure
// we skip Claude for the rest of the session so each run doesn't pay that delay.
const FALLBACK_CODES = new Set(['billing', 'auth', 'no_key', 'permission', 'network', 'api', 'rate_limit']);
let claudeDown = false;
let fallbackNoticeShown = false;

async function viaGemini(kind, opts, reason) {
  const g = await import('./gemini-text.js');
  if (!g.hasGeminiTextKey()) return null;
  if (!fallbackNoticeShown && typeof window !== 'undefined') {
    fallbackNoticeShown = true;
    import('./ui-components.js').then(({ toast }) => toast(`Claude no disponible (${reason}). Usando Gemini con los mismos datos verificados.`)).catch(() => {});
  }
  console.info(`[claude-client] → Gemini (${reason})`);
  return kind === 'json' ? g.geminiJSON(opts) : g.geminiText(opts);
}

async function withFallback(kind, opts, claudeCall) {
  if (claudeDown || !hasClaudeKey()) {
    const r = await viaGemini(kind, opts, claudeDown ? 'sin saldo o clave inválida' : 'sin API key de Claude');
    if (r) return r;
  }
  try {
    return await claudeCall();
  } catch (err) {
    if (!(err instanceof AECError) || !FALLBACK_CODES.has(err.code)) throw err;
    if (err.code === 'billing' || err.code === 'auth') claudeDown = true;
    const r = await viaGemini(kind, opts, err.code === 'billing' ? 'sin saldo' : err.code);
    if (r) return r;
    throw err;
  }
}

/**
 * Ask Claude for JSON that matches `schema` (structured outputs).
 * @param {object} opts
 * @param {string|Array} opts.system  System prompt (put stable reference data here).
 * @param {string} opts.prompt        User message.
 * @param {object} opts.schema        JSON Schema. Every object needs additionalProperties:false.
 * @param {'low'|'medium'|'high'|'xhigh'|'max'} [opts.effort='medium']
 * @param {number} [opts.maxTokens=32000]
 * @param {(p:{chars:number})=>void} [opts.onProgress]
 * @param {string[]} [opts.geminiModels]  Fallback model order if Claude is unavailable (see gemini-text.js).
 */
export async function generateJSON({ system, prompt, schema, effort = 'medium', maxTokens = 32000, onProgress, geminiModels }) {
  return withFallback('json', { system, prompt, schema, maxTokens, models: geminiModels }, () => claudeJSON({ system, prompt, schema, effort, maxTokens, onProgress }));
}

async function claudeJSON({ system, prompt, schema, effort, maxTokens, onProgress }) {
  const { text, message } = await run({
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  }, { onProgress });
  try {
    return { data: JSON.parse(text), usage: message.usage, model: message.model };
  } catch (err) {
    console.error('[claude-client] invalid JSON', text);
    throw new AECError('Claude devolvió una respuesta con formato inválido. Inténtalo de nuevo.', { cause: err, code: 'bad_json' });
  }
}

/** Free-form text generation (documents, SVG). */
export async function generateText({ system, prompt, effort = 'medium', maxTokens = 32000, onProgress }) {
  return withFallback('text', { system, prompt, maxTokens }, () => claudeText({ system, prompt, effort, maxTokens, onProgress }));
}

async function claudeText({ system, prompt, effort, maxTokens, onProgress }) {
  const { text, message } = await run({
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort },
  }, { onProgress });
  return { text, usage: message.usage, model: message.model };
}
