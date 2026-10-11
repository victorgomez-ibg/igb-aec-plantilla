// Tool 03 — Generador de propuestas: Claude prompt + JSON schema + deterministic money/time math.
// Claude writes the TEXT (entendimiento, servicios, fases, entregables) and relative
// percentages per phase. Amounts and weeks come from the user's monto/plazo via code.
// Imported by index.html and by generate-example.mjs; keep free of DOM code.

export const DEFAULT_DESPACHO = 'Estudio Marqués Arquitectos';

export const DISCLAIMER = 'Propuesta comercial generada con apoyo de IA a partir de los datos capturados por el despacho. Montos y plazos definidos por el despacho; distribución por fase de referencia (adaptación, sin norma). Revísela antes de enviarla al cliente.';

export const TIPOS_PROYECTO = {
  casa_habitacion: 'Casa habitación (proyecto arquitectónico)',
  proyecto_y_obra: 'Casa habitación (proyecto + construcción)',
  remodelacion: 'Remodelación / ampliación',
  departamentos: 'Edificio de departamentos',
  comercial: 'Local comercial / oficinas',
  nave_industrial: 'Nave industrial',
  interiorismo: 'Interiorismo',
  otro: 'Otro',
};

export function buildSystem() {
  return `Eres el director de un despacho de arquitectura e ingeniería en Querétaro, México, y redactas propuestas comerciales (propuestas de servicios profesionales) claras, profesionales y persuasivas, en español de México.

Reglas estrictas:
- NO escribes cifras de dinero, precios, montos, porcentajes de pago ni fechas en ningún texto. La inversión y el plazo los calcula el sistema a partir de los datos del despacho. Tampoco inventes metros cuadrados, número de niveles ni datos que el despacho no haya dado.
- Solo usas números en los campos "peso_duracion" y "peso_inversion" de cada fase: son enteros que representan qué porcentaje del plazo total y de la inversión total corresponde a esa fase. Cada uno debe sumar 100 entre todas las fases.
- No prometas resultados que el despacho no controla (plusvalía, ventas, permisos garantizados, ahorros concretos). Puedes hablar de proceso, claridad, control de costos y calidad.
- No inventes testimonios, premios, clientes ni obras previas del despacho.
- Normativa: en Querétaro el diseño estructural usa el Manual de Obras Civiles CFE con las NTC de la CDMX como supletorias; la instalación eléctrica, la NOM-001-SEDE-2012. Menciónalas solo si aplican; no cites normas que no existan.
- Tono: profesional, cercano, concreto. Frases cortas. Nada de relleno.

Estructura:
- "titulo_proyecto": nombre corto y claro del proyecto.
- "entendimiento": 2 párrafos que demuestren que el despacho entendió lo que el cliente necesita (sus objetivos, restricciones y lo que le importa).
- "objetivos": 3 a 5 objetivos del proyecto.
- "servicios": 5 a 8 servicios incluidos, cada uno con nombre y descripción de una o dos frases.
- "fases": 3 a 6 fases en orden cronológico, cada una con nombre, descripción breve, 2 a 5 entregables concretos (planos, memorias, renders, catálogos, etc.), peso_duracion y peso_inversion.
- "exclusiones": 3 a 6 cosas que NO incluye la propuesta (p. ej. pago de derechos y licencias, estudios de mecánica de suelos, levantamiento topográfico) salvo que el alcance diga lo contrario.
- "requisitos_cliente": 2 a 4 cosas que el despacho necesita del cliente para arrancar.
- "cierre": un párrafo breve de cierre con el siguiente paso (una reunión para revisar la propuesta).`;
}

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo_proyecto', 'entendimiento', 'objetivos', 'servicios', 'fases', 'exclusiones', 'requisitos_cliente', 'cierre'],
  properties: {
    titulo_proyecto: { type: 'string' },
    entendimiento: { type: 'array', items: { type: 'string' } },
    objetivos: { type: 'array', items: { type: 'string' } },
    servicios: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['nombre', 'descripcion'],
        properties: { nombre: { type: 'string' }, descripcion: { type: 'string' } },
      },
    },
    fases: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['nombre', 'descripcion', 'entregables', 'peso_duracion', 'peso_inversion'],
        properties: {
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          entregables: { type: 'array', items: { type: 'string' } },
          peso_duracion: { type: 'integer' },
          peso_inversion: { type: 'integer' },
        },
      },
    },
    exclusiones: { type: 'array', items: { type: 'string' } },
    requisitos_cliente: { type: 'array', items: { type: 'string' } },
    cierre: { type: 'string' },
  },
};

