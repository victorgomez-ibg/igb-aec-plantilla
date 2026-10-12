# Kit IGB AEC · plantilla del curso IGB-AEC-101

Herramientas web con IA para arquitectos, ingenieros y despachos de construcción.
Esta plantilla es tu punto de partida: haz **Use this template** en GitHub, crea tu repo
(privado) y agrega tu propia herramienta 06.

## Qué incluye

| # | Herramienta | Carpeta |
|---|---|---|
| 01 | Presupuestador paramétrico | `tools/01-presupuestador` |
| 02 | Visualizador: planta + render de fachada | `tools/02-visualizador` |
| 03 | Generador de propuestas comerciales | `tools/03-propuestas` |
| 04 | Contenido de autoridad | `tools/04-contenido` |
| 05 | Factibilidad del predio (COS/CUS) | `tools/05-factibilidad` |
| 06 | **Tu herramienta** (hueco listo) | `tools/06-…` |

```
index.html   portada: redirige al launcher (demo/)
demo/        launcher con las tarjetas de las herramientas
tools/       una carpeta por herramienta, cada una con su index.html
shared/      tema, clientes de IA, cálculo, exportación PDF/Excel, librerías
data/        datos técnicos en JSON (ver data/SOURCES.md)
CLAUDE.md    contexto para Claude Code (quién eres, reglas del kit)
.claude/     settings.json con permisos: bloquea push --force, reset --hard y rm -rf
```

Sin build, sin dependencias: HTML + módulos ES. Las librerías ya están en `shared/vendor/`.

## Abrir en local

Las páginas usan módulos ES y `fetch()`, así que deben servirse por HTTP (no con `file://`):

```bash
python3 -m http.server 8700
# abre http://localhost:8700/
```

## Claves de API

Se pegan **solo** en **⚙ Ajustes** dentro de la herramienta y se guardan en el
`localStorage` de tu navegador. Nunca las escribas en archivos del repo.

- **Anthropic (Claude):** campo disponible en Ajustes de todas las herramientas.
- **Google Gemini:** el campo aparece **solo en Ajustes de las herramientas 02 (Visualizador) y 04 (Contenido)**, que son las que generan imágenes.

El `.gitignore` excluye `.env`, `*.pem` y `node_modules/` por si acaso.

## Publicar en Netlify

1. Sube tu repo a GitHub (privado).
2. En Netlify: **Add new site → Import from Git** y elige tu repo.
3. **Build command:** vacío. **Publish directory:** `.` (la raíz del repo).
4. Deploy. Al abrir la URL, `index.html` te lleva al launcher.

## Cómo agregar la tarjeta 06

1. Crea `tools/06-mi-herramienta/index.html`. Sigue el patrón de `tools/05-factibilidad/index.html`
   (usa `../../shared/...` para el tema, `ui-components.js` y, si llamas a la IA, `claude-client.js`).
2. En `demo/index.html`, busca el bloque comentado «HUECO PARA LA HERRAMIENTA 06» dentro de `TOOLS`,
   descomenta la entrada y ajusta `title`, `url`, `desc` y `hook`.
3. El ícono ya existe: `shared/js/icons.js` trae `'06'` (recuadro punteado con «+»). Puedes cambiar su trazo
   conservando el estilo (dorado, 1.5 px, extremos redondeados).
4. Recarga el launcher: la tarjeta 06 aparece y la tecla `6` la abre.

## Actualizar datos

Edita el JSON de `data/`, actualiza `_meta.fecha` y la entrada correspondiente en `data/SOURCES.md`.

## Importante

Los presupuestos y resultados son **paramétricos y de referencia**; las imágenes son conceptuales.
Nada sustituye la validación del responsable del proyecto (DRO, perito, etc.).
