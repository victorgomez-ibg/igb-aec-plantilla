---
name: nueva-herramienta
description: Crea una herramienta nueva del kit en tools/NN-nombre/ con la misma estructura y convenciones que las existentes (index.html, prompt.js si usa IA, tema y componentes de shared/) y la agrega como tarjeta en el launcher. Antes pregunta qué problema resuelve. Úsala cuando el usuario quiera agregar, crear o construir una herramienta, calculadora o tarjeta nueva (la 06, 07…).
---

# Nueva herramienta del kit

El participante es arquitecto o ingeniero y **no programa**. Explica en español de México, sin jerga,
qué vas a hacer antes de hacerlo, y avanza un paso a la vez. Sigue todas las reglas de `CLAUDE.md`.

## 1. Primero, el problema (no escribas código todavía)

Pregunta en un solo mensaje:

1. ¿Qué problema de tu trabajo resuelve? (Un ejemplo real, sin datos de clientes.)
2. ¿Qué datos le das tú? (entradas: m², tipo de obra, un texto, una foto…)
3. ¿Qué te entrega? (salida: una cifra, una tabla, un texto, un PDF…)
4. ¿Necesita IA (Claude para texto, Gemini para imágenes) o es solo cálculo?
5. ¿Usa números técnicos o de mercado (precios, normas, coeficientes)? ¿De qué fuente oficial?

Con las respuestas, propón en 5–8 líneas: nombre corto, carpeta `tools/NN-nombre/`, entradas,
salida, si usa IA y qué datos necesita. **Espera su OK** antes de crear archivos.

## 2. Número y carpeta

- `NN` = siguiente número libre en `tools/` (`ls tools`), con dos dígitos. Normalmente `06`.
- Nombre en minúsculas, sin acentos, con guiones: `tools/06-mi-herramienta/`.

## 3. Estructura (copia el patrón, no inventes uno nuevo)

Lee antes la herramienta más parecida y cópiale la forma:

- **Solo cálculo, sin IA:** `tools/05-factibilidad/index.html` (todo en el navegador, sin claves).
- **Texto con Claude:** `tools/03-propuestas/index.html` + `tools/03-propuestas/prompt.js`.
- **Imágenes con Gemini:** `tools/04-contenido/` o `tools/02-visualizador/`.

Archivos de la herramienta nueva:

- `index.html`:
  - `<html lang="es-MX">`, `<title>Nombre · IGB AEC Suite</title>`,
    `<link rel="icon" href="../../shared/img/logo_igb.png">`,
    `<link rel="stylesheet" href="../../shared/css/aec-theme.css">`.
  - `<div id="header"></div>` y `appHeader(document.getElementById('header'), { num: 'NN', title: '…' })`
    importado de `../../shared/js/ui-components.js` (revisa cómo lo llama la herramienta modelo).
  - Usa las clases del tema (`container`, `card`, `btn`, `stack`, `layout-sidebar`…) y las variables
    de color (`var(--accent)`, `var(--text)`…). No pongas colores fijos.
  - Script `type="module"`; importa solo de `../../shared/js/…` y `./prompt.js`. Nada de CDN ni npm:
    las librerías ya están en `shared/vendor/`.
  - Un aviso (`DISCLAIMER`) visible: el resultado es de referencia y lo valida el responsable del proyecto.
- `prompt.js` (solo si usa IA): `buildSystem()`, el esquema JSON y los textos fijos, **sin código de
  DOM**, como en `tools/03-propuestas/prompt.js`. En el prompt, prohíbe a la IA inventar cifras,
  normas, clientes u obras; **las cifras las calcula el código**, no el modelo.
- Claves: llama a la IA con `generateJSON` / `generateText` de `shared/js/claude-client.js` y abre
  Ajustes con `openSettings()` (o `openSettings({ gemini: true })` si genera imágenes). **Nunca** escribas
  una clave en un archivo.

## 4. Datos: nada inventado

- Todo número técnico o de mercado va en un JSON de `data/` con `_meta` (fuente, fecha, tier), como los
  existentes, y su entrada en `data/SOURCES.md` (de dónde sale, fecha de consulta, tier 1/2/3).
- Regístralo en `DATA_FILES` de `shared/js/data.js` y léelo con `loadData()`.
- **Si el participante no tiene la fuente, no pongas el número.** Deja el campo para que él lo capture
  en el formulario y dilo claramente. Nada de «valores típicos» sin fuente.
- No modifiques los JSON existentes de `data/` ni `shared/js/calculo.js` sin permiso explícito
  (ver CLAUDE.md). Agregar un archivo nuevo de datos también se le muestra y se le pide OK.

## 5. Tarjeta en el launcher

La portada `index.html` de la raíz solo redirige a `demo/`; las tarjetas viven en **`demo/index.html`**,
en el arreglo `TOOLS`:

- Si es la 06: descomenta el bloque «HUECO PARA LA HERRAMIENTA 06» y ajusta `title`, `url`, `desc`
  (`'Qué recibe → qué entrega.'`) y `hook` (frase corta de valor).
- Si es la 07 o posterior: agrega otra entrada igual después de la última. `shared/js/icons.js` solo trae
  ícono hasta `'06'`; para una nueva, agrega uno con el mismo estilo (trazo dorado 1.5 px, extremos
  redondeados) o deja la tarjeta sin ícono.
- Agrega la fila a la tabla «Qué incluye» del `README.md`.

## 6. Revisar con el participante

1. Si hay pruebas: `npm test` (corre `node --test shared/js/`). Si agregaste cálculo en `shared/js/`,
   agrega su `*.test.mjs` con casos verificados a mano.
2. Pide que lo abra: `python3 -m http.server 8700` (Windows: `python -m http.server 8700`) →
   `http://localhost:8700/`, que la tarjeta aparezca y que la herramienta funcione. Recargar sin caché:
   **Ctrl+F5** / **Cmd+Mayús+R**.
3. Muestra `git status` con la lista de archivos nuevos y modificados.
4. **No hagas commit** aquí. Para guardar y publicar, que use `/publicar`.
