# data/SOURCES.md — Origin of every number

This folder is the value layer of the suite. **Every number the tools show comes from
these files, and every number in these files is documented here.** If you change a
value, update this document in the same commit.

- Research cut-off for the initial load: **2026-09** (loaded 2026-09-12).
- Values were loaded **verbatim** from IGB's research brief. Nothing was added,
  rounded or "corrected" when they were loaded.

## Tier system

| Tier | Meaning | Refresh |
|---|---|---|
| **1** | Authoritative: law, DOF, official norm catalog, INEGI | When the law/norm changes. Otherwise review once a year. |
| **2** | Directional market data: industry press, real-estate portals, consultancies | **Quarterly** |
| **3** | Adapted practice with no Mexican standard (templates, parametric weights) | Clearly labeled as "adaptación" in the UI |

## Global warnings

> ⚠️ **Material prices move with steel and copper prices and with US–Mexico tariffs.**
> Rebar, wire rod and insulated cable can move by double digits in one quarter
> (insulated cable rose 17.49% in 2025). The UI shows a **"Precios desactualizados"**
> banner when a Tier 2 file's `_meta.fecha` is more than one quarter old
> (`shared/js/data.js → isStale()`). Don't hide the banner; refresh the data.

> ⚠️ **Querétaro daily wage gap.** Querétaro-specific daily wages (albañil,
> electricista, plomero, herrero, ayudante…) are **not available from free sources**.
> They need a BIMSA / Neodata / OPUS license or the CMIC Querétaro tabuladores.
> Until then, **no tool may show a daily wage or a labor P.U. as if it were verified.**
> The Presupuestador folds labor into the parametric remainder, which comes from the
> verified cost/m² (see "Parametric weights" below).

> ⚠️ **Bond (fianza) percentages vary by convocatoria.** The 10% / 10% / 30% figures in
> `fianzas_retenciones.json` are the usual LOPSRM defaults. Each call for bids and contract
> can set other values. Tools must say "verifique en la convocatoria / contrato".

---

## precios_materiales_2026.json — Tier 2

