// Tool 04 — Contenido de autoridad: Claude prompt + JSON schema.
// Claude writes the content package from the firm's description + one photo.
// It never invents figures, clients, awards or testimonials: only what the firm wrote
// or what is visible in the photo. The 3 render variants are fixed prompts (RENDER_VARIANTS)
// sent to Gemini with the photo as reference, in parallel with Claude, to keep the demo fast.
// Imported by index.html and by generate-example.mjs; keep free of DOM code.

export const DEFAULT_DESPACHO = 'Estudio Marqués Arquitectos';

export const DISCLAIMER = 'Textos generados con IA a partir de la descripción del despacho; revísalos antes de publicar. Renders: imágenes conceptuales generadas por IA, no son fotografías de la obra y no sustituyen el proyecto ejecutivo.';

export const N_LAMINAS = 5;

export function buildSystem() {
  return `Eres estratega de contenido para despachos de arquitectura e ingeniería en México. Conviertes una obra terminada en un paquete de contenido de autoridad, listo para publicar, en español de México.

Reglas estrictas:
- Usa SOLO los datos que da el despacho y lo que se ve en la foto. No inventes metros cuadrados, costos, plazos, premios, nombres de clientes, testimonios, citas ni cifras de ningún tipo. Si el despacho dio un dato, puedes repetirlo tal cual.
- No prometas resultados (ventas, plusvalía, ahorros concretos). Habla de decisiones de diseño, retos resueltos, materiales, luz, proceso y oficio.
- Nada de clichés de IA ("en el dinámico mundo de…", "sin duda", "descubre", exceso de emojis). Máximo 2 emojis por texto, y ninguno en la descripción de portafolio.
- Tono: profesional, cálido, concreto. Frases cortas.

Entrega:
- "titulo_proyecto": nombre corto del proyecto (usa el que dio el despacho si lo dio).
- "linkedin": post de caso de éxito (120 a 200 palabras) con gancho en la primera línea, el reto, las decisiones de diseño y una pregunta o invitación al final. Más 3 a 5 hashtags sin espacios.
- "carrusel": exactamente ${N_LAMINAS} láminas para Instagram. Lámina 1 = portada con gancho; 2 a 4 = reto, decisiones de diseño, detalle o material; 5 = cierre con invitación a contactar al despacho. Cada lámina: "titulo" (máx. 7 palabras) y "texto" (máx. 28 palabras). Más el "caption" (60 a 120 palabras) y 5 a 8 hashtags.
- "portafolio": "titulo", "resumen" (una frase) y "descripcion" (2 párrafos para la web del despacho), más "ficha": pares etiqueta/valor SOLO con datos dados por el despacho (ubicación, año, superficie, programa, materiales…); si un dato no se dio, no lo incluyas.
Las 3 variantes de render las genera otro sistema en paralelo; no las describas.`;
}

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo_proyecto', 'linkedin', 'carrusel', 'portafolio'],
  properties: {
    titulo_proyecto: { type: 'string' },
    linkedin: {
      type: 'object', additionalProperties: false, required: ['texto', 'hashtags'],
      properties: { texto: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } } },
    },
    carrusel: {
      type: 'object', additionalProperties: false, required: ['laminas', 'caption', 'hashtags'],
      properties: {
        laminas: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false, required: ['titulo', 'texto'],
            properties: { titulo: { type: 'string' }, texto: { type: 'string' } },
          },
        },
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
      },
    },
    portafolio: {
      type: 'object', additionalProperties: false, required: ['titulo', 'resumen', 'descripcion', 'ficha'],
      properties: {
        titulo: { type: 'string' },
        resumen: { type: 'string' },
        descripcion: { type: 'array', items: { type: 'string' } },
        ficha: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false, required: ['etiqueta', 'valor'],
            properties: { etiqueta: { type: 'string' }, valor: { type: 'string' } },
          },
        },
      },
    },
  },
};

