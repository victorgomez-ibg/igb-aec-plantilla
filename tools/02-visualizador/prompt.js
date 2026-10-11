// Tool 02 — Visualizador: Claude prompt + JSON schema for the floor plan, and the
// Gemini prompt for the facade render. Claude returns GEOMETRY only (rooms in metres,
// door/window positions); plan-svg.js draws the SVG deterministically.
// Imported by index.html and by generate-examples.mjs; keep free of DOM code.

export const DISCLAIMER = 'Imágenes conceptuales generadas por IA. No sustituyen el proyecto ejecutivo.';

export const TIPOS_ESPACIO = [
  'estancia', 'comedor', 'cocina', 'recamara', 'bano', 'cochera', 'patio', 'jardin',
  'circulacion', 'escalera', 'servicio', 'estudio', 'local', 'otro',
];
const LADOS = ['norte', 'sur', 'este', 'oeste'];

const abertura = (extra = {}) => ({
  type: 'object',
  additionalProperties: false,
  required: ['espacio', 'lado', 'posicion', ...Object.keys(extra)],
  properties: {
    espacio: { type: 'string', description: 'id del espacio al que pertenece' },
    lado: { type: 'string', enum: LADOS },
    posicion: { type: 'number', description: 'centro de la abertura a lo largo del muro, 0 a 1' },
    ...extra,
  },
});

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'resumen', 'terreno', 'niveles', 'notas'],
  properties: {
    titulo: { type: 'string' },
    resumen: { type: 'string', description: 'Una frase: qué se propone y cómo se organiza.' },
    terreno: {
      type: 'object',
      additionalProperties: false,
      required: ['frente', 'fondo'],
      properties: { frente: { type: 'number' }, fondo: { type: 'number' } },
    },
    niveles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nombre', 'espacios', 'puertas', 'ventanas'],
        properties: {
          nombre: { type: 'string' },
          espacios: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'nombre', 'tipo', 'x', 'y', 'w', 'h'],
              properties: {
                id: { type: 'string' },
                nombre: { type: 'string' },
                tipo: { type: 'string', enum: TIPOS_ESPACIO },
                x: { type: 'number' }, y: { type: 'number' },
                w: { type: 'number' }, h: { type: 'number' },
              },
            },
          },
          puertas: { type: 'array', items: abertura({ acceso: { type: 'boolean', description: 'true = acceso principal desde la calle' } }) },
          ventanas: { type: 'array', items: abertura({ largo: { type: 'number', description: 'metros' } }) },
        },
      },
    },
    notas: { type: 'array', items: { type: 'string' }, description: '2 a 4 notas de diseño breves' },
  },
};

export const SYSTEM = `Eres arquitecto proyectista en Querétaro, México. Conviertes una descripción en lenguaje normal en un ANTEPROYECTO de planta arquitectónica, expresado como geometría en metros. Un programa dibuja la planta a partir de tu JSON.

Sistema de coordenadas (por nivel):
- El terreno es un rectángulo de "frente" (eje x, de 0 a frente) por "fondo" (eje y, de 0 a fondo).
- y = 0 es el alineamiento con la CALLE. y crece hacia el fondo del terreno.
- "norte" = lado y menor (hacia la calle), "sur" = y mayor, "oeste" = x menor, "este" = x mayor. (Son lados del dibujo, no orientación geográfica.)
- Cada espacio es un rectángulo (x, y) = esquina más cercana a la calle y al lado oeste, w = ancho en x, h = profundidad en y.

Reglas de geometría (obligatorias):
- Todos los espacios quedan DENTRO del terreno: 0 ≤ x, x+w ≤ frente, 0 ≤ y, y+h ≤ fondo.
- Los espacios NO se traslapan. Los espacios contiguos comparten el borde exacto (sin huecos de 0.1 m).
- Usa múltiplos de 0.05 m. Dimensiones habitables realistas: recámara ≥ 3.0 × 3.0, baño completo ≈ 1.6 × 2.5, cochera doble ≈ 5.5-6.0 × 5.5-6.0, estancia ≥ 3.6 de ancho.
- Respeta un área libre al fondo o al frente (patio/jardín) si el terreno lo permite; dibújala como espacio tipo "patio" o "jardin".
- La cochera va sobre el frente (y = 0). La suma de áreas techadas debe aproximarse a los m² de construcción pedidos, repartidos entre los niveles.
- Si hay 2 niveles: nivel 1 = planta baja (social, cocina, cochera), nivel 2 = planta alta (recámaras). La escalera ocupa la MISMA posición en ambos niveles. En planta alta los espacios sobre la cochera o el jardín pueden quedar vacíos (no los dibujes).
- ids cortos únicos por nivel (ej. "est", "rec1"). Nombres en español, en mayúsculas iniciales ("Recámara principal").

Aberturas:
- Cada espacio habitable tiene al menos una puerta. La puerta se dibuja en el muro "lado" del espacio indicado, en "posicion" (0 a 1 a lo largo del muro).
- Exactamente una puerta con acceso = true: la de entrada principal, en un espacio que toca la calle o la cochera.
- Ventanas en los muros que dan a patio, jardín o calle; largo 1.0 a 2.4 m.

Escribe en español de México. No cites normas.`;

