// Run: node --test shared/js/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularPresupuesto, costoObjetivoM2, valorMercadoZona } from './calculo.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url)));
const precios = load('precios_materiales_2026.json');
const costosM2 = load('costos_m2_queretaro.json');
const ivaPct = load('fianzas_retenciones.json').iva;

const params = { tipo: 'casa_habitacion', acabados: 'medio', zona: 'juriquilla', superficie: 150, niveles: 2 };
const scope = {
  partidas: [
    { categoria: 'estructura', descripcion: 'Suministro concreto', unidad: 'm3', cantidad: 40, tipo: 'suministro', material_clave: 'concreto_premezclado_m3_qro', peso: 0 },
    { categoria: 'estructura', descripcion: 'Suministro acero', unidad: 'kg', cantidad: 3000, tipo: 'suministro', material_clave: 'acero_refuerzo_kg_qro', peso: 0 },
    { categoria: 'pintura', descripcion: 'Pintura vinílica', unidad: 'm2', cantidad: 500, tipo: 'parametrica', material_clave: null, peso: 1 },
    { categoria: 'limpieza', descripcion: 'Limpieza final', unidad: 'lote', cantidad: 1, tipo: 'parametrica', material_clave: null, peso: 3 },
  ],
};

test('target cost uses construction cost, never market value', () => {
  assert.equal(costoObjetivoM2(costosM2, 'casa_habitacion', 'economico').valor, 9500);
  assert.equal(costoObjetivoM2(costosM2, 'casa_habitacion', 'medio').valor, 12800);
  assert.equal(costoObjetivoM2(costosM2, 'casa_habitacion', 'residencial').valor, 18500);
  assert.equal(costoObjetivoM2(costosM2, 'nave_industrial', 'medio').valor, 2600);
});

test('types without a verified reference carry a danger warning', () => {
  const r = costoObjetivoM2(costosM2, 'oficinas', 'medio');
  assert.ok(r.avisos.some((a) => a.nivel === 'danger'));
});

test('verified lines use the midpoint price; subtotal lands on the verified cost/m²', () => {
  const r = calcularPresupuesto({ params, scope, precios, costosM2, ivaPct });
  const concreto = r.lineas[0];
  assert.equal(concreto.origen, 'verificado');
  assert.equal(concreto.pu, 2300);
  assert.equal(r.lineas[1].pu, 22);
  assert.ok(Math.abs(r.totales.subtotal - 150 * 12800) < 1, `subtotal ${r.totales.subtotal}`);
  assert.equal(r.totales.iva, Math.round(r.totales.subtotal * 16) / 100);
  // weights 1:3 on the remainder
  const rem = 150 * 12800 - (40 * 2300 + 3000 * 22);
  assert.ok(Math.abs(r.lineas[3].importe - rem * 0.75) < 1);
});

test('unknown material keys are demoted to parametric with a warning', () => {
  const bad = { partidas: [{ ...scope.partidas[0], material_clave: 'cemento_tonelada' }, scope.partidas[2]] };
  const r = calcularPresupuesto({ params, scope: bad, precios, costosM2, ivaPct });
  assert.equal(r.lineas[0].origen, 'parametrico');
  assert.ok(r.avisos.some((a) => a.texto.includes('no corresponde')));
});

test('zone comparison is market value', () => {
  assert.equal(valorMercadoZona(costosM2, 'juriquilla').medio, 30000);
  assert.equal(valorMercadoZona(costosM2, 'promedio').medio, 24724);
});

test('supplies above the target are flagged, never negative', () => {
  const huge = { partidas: [{ ...scope.partidas[0], cantidad: 5000 }, scope.partidas[2]] };
  const r = calcularPresupuesto({ params, scope: huge, precios, costosM2, ivaPct });
  assert.ok(r.lineas[1].importe === 0);
  assert.ok(r.avisos.some((a) => a.nivel === 'danger'));
});