/**
 * User message: the photo (if any) as an image block + the firm's text.
 * @param {{despacho:string, descripcion:string}} p
 * @param {{mimeType:string, base64:string}|null} photo
 */
export function buildContent(p, photo) {
  const text = `Despacho: ${p.despacho}
Descripción del proyecto terminado (escrita por el despacho):
${p.descripcion}

${photo ? 'Adjunto una foto de la obra terminada. Úsala para describir lo que se ve y como referencia de los renders.' : 'No hay foto: describe solo lo que dice el texto.'}`;
  return photo
    ? [{ type: 'image', source: { type: 'base64', media_type: photo.mimeType, data: photo.base64 } }, { type: 'text', text }]
    : text;
}

export const RENDER_VARIANTS = [
  { nombre: 'Atardecer', prompt: 'The same building at golden hour sunset, seen from a different three-quarter angle, warm low sun grazing the facade materials, long soft shadows, dramatic sky.' },
  { nombre: 'Nocturno', prompt: 'The same building at blue hour / night, warm architectural lighting from inside and under the eaves, glowing windows, deep blue sky.' },
  { nombre: 'Vista aérea', prompt: 'The same building seen from an elevated drone view at 30 degrees, showing the roof, terraces and the surrounding landscape and site, soft daylight.' },
];

/** Prompt sent to Gemini for one variant, with the photo attached as reference. */
export function renderPrompt(variant) {
  return `Photorealistic professional architectural photograph. ${variant.prompt}\n\nUse the attached photo as the reference: keep exactly the same building, architecture, volumes, materials, colors and proportions; change only the camera, time of day and lighting. No people in the foreground. No text, no logos, no watermarks.`;
}

/** Workshop example. Pre-generated package lives in ejemplo/ (modo respaldo). */
export const EXAMPLE = {
  despacho: DEFAULT_DESPACHO,
  descripcion: 'Casa habitación de 180 m² en Cadereyta, estilo contemporáneo, concreto aparente y madera, entregada 2026, terreno 15×20.',
};

/** Selectable presets (photo = file in ejemplo/). Only EXAMPLE has a pre-generated backup package. Projects are fictitious. */
export const PRESETS = [
  { id: 'casa-cadereyta', cat: 'Vivienda', respaldo: true, title: 'Casa 180 m² · Cadereyta', meta: 'Contemporánea, concreto aparente y madera, entregada 2026. Caso del taller.', tags: ['Semidesierto'], foto: 'foto.jpg', data: EXAMPLE },
  { id: 'cocina-refugio', cat: 'Remodelación', title: 'Cocina remodelada · El Refugio', meta: 'Casa de 1998, cocina abierta con isla, entregada 2026.', tags: ['Metro', 'Interiores'], foto: 'foto-cocina.jpg',
    data: { despacho: DEFAULT_DESPACHO, descripcion: 'Remodelación de cocina en una casa de 1998 en El Refugio, Querétaro, entregada en 2026. Se abrió el muro hacia el comedor para crear una cocina abierta con isla de cuarzo blanco, gabinetes de encino, grifería negra mate y piso porcelánico. Se cambiaron instalaciones hidráulicas y eléctricas. El reto fue ganar luz natural y almacenamiento sin ampliar la superficie.' } },
  { id: 'cafe-bernal', cat: 'Comercial', title: 'Café en el centro de Bernal', meta: 'Restauración de fachada de cantera e interiorismo, pueblo mágico.', tags: ['Semidesierto', 'Patrimonio'], foto: 'foto-cafe.jpg',
    data: { despacho: DEFAULT_DESPACHO, descripcion: 'Adecuación de un local de 120 m² en el centro histórico de Bernal, Querétaro, para una cafetería, terminada en 2026. Se restauró la fachada con cantera y aplanado de cal respetando la imagen urbana del pueblo mágico; adentro, muros de piedra aparente, barra de madera y luz cálida. El reto fue cumplir con la normativa de imagen urbana y lograr un espacio que invite a quedarse con vista a la Peña.' } },
];