/** Built area the client asked for (first "N m²" in the text), or null. */
export function m2Objetivo(descripcion) {
  const m = String(descripcion).match(/(\d{2,5}(?:[.,]\d+)?)\s*(?:m²|m2|mts2|mts²|metros cuadrados)/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}

export function buildPrompt(descripcion) {
  const obj = m2Objetivo(descripcion);
  const meta = obj
    ? `\n\nMETA DE SUPERFICIE: ${obj} m² de construcción TECHADA en total (±10 %: entre ${Math.round(obj * 0.9)} y ${Math.round(obj * 1.1)} m²). Cuenta la suma de w×h de todos los espacios que NO son patio ni jardín, en TODOS los niveles, incluidas cochera, circulaciones y escalera (la escalera cuenta en cada nivel). Si hay varios niveles, reparte la superficie entre ellos; no repitas la planta baja completa arriba. Antes de responder, suma las áreas y ajusta medidas hasta quedar dentro del rango.`
    : '';
  return `Descripción del cliente:\n"""${descripcion.trim()}"""${meta}\n\nSi la descripción no trae el tamaño del terreno, propón uno razonable para Querétaro (lotes típicos 7×15, 8×16, 10×20, 15×20). Devuelve el JSON.`;
}

/** Gemini prompt for the facade render. Built from the user's text so it can run in parallel with Claude. */
export function buildRenderPrompt(descripcion) {
  return `Photorealistic architectural exterior render of the FRONT FACADE of this project, seen from the street at eye level, three-quarter view:
"${descripcion.trim()}"

Setting: Querétaro, Mexico, semi-arid climate, residential street. Contemporary Mexican architecture: clean volumes, apparent concrete or light stucco, local cantera stone or wood accents, generous glazing, native plants (agave, mesquite), soft late-afternoon light, clear sky.
Style: high-end architectural visualization, sharp, natural colors, 16:9.
Strictly NO text, NO letters, NO logos, NO watermarks, NO signs in the image. No people close to camera.`;
}

export const EJEMPLOS_TEXTO = [
  'Casa habitación de 180 m², dos niveles, fachada contemporánea minimalista, concreto aparente y madera, ventanales de piso a techo, clima semidesierto de Querétaro, cochera para 2 autos.',
  'Casa compacta 120 m² en dos niveles, 2 recámaras, 1.5 baños, cochera para un auto, terreno 7×15',
  'Casa campestre de un nivel en Cadereyta, 150 m², 2 recámaras, 2 baños, terraza techada y cochera doble, terreno 15×25',
];

/** Selectable presets. The first three have pre-generated backups (respaldo.js, same order as EJEMPLOS_TEXTO). */
export const PRESETS = [
  { id: 'casa-cadereyta', cat: 'Vivienda', respaldo: true, title: 'Casa 180 m² · Cadereyta', meta: '2 niveles, contemporánea, concreto aparente y madera. Caso del taller.', tags: ['Semidesierto'], text: EJEMPLOS_TEXTO[0] },
  { id: 'compacta', cat: 'Vivienda', respaldo: true, title: 'Casa compacta 120 m²', meta: '2 niveles en lote de 7×15, 2 recámaras.', tags: ['Lote angosto'], text: EJEMPLOS_TEXTO[1] },
  { id: 'campestre', cat: 'Campestre', respaldo: true, title: 'Casa campestre 150 m² · Cadereyta', meta: '1 nivel, terraza techada, lote de 15×25.', tags: ['Semidesierto'], text: EJEMPLOS_TEXTO[2] },
  { id: 'accesible', cat: 'Vivienda', title: 'Casa accesible 110 m² · Ezequiel Montes', meta: '1 nivel sin escalones, lote de 10×20.', tags: ['Accesibilidad'],
    text: 'Casa de un nivel accesible de 110 m² en Ezequiel Montes, 2 recámaras, 2 baños con regadera a nivel de piso, sin escalones, pasillos de 1.20 m, cochera para 1 auto, terreno 10×20' },
  { id: 'residencia-zibata', cat: 'Residencial', title: 'Residencia 300 m² · Zibatá', meta: '2 niveles, doble altura y estudio, lote de 12×25.', tags: ['Metro'],
    text: 'Residencia de 300 m² en Zibatá, dos niveles, 4 recámaras, estudio, doble altura en la estancia, terraza, cochera para 3 autos, terreno 12×25' },
  { id: 'mixto-tequis', cat: 'Uso mixto', title: 'Casa con local 160 m² · Tequisquiapan', meta: 'Local en planta baja, vivienda arriba, lote de 8×20.', tags: ['Semidesierto'],
    text: 'Casa con local comercial en planta baja en Tequisquiapan, 160 m² en dos niveles: local de 45 m² con medio baño al frente, vivienda de 2 recámaras y 1.5 baños arriba, terreno 8×20' },
];
