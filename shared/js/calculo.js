// IGB AEC Suite — deterministic presupuesto engine.
//
// Claude supplies SCOPE (partidas, quantities, relative weights). This module
// supplies MONEY, using only verified data from data/*.json. Keep in sync with
// backend/services/calculo_service.py. Algorithm documented in CLAUDE.md.
//
// Pure functions, no DOM: runs in the browser and under `node --test`.

import { priceOf } from './data.js';

export const TIPOS_OBRA = {
  casa_habitacion: { label: 'Casa habitación', referencia: 'residencial' },
  nave_industrial: { label: 'Nave industrial', referencia: 'nave' },
  oficinas: { label: 'Oficinas', referencia: 'residencial', sinReferencia: true },
  local_comercial: { label: 'Local comercial', referencia: 'residencial', sinReferencia: true },
  remodelacion: { label: 'Remodelación', referencia: 'residencial', sinReferencia: true },
};

export const ACABADOS = {
  economico: { label: 'Económico' },
  medio: { label: 'Medio' },
  residencial: { label: 'Residencial' },
};

/** Budget chapters, in the order they are printed. */
export const CATEGORIAS = {
  preliminares: 'Preliminares',
  cimentacion: 'Cimentación',
  estructura: 'Estructura',
  albanileria: 'Albañilería',
  instalacion_hidraulica: 'Instalación hidráulica',
  instalacion_sanitaria: 'Instalación sanitaria',
  instalacion_electrica: 'Instalación eléctrica',
  acabados_pisos: 'Acabados — pisos',
  acabados_muros: 'Acabados — muros',
  acabados_plafones: 'Acabados — plafones',
  carpinteria: 'Carpintería',
  herreria: 'Herrería',
  canceleria: 'Cancelería',
  pintura: 'Pintura',
  limpieza: 'Limpieza',
};

/**
 * Material keys from precios_materiales_2026.json that Claude may use for supply lines.
 * cemento_tonelada and varilla_corrugada_ton are excluded on purpose: they duplicate
 * cemento_gris_bulto_50kg and acero_refuerzo_kg_qro (the Querétaro figure) and would
 * invite double counting.
 */
export const MATERIALES_SUMINISTRO = [
  'concreto_premezclado_m3_qro',
  'acero_refuerzo_kg_qro',
  'block_concreto_15x20x40',
  'cemento_gris_bulto_50kg',
  'mortero_tonelada',
  'arena_grava_carro',
  'alambre_recocido_kg',
  'alambron_kg',
];

/** Zones offered in the UI. `null` key = Querétaro average market value. */
export function zonasDisponibles(costosM2) {
  const label = { juriquilla: 'Juriquilla', zibata: 'Zibatá', milenio_iii: 'Milenio III' };
  return [
    ...Object.entries(costosM2.por_zona_2025).map(([k, z]) => ({
      key: k, label: z.label ?? label[k] ?? k, grupo: z.grupo ?? 'metro', direccional: !!z.direccional,
    })),
    { key: 'promedio', label: 'Otra zona (promedio estatal)', grupo: 'otra' },
  ];
}

/**
 * Verified construction cost per m² for a tipo + acabados.
 * Returns { valor, min, max, fuente, tier, avisos: [{nivel, texto}] }.
 */
export function costoObjetivoM2(costosM2, tipo, acabados) {
  const t = TIPOS_OBRA[tipo];
  if (!t) throw new Error(`Tipo de obra desconocido: ${tipo}`);
  if (!ACABADOS[acabados]) throw new Error(`Nivel de acabados desconocido: ${acabados}`);
  const tier = costosM2._meta.tier;
  const avisos = [];

  if (t.referencia === 'nave') {
    const n = costosM2.nave_industrial_estructura_mano_obra_m2;
    const valor = { economico: n.min, medio: (n.min + n.max) / 2, residencial: n.max }[acabados];
    avisos.push({
      nivel: 'warn',
      texto: 'La referencia verificada para nave industrial cubre solo estructura y mano de obra ($2,000–3,200/m²). Instalaciones, pisos industriales y acabados no están incluidos en ese costo: el total subestima una nave terminada.',
    });
    return { valor, min: n.min, max: n.max, fuente: 'Referencia nave industrial (estructura + mano de obra)', tier, avisos };
  }

  const r = costosM2.costo_construccion_m2.residencial_promedio;
  const valor = { economico: r.min, medio: r.valor, residencial: r.max }[acabados];
  if (t.sinReferencia) {
    avisos.push({
      nivel: 'danger',
      texto: `No hay costo/m² verificado para "${t.label}". Se usa la referencia residencial de ${r.fuente} como aproximación (Tier 3). Valide con cotizaciones antes de presentar.`,
    });
  }
  return { valor, min: r.min, max: r.max, fuente: `${r.fuente} (costo de construcción residencial)`, tier, avisos };
}