| Field | Value | Source | Notes |
|---|---|---|---|
| `cemento_gris_bulto_50kg` | $240–280 / bulto | CEICO-CMIC/INEGI via Construction Supply Magazine, Jul-2026 | |
| `cemento_tonelada` | $3,650–4,000 / ton | same | |
| `mortero_tonelada` | $3,300 / ton | same | |
| `varilla_corrugada_ton` | $17,500–21,000 / ton | same | 3/8" ≈ 150 pzas/ton. **Steel-sensitive.** |
| `alambre_recocido_kg` | $33 / kg | same | Steel-sensitive |
| `alambron_kg` | $25 / kg | same | Steel-sensitive |
| `arena_grava_carro` | $2,400 / carro (~7 m³) | same | Local aggregates; varies by bank distance |
| `block_concreto_15x20x40` | $10–13 / pza | same | |
| `concreto_premezclado_m3_qro` | $2,100–2,500 / m³ | same (Querétaro) | Resistance (f'c) not specified in the source — assume the common f'c=250; validate |
| `acero_refuerzo_kg_qro` | $20–24 / kg | same (Querétaro) | Local retail; above the national ton price ÷ 1000 |
| `_inflacion_2025.*` | 4.28% materials, 17.49% insulated cable, 5.98% labor, 4.52% housing cost | same | Annual 2025 inflation; context only, not used in calculations |

- **Refresh:** quarterly (next: **2026-10**, when the file turns > 1 quarter old).
- **Re-check triggers:** steel or copper price moves > 10%; new US tariffs on steel/aluminum
  or changes to Mexico's import tariffs; a new CMIC/INEGI construction price index release.
- **How the tools use it:** P.U. = **midpoint** of the range (single-value fields as-is),
  and the range is shown in the tooltip. Prices are **material only (suministro)** —
  they don't include labor, waste or indirect costs.

## costos_m2_queretaro.json — Tier 2

| Field | Value | Source | Meaning |
|---|---|---|---|
| `valor_mercado_m2.promedio_2025` | $24,724 / m² | INBAPREVI Banorte | **Market value** (sale price), NOT construction cost |
| `valor_mercado_m2.zonas_consolidadas` | $29,000–35,000 / m² | INBAPREVI Banorte | Market value, consolidated zones |
| `costo_construccion_m2.residencial_promedio` | $12,800 (range 9,500–18,500) | DatAlpine | **Construction cost** |
| `costo_construccion_m2.custom_builder` | $15,000–20,000 | Didomani | Construction cost, custom builder |
| `costo_construccion_m2.factor_interciudades_vs_cdmx` | 0.975 | not specified | Querétaro vs CDMX cost factor. **Not used** (our references are already Querétaro figures) |
| `por_zona_2025.juriquilla` | $25,000–35,000 | not specified | Interpreted as **market value** (magnitude matches INBAPREVI, ~2× construction cost) |
| `por_zona_2025.zibata` | $20,000–28,000 | not specified | same |
| `por_zona_2025.milenio_iii` | $22,000–30,000 | not specified | same |
| `por_zona_2025.el_refugio` | $18,000–28,000 | Pincali listings (3 flats, Sep-2026, ~$18.5k–34k/m²) + Plaza de Armas horizontal range $15k–25k | **Tier 3 — directional, not official.** Market value |
| `por_zona_2025.centro_historico` | $15,000–25,000 | Plaza de Armas statewide horizontal-housing range (no zone-specific figure found) | Tier 3 — directional, not official |
| `por_zona_2025.colon` | $9,000–13,000 | propiedades.com median $11,052/m² built, houses for sale in Colón (Sep-2026), ±~20% | Tier 3 — directional, not official |
| `por_zona_2025.tequisquiapan` | $9,000–16,000 | Two Mercado Libre listings (~$8.4k, ~$18.3k/m²) + Colón median | Tier 3 — directional, very dispersed |
| `por_zona_2025.{cadereyta, ezequiel_montes, bernal, penamiller}` | $9,000–13,000 | **Proxy:** Colón median (semidesierto region). No municipality-specific figure found | Tier 3 — directional, not official. Bernal (tourist town) may be higher |
| `nave_industrial_estructura_mano_obra_m2` | $2,000–3,200 | not specified | **Structure + labor only** — excludes instalaciones, acabados, pisos industriales |

- **CRITICAL:** market value ≠ construction cost. The Presupuestador prices with
  `costo_construccion_m2` only. It compares against the zone's market value, and
  the UI labels it that way.
- **Open questions (confirm with the course instructor):**
  1. `por_zona_2025` metro zones (Juriquilla, Zibatá, Milenio III) have no source. We read them as market value; confirm.
     Zones marked `direccional: true` (added 2026-09-29 for the semidesierto course example) are Tier 3 directional
     references with the source noted per zone; the UI labels them "referencia direccional, no oficial".
     In the semidesierto, market value can fall BELOW new-build cost; the UI says so instead of showing a negative margin.
  2. `_meta` has no capture date, so the staleness banner can't be computed. Data is 2025.
  3. Whether the DatAlpine cost/m² includes IVA isn't documented. The tool treats it
     as **before IVA** and adds 16%.
  4. The nave industrial range has no source.
- **Refresh:** quarterly. **Re-check triggers:** new INBAPREVI release; DatAlpine update;
  construction inflation > 5% y/y.

## nom_001_sede_2012.json — Tier 1

| Item | Value | Source |
|---|---|---|
| Version in force | **NOM-001-SEDE-2012** | Catálogo Nacional de Normas, Secretaría de Economía (platiica.economia.gob.mx) |
| DOF publication | 2012-11-29 | same |
| In force since | 2013-05-29 | same |
| Replaces | NOM-001-SEDE-2005 | same |
| Systematic review | 2023-07-24 recommended "Modificación"; no successor published | same |
| Articles 100, 200, 210, 220, 250, Cap. 3, 517, 690 | Topic index | NOM text |
| Residential wire gauges, circuits, receptacles | #12 AWG lighting, #10 AWG 20 A receptacles (as captured), ≥2 × 20 A small-appliance circuits, grounding-type receptacles, >1.70 m not counted | NOM text (Art. 210) |
| UVIE requirements + document checklist | EMA + SENER; independent of the design; CFE supplies power only after certification | NOM / LIE / SENER |

- ⚠️ **NOM-001-SEDE-2018 is NOT in force** (PROY only). **NOM-001-SEDE-2022 does NOT exist.**
  Any source that says otherwise is wrong. Tools must never cite them.
- **Re-check before relying on gauges in Tool 05:** the brief lists `#10 AWG` for 20 A
  receptacle circuits. Under Art. 240-4(d) (small-conductor rule, copied from NEC), 20 A
  allows #12 AWG copper. Validate against the NOM text before Phase 2 uses this field.
- **Refresh:** check the Catálogo Nacional de Normas every 6 months.
- **Re-check trigger:** a DOF publication of a new NOM-001-SEDE, or a PROY entering public consultation.

## normativa_estructural_qro.json — Tier 1

| Item | Value | Source |
|---|---|---|
| Seismic zone | **B (moderada)** | Manual de Obras Civiles CFE – Diseño por Sismo 2015; UAQ thesis RI003998 |
| Applicable standard | MOC CFE (Sismo/Viento) + PRODISIS; supletorio NTC RCDF (CDMX) + ACI | Professional practice in Querétaro; municipal regulation |
| CICQ manuals | In development, **not formally adopted** | CICQ (as of the research cut-off) |
| Municipal regulation | Title VII, Art. 118 (seguridad estructural), Arts. 120/121/151 (coeficiente sísmico), ramps ≤ 8%, wind return periods 50/200 years, minimum dwelling, Art. 291 (DRO) | Reglamento de Construcción para el Municipio de Querétaro (URL in the JSON) |
| DRO requirements, type A, signed documents, co-responsible roles | see JSON | Same regulation + Colegio practice |
| Structural assessment (dictamen) sections | 8 sections | Professional practice (Tier 1/3 mix: structure is practice, not a formal standard) |

- ⚠️ **Querétaro has NO NTC of its own.** Don't cite "NTC Querétaro".
- ⚠️ Applies to the **Municipio de Querétaro** only. Corregidora, El Marqués and San Juan del Río
  have separate regulations.
- **Refresh:** yearly. **Re-check triggers:** CICQ manuals adopted as NTC; a reform of the
  municipal regulation; a new edition of the MOC CFE.

## fianzas_retenciones.json — Tier 1

| Item | Value | Source |
|---|---|---|
| Performance bond (cumplimiento) | 10% of the contract amount | LOPSRM / usual practice |
| Hidden-defects bond (vicios ocultos) | 10% of the amount paid, ≥ 12 months from physical handover | LOPSRM Art. 66 |
| Advance-payment bond (anticipo) | 30% (tracks the % of advance; some sources cite up to 50%) | LOPSRM / HELIOS-CMIC |
| Performance-bond deadline | 15 calendar days from notice of the award | LOPSRM |
| 5 al millar | 0.5% per estimate — inspection/oversight (SFP) | Ley Federal de Derechos Art. 191 |
| 2 al millar | 0.2% per estimate — ICIC training | CMIC agreement |
| IVA | 16% | LIVA |
| 2025 reforms | 2025-04-16 and 2025-11-14; Compras.mx replaces CompraNet; BESOP/BEOP still mandatory | DOF |

- ⚠️ **Percentages vary by convocatoria/contrato.** They are defaults, not fixed values.
- ⚠️ The **2 al millar** applies only when the contractor is a CMIC member / under the agreement.
  Confirm case by case.
- **Refresh:** yearly, and whenever LOPSRM or its regulation is reformed.
- **Re-check triggers:** a DOF reform of LOPSRM/RLOPSRM or the Ley Federal de Derechos;
  new SAT CFDI complement rules.

## uma_salarios.json — Tier 1

| Item | Value | Source |
|---|---|---|
| UMA 2025 | $113.14 daily / $3,439.46 monthly / $41,273.52 yearly; valid 2025-02-01 → 2026-01-31; +4.21% | INEGI Comunicado 1/25, DOF |
| UMA 2026 | $117.31 daily | INEGI Comunicado 1/26, DOF |
| FASAR | Based on the tabulated base wage Sn | RLOPSRM Art. 190 |
| Labor hierarchy | Maestro de obra, oficial, ayudante, peón, cabo | Practice |

- UMA 2026 monthly/yearly are **not loaded**. INEGI computes monthly = daily × 30.4 and
  yearly = monthly × 12. Load the official figures from Comunicado 1/26 rather than
  computing them in code.
- The UMA takes effect on **February 1** each year. **Refresh:** every January (new INEGI release).
- ⚠️ **Querétaro wage gap** — see the global warnings above.

## Parametric weights (Tier 3, generated at runtime)

The Presupuestador has verified material prices and a verified total cost/m², but no
verified unit price for each partida (painting, carpentry, installations…). So:

1. The target total = superficie × verified cost/m².
2. Material supply lines use verified P.U.s.
3. Claude assigns each remaining partida a **relative weight**. The remainder of the
   target total is distributed by those weights.

These weights are **Tier 3**. They are shown as "P.U. paramétrico" in the table and
the PDF. They are **not** market unit prices. Replacing them with a licensed price book
(BIMSA/Neodata/OPUS) is the path to Tier 2 partida prices.