export function buildPrompt(p) {
  return `Redacta la propuesta comercial para este proyecto:
- Despacho: ${p.despacho}
- Cliente: ${p.cliente}
- Tipo de proyecto: ${TIPOS_PROYECTO[p.tipo] ?? p.tipo}
- Alcance descrito por el despacho (lenguaje normal): ${p.alcance}
- Plazo total acordado: ${p.plazoSemanas} semanas (el sistema lo reparte según tus peso_duracion).
Recuerda: ninguna cifra de dinero ni fechas en los textos.`;
}

/** Largest-remainder rounding: integers that sum exactly to `total`, proportional to `weights`. */
export function distribute(total, weights) {
  let w = weights.map((x) => Math.max(0, Number(x) || 0));
  if (w.every((v) => v === 0)) w = w.map(() => 1);
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / sum) * total);
  const floor = raw.map(Math.floor);
  let rest = total - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0 && order.length; k = (k + 1) % order.length, rest--) floor[order[k][1]]++;
  return floor;
}

/**
 * Deterministic math: phase weeks (sequential), phase investment, IVA, payment schedule.
 * @param {{monto:number, plazoSemanas:number, ivaPct:number}} params
 * @param {object} scope Claude output
 */
export function calcularPropuesta({ monto, plazoSemanas, ivaPct }, scope) {
  const fases = scope.fases;
  const pctDur = distribute(100, fases.map((f) => f.peso_duracion));
  const pctInv = distribute(100, fases.map((f) => f.peso_inversion));
  // Weeks: at least 1 per phase, total = plazo (if plazo < phases, phases share weeks).
  const weeks = plazoSemanas >= fases.length
    ? distribute(plazoSemanas - fases.length, pctDur).map((w) => w + 1)
    : distribute(plazoSemanas, pctDur);
  // Money in centavos to avoid float drift, then back to pesos.
  const cents = distribute(Math.round(monto * 100), pctInv);
  let start = 1;
  const filas = fases.map((f, i) => {
    const dur = Math.max(weeks[i], 0);
    const row = {
      n: i + 1, nombre: f.nombre, descripcion: f.descripcion, entregables: f.entregables,
      pctDuracion: pctDur[i], pctInversion: pctInv[i],
      semanas: dur, semanaInicio: start, semanaFin: start + Math.max(dur, 1) - 1,
      importe: cents[i] / 100,
    };
    start += dur;
    return row;
  });
  const iva = Math.round(monto * ivaPct) / 100;
  return {
    fases: filas,
    totales: { subtotal: monto, ivaPct, iva, total: Math.round((monto + iva) * 100) / 100 },
    plazoSemanas,
  };
}

/** Workshop example. Pre-generated output lives in ejemplo-propuesta.json (modo respaldo). */
export const EXAMPLE = {
  despacho: DEFAULT_DESPACHO,
  cliente: 'Familia Martínez',
  tipo: 'casa_habitacion',
  alcance: 'Proyecto arquitectónico + presupuesto de obra. Proyecto: Casa 180 m², Cadereyta. Casa habitación contemporánea de dos niveles en Cadereyta de Montes, terreno de 15×20, con 3 recámaras, 2.5 baños, losa maciza y cochera para 2 autos. Necesitan el proyecto arquitectónico completo y el presupuesto de obra para decidir y tramitar la licencia.',
  monto: 185000,
  plazoSemanas: 12,
  vigenciaDias: 15,
};

