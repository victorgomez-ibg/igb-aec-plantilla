// IGB AEC Suite — Gemini image generation (browser and Node).
//
// Same key handling as claude-client.js: the key is entered in ⚙ Ajustes and kept
// in this browser's localStorage; requests go straight to Google.

import { KEYS, getKey, AECError } from './claude-client.js';

export const GEMINI_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export function hasGeminiKey() { return getKey(KEYS.gemini).length > 20; }

async function callModel(model, { prompt, images, aspectRatio, signal }) {
  const parts = [{ text: prompt }];
  for (const img of images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getKey(KEYS.gemini) },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    throw new AECError(`Gemini (${model}): ${msg}`, { code: res.status === 429 ? 'rate_limit' : res.status === 400 || res.status === 403 ? 'auth' : 'api' });
  }
  const out = body?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const data = out?.inlineData || out?.inline_data;
  if (!data?.data) {
    const reason = body?.candidates?.[0]?.finishReason || body?.promptFeedback?.blockReason || 'sin imagen';
    throw new AECError(`Gemini no devolvió imagen (${reason}).`, { code: 'no_image' });
  }
  return { mimeType: data.mimeType || data.mime_type || 'image/png', base64: data.data, model };
}

/**
 * Generate one image. Tries each model in GEMINI_IMAGE_MODELS until one works.
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {Array<{mimeType:string, base64:string}>} [opts.images]  Reference images.
 * @param {string} [opts.aspectRatio='16:9']
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{mimeType:string, base64:string, model:string}>}
 */
export async function generateImage({ prompt, images = [], aspectRatio = '16:9', signal } = {}) {
  if (!hasGeminiKey()) throw new AECError('Falta la API key de Gemini. Ábrela en ⚙ Ajustes.', { code: 'no_key' });
  let last;
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      return await callModel(model, { prompt, images, aspectRatio, signal });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      console.warn('[gemini-client]', err.message);
      last = err instanceof AECError ? err : new AECError('Sin conexión con Google Gemini.', { cause: err, code: 'network' });
    }
  }
  throw last;
}

/** Read a File/Blob as {mimeType, base64} for generateImage({images}). */
export function fileToInline(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const [head, base64] = String(r.result).split(',');
      resolve({ mimeType: head.match(/data:(.*?);/)?.[1] || file.type || 'image/jpeg', base64 });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