/** Market value per m² for the zone (NOT construction cost). */
export function valorMercadoZona(costosM2, zona) {
  const z = costosM2.por_zona_2025[zona];
  if (z) return { min: z.min, max: z.max, medio: (z.min + z.max) / 2, fuente: z.fuente ?? 'Rango por zona 2025', direccional: !!z.direccional };
  const p = costosM2.valor_mercado_m2.promedio_2025;
  return { min: null, max: null, medio: p, fuente: costosM2.valor_mercado_m2.fuente };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Price a scope.
 * @param {object} args
 * @param {{tipo:string, acabados:string, zona:string, superficie:number, niveles:number}} args.params
 * @param {{partidas:Array<{categoria:string, descripcion:string, unidad:string, cantidad:number, tipo:'suministro'|'parametrica', material_clave:string|null, peso:number}>}} args.scope
 * @param {object} args.precios   precios_materiales_2026.json
 * @param {object} args.costosM2  costos_m2_queretaro.json
 * @param {number} args.ivaPct    IVA percentage (from fianzas_retenciones.json → iva)
 */
export function calcularPresupuesto({ params, scope, precios, costosM2, ivaPct }) {
  const superficie = Number(params.superficie);
  if (!(superficie > 0)) throw new Error('La superficie debe ser mayor a 0');
  if (!(ivaPct >= 0)) throw new Error('IVA inválido');

  const objetivo = costoObjetivoM2(costosM2, params.tipo, params.acabados);
  const avisos = [...objetivo.avisos];
  const totalObjetivo = superficie * objetivo.valor;

  // 1) Normalize lines; supply lines must reference a verified material.
  const lineas = scope.partidas.map((p, i) => {
    const categoria = CATEGORIAS[p.categoria] ? p.categoria : 'preliminares';
    let cantidad = Number(p.cantidad);
    let unidad = String(p.unidad || '').trim() || 'lote';
    if (!(cantidad > 0) || !Number.isFinite(cantidad)) { cantidad = 1; unidad = 'lote'; }
    const base = { n: i + 1, categoria, descripcion: String(p.descripcion || '').trim(), unidad, cantidad };

    if (p.tipo === 'suministro') {
      const entry = MATERIALES_SUMINISTRO.includes(p.material_clave) ? precios[p.material_clave] : null;
      const pu = priceOf(entry);
      if (pu != null) {
        return { ...base, origen: 'verificado', material_clave: p.material_clave, unidad: entry.unidad, pu: round2(pu), rango: entry };
      }
      avisos.push({ nivel: 'warn', texto: `"${base.descripcion}" no corresponde a un material verificado; se valuó como partida paramétrica.` });
    }
    return { ...base, origen: 'parametrico', peso: Math.max(Number(p.peso) || 0, 0) };
  });

  // 2) Verified supply lines.
  let totalVerificado = 0;
  for (const l of lineas.filter((x) => x.origen === 'verificado')) {
    l.importe = round2(l.cantidad * l.pu);
    totalVerificado += l.importe;
  }

  // 3) Distribute the remainder of the verified cost/m² by weight.
  const parametricas = lineas.filter((x) => x.origen === 'parametrico');
  let remanente = totalObjetivo - totalVerificado;
  if (remanente < 0) {
    avisos.push({
      nivel: 'danger',
      texto: `Los suministros verificados (${Math.round(totalVerificado).toLocaleString('es-MX')}) superan el costo objetivo de la obra. Revise las cantidades de material.`,
    });
    remanente = 0;
  }
  const sumaPesos = parametricas.reduce((s, l) => s + l.peso, 0);
  for (const l of parametricas) {
    const share = sumaPesos > 0 ? l.peso / sumaPesos : 1 / parametricas.length;
    l.pu = round2((remanente * share) / l.cantidad);
    l.importe = round2(l.cantidad * l.pu);
  }

  // 4) Group by chapter in the fixed order.
  const capitulos = Object.entries(CATEGORIAS)
    .map(([key, label]) => {
      const items = lineas.filter((l) => l.categoria === key);
      return { key, label, items, importe: round2(items.reduce((s, l) => s + l.importe, 0)) };
    })
    .filter((c) => c.items.length > 0);

  const subtotal = round2(lineas.reduce((s, l) => s + l.importe, 0));
  const iva = round2(subtotal * ivaPct / 100);
  const total = round2(subtotal + iva);
  const costoM2 = subtotal / superficie;
  const mercado = valorMercadoZona(costosM2, params.zona);

  if (lineas.length < 30) {
    avisos.push({ nivel: 'warn', texto: `El alcance tiene ${lineas.length} partidas (se esperan 30 o más). Considere regenerar.` });
  }
  const categoriasFaltantes = Object.keys(CATEGORIAS).filter((k) => !capitulos.some((c) => c.key === k));

  return {
    params: { ...params, superficie },
    objetivo: { ...objetivo, total: round2(totalObjetivo) },
    capitulos,
    lineas,
    totales: {
      verificado: round2(totalVerificado),
      parametrico: round2(subtotal - totalVerificado),
      subtotal, ivaPct, iva, total,
      costoM2: round2(costoM2),
      costoM2ConIva: round2(total / superficie),
    },
    comparacion: {
      mercado,
      // Market value minus construction cost: a rough indicator of land + margin, not a profit figure.
      diferenciaM2: round2(mercado.medio - costoM2),
      ratio: mercado.medio > 0 ? costoM2 / mercado.medio : null,
    },
    categoriasFaltantes,
    avisos,
  };
}