/** Selectable presets for the "Ejemplos precargados" picker. Only EXAMPLE has a pre-generated backup proposal. Clients are fictitious. */
export const PRESETS = [
  { id: 'martinez', cat: 'Vivienda', respaldo: true, title: 'Familia Martínez · Casa 180 m²', meta: 'Proyecto arquitectónico + presupuesto, Cadereyta. $185,000 · 12 semanas.', tags: ['Caso del taller'], data: EXAMPLE },
  { id: 'remodelacion-mendez', cat: 'Remodelación', title: 'Sra. Méndez · Cocina y 2 baños', meta: 'Remodelación en El Refugio. $68,000 · 6 semanas.', tags: ['Metro'],
    data: { despacho: DEFAULT_DESPACHO, cliente: 'Sra. Laura Méndez', tipo: 'remodelacion', alcance: 'Remodelación de cocina y dos baños en una casa de 1998 en El Refugio. Cambio de instalaciones hidráulicas y eléctricas, nuevo diseño de cocina integral, recubrimientos, iluminación y cancel de baño. La familia seguirá viviendo en la casa durante la obra.', monto: 68000, plazoSemanas: 6, vigenciaDias: 15 } },
  { id: 'nave-bajio', cat: 'Industrial', title: 'Logística del Bajío · Nave 1,200 m²', meta: 'Proyecto ejecutivo en Colón. $420,000 · 16 semanas.', tags: ['Semidesierto'],
    data: { despacho: DEFAULT_DESPACHO, cliente: 'Logística del Bajío S.A. de C.V.', tipo: 'nave_industrial', alcance: 'Proyecto ejecutivo de una nave industrial de 1,200 m² en Colón: estructura metálica con claro libre de 30 m, oficinas en mezzanine, 2 andenes de carga, instalaciones y documentación para licencia de construcción y dictamen de uso de suelo.', monto: 420000, plazoSemanas: 16, vigenciaDias: 30 } },
  { id: 'cafe-bernal', cat: 'Comercial', title: 'Café en Bernal · Local 120 m²', meta: 'Adecuación e interiorismo en pueblo mágico. $95,000 · 8 semanas.', tags: ['Semidesierto'],
    data: { despacho: DEFAULT_DESPACHO, cliente: 'Café Peña de Bernal', tipo: 'comercial', alcance: 'Adecuación de un local de 120 m² en el centro de Bernal para cafetería: proyecto arquitectónico, interiorismo, barra y cocina, instalaciones, y fachada que respete la imagen urbana del pueblo mágico para el permiso municipal.', monto: 95000, plazoSemanas: 8, vigenciaDias: 15 } },
  { id: 'deptos-tequis', cat: 'Desarrollo', title: 'Grupo Semidesierto · 8 departamentos', meta: 'Edificio de 3 niveles en Tequisquiapan. $560,000 · 20 semanas.', tags: ['Semidesierto'],
    data: { despacho: DEFAULT_DESPACHO, cliente: 'Grupo Inmobiliario Semidesierto', tipo: 'departamentos', alcance: 'Anteproyecto y proyecto ejecutivo de un edificio de 8 departamentos en 3 niveles en Tequisquiapan, con estacionamiento en planta baja, áreas comunes y roof garden. Incluye factibilidad de uso de suelo y expediente para licencia.', monto: 560000, plazoSemanas: 20, vigenciaDias: 30 } },
  { id: 'interior-rios', cat: 'Interiorismo', title: 'Familia Ríos · Interiorismo', meta: 'Estancia, comedor y recámara en Juriquilla. $72,000 · 6 semanas.', tags: ['Metro'],
    data: { despacho: DEFAULT_DESPACHO, cliente: 'Familia Ríos', tipo: 'interiorismo', alcance: 'Diseño interior de estancia, comedor y recámara principal de una casa nueva en Juriquilla: distribución de mobiliario, iluminación, paleta de materiales, carpintería a medida y renders para aprobación.', monto: 72000, plazoSemanas: 6, vigenciaDias: 15 } },
];
