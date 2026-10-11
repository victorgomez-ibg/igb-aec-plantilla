// Tool 01 — Presupuestador: Claude prompt + JSON schema.
// Claude returns SCOPE only (partidas, quantities, weights) — never prices.
// Imported by index.html and by tests; keep free of DOM code.

import { TIPOS_OBRA, ACABADOS, CATEGORIAS, MATERIALES_SUMINISTRO } from '../../shared/js/calculo.js';

export const DISCLAIMER = 'Presupuesto paramétrico de referencia. Precios base: CEICO-CMIC/INEGI julio 2026 (Tier 2, direccional). Requiere validación por el responsable del proyecto.';

export function buildSystem(precios) {
  const materiales = MATERIALES_SUMINISTRO
    .map((k) => `- ${k} (unidad: ${precios[k].unidad})`)
    .join('\n');
  const categorias = Object.entries(CATEGORIAS).map(([k, v]) => `- ${k}: ${v}`).join('\n');
  return `Eres un ingeniero de costos con experiencia en obra en Querétaro, México. Preparas el ALCANCE (catálogo de conceptos) de un presupuesto paramétrico.

NO asignas precios. Un motor de cálculo aplica después precios verificados de IGB. Tu trabajo es:
1. Definir las partidas (conceptos) que requiere la obra, con descripción técnica profesional en español de México, unidad y cantidad estimada según superficie, niveles, tipo de obra y nivel de acabados.
2. Clasificar cada partida:
   - "suministro": suministro de un material que tiene precio verificado. Solo puedes usar estas claves en material_clave, y la cantidad debe estar en su unidad:
${materiales}
     Estas líneas son SOLO material (sin mano de obra). Usa cada clave como máximo una vez en toda la obra, sumando la cantidad total del material, y ubícala en la categoría donde más se consume. peso = 0.
   - "parametrica": todo lo demás (mano de obra, cimbra, colocación, instalaciones, acabados, equipos, carpintería, herrería, cancelería, etc.). material_clave = null. peso = importancia relativa de su costo dentro de la parte paramétrica del presupuesto (número positivo; ej. una partida que cuesta el doble que otra lleva el doble de peso). Las partidas paramétricas de colado, armado o muros NO deben incluir de nuevo el material ya listado como suministro (concreto, acero, block, cemento, mortero, arena/grava, alambre): descríbelas como "mano de obra, cimbra y equipo" o similar.
3. Usar exactamente estas categorías (en ese orden lógico), cubriendo todas las que apliquen al tipo de obra:
${categorias}

Reglas:
- Entre 30 y 40 partidas en total. Descripciones técnicas concisas: máximo 20 palabras cada una. Cantidades realistas y consistentes entre sí (ej. m² de aplanado vs m² de muro; kg de acero coherente con m³ de concreto).
- Unidades mexicanas usuales: m², m³, ml, kg, pza, salida, lote, jgo.
- Querétaro: zona sísmica B (moderada); diseño estructural con Manual de Obras Civiles CFE y NTC CDMX como supletorias. No cites normas inexistentes.
- Para nave industrial prioriza estructura metálica, cimentación, piso de concreto y cubierta; los acabados son mínimos.
- Para remodelación incluye demoliciones y retiro de escombro en preliminares, y cantidades solo de lo que se interviene.
- "supuestos": lista breve (4 a 8) de supuestos técnicos que tomaste (sistema estructural, alturas, tipo de losa, etc.).
- "resumen_alcance": 2 o 3 frases que describan la obra presupuestada.`;
}

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resumen_alcance', 'supuestos', 'partidas'],
  properties: {
    resumen_alcance: { type: 'string' },
    supuestos: { type: 'array', items: { type: 'string' } },
    partidas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['categoria', 'descripcion', 'unidad', 'cantidad', 'tipo', 'material_clave', 'peso'],
        properties: {
          categoria: { type: 'string', enum: Object.keys(CATEGORIAS) },
          descripcion: { type: 'string' },
          unidad: { type: 'string' },
          cantidad: { type: 'number' },
          tipo: { type: 'string', enum: ['suministro', 'parametrica'] },
          material_clave: { anyOf: [{ type: 'string', enum: MATERIALES_SUMINISTRO }, { type: 'null' }] },
          peso: { type: 'number' },
        },
      },
    },
  },
};

export function buildPrompt(p) {
  return `Genera el alcance del presupuesto para esta obra:
- Tipo de obra: ${TIPOS_OBRA[p.tipo].label}
- Superficie construida total: ${p.superficie} m²
- Número de niveles: ${p.niveles}
- Nivel de acabados: ${ACABADOS[p.acabados].label}
- Ubicación: ${p.zonaLabel}, Querétaro
- Descripción adicional del cliente: ${p.notas ? p.notas : '(ninguna)'}`;
}


/** Workshop example. The pre-generated scope for it lives in ejemplo-alcance.json (modo respaldo). */
export const EXAMPLE = { tipo: 'casa_habitacion', superficie: 180, niveles: 2, acabados: 'medio', zona: 'cadereyta', notas: '3 recámaras, 2.5 baños, losa maciza, cochera 2 autos' };

/** Selectable presets for the "Ejemplos precargados" picker. Only EXAMPLE has a pre-generated backup scope. */
export const PRESETS = [
  { id: 'casa-cadereyta', cat: 'Vivienda', respaldo: true, title: 'Casa 180 m² · Cadereyta', meta: 'Obra nueva, 2 niveles, acabados medios. Caso del taller.', tags: ['Semidesierto', 'Medio'], data: EXAMPLE },
  { id: 'interes-social-colon', cat: 'Vivienda', title: 'Vivienda económica 90 m² · Colón', meta: '1 nivel, 2 recámaras, muros de block y losa de vigueta.', tags: ['Semidesierto', 'Económico'],
    data: { tipo: 'casa_habitacion', superficie: 90, niveles: 1, acabados: 'economico', zona: 'colon', notas: '2 recámaras, 1 baño completo, cocina abierta, cochera para 1 auto, muros de block, losa de vigueta y bovedilla' } },
  { id: 'residencia-juriquilla', cat: 'Vivienda', title: 'Residencia 320 m² · Juriquilla', meta: '2 niveles, acabados residenciales, doble altura y roof garden.', tags: ['Metro', 'Residencial'],
    data: { tipo: 'casa_habitacion', superficie: 320, niveles: 2, acabados: 'residencial', zona: 'juriquilla', notas: '4 recámaras con vestidor, 4.5 baños, doble altura en estancia, estudio, roof garden, cochera para 3 autos, losa maciza' } },
  { id: 'descanso-tequis', cat: 'Vivienda', title: 'Casa de descanso 150 m² · Tequisquiapan', meta: '1 nivel, terraza techada y asador.', tags: ['Semidesierto', 'Medio'],
    data: { tipo: 'casa_habitacion', superficie: 150, niveles: 1, acabados: 'medio', zona: 'tequisquiapan', notas: '3 recámaras, 2 baños, terraza techada con asador, cochera para 2 autos, techos con vigas aparentes' } },
  { id: 'nave-colon', cat: 'Industrial', title: 'Nave industrial 1,200 m² · Colón', meta: 'Estructura metálica, claro de 30 m, 2 andenes de carga.', tags: ['Semidesierto', 'Estructura + mano de obra'],
    data: { tipo: 'nave_industrial', superficie: 1200, niveles: 1, acabados: 'medio', zona: 'colon', notas: 'estructura metálica con claro libre de 30 m, altura libre 9 m, firme de concreto de 15 cm, 2 andenes de carga, oficinas en mezzanine' } },
  { id: 'local-bernal', cat: 'Comercial', title: 'Local comercial 120 m² · Bernal', meta: 'Planta baja con baño y fachada de cantera.', tags: ['Semidesierto', 'Sin referencia verificada'],
    data: { tipo: 'local_comercial', superficie: 120, niveles: 1, acabados: 'medio', zona: 'bernal', notas: 'local en planta baja con medio baño, fachada de cantera acorde a la imagen urbana, cortina metálica' } },
  { id: 'remodelacion-centro', cat: 'Remodelación', title: 'Remodelación 85 m² · Centro Histórico', meta: 'Cocina y 2 baños, instalaciones nuevas.', tags: ['Metro', 'Sin referencia verificada'],
    data: { tipo: 'remodelacion', superficie: 85, niveles: 1, acabados: 'medio', zona: 'centro_historico', notas: 'cocina integral nueva y 2 baños completos, cambio de instalaciones hidráulicas y eléctricas, pisos y recubrimientos' } },
];
