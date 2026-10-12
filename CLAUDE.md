# Kit IGB AEC: instrucciones para Claude Code

## Con quién trabajas
- El usuario es **arquitecto o ingeniero, no programador**. Responde en **español claro**, sin jerga
  (si usas un término técnico, explícalo en una línea).
- **Explica qué vas a hacer y por qué antes de actuar.** Un cambio a la vez.
- Después de cada cambio, pide al usuario que lo revise en el navegador recargando sin caché:
  **Ctrl+F5** (Windows) o **Cmd+Mayús+R** (Mac).

## Qué es este proyecto
- Sitio **estático**: HTML, CSS y JavaScript con módulos ES. **Sin backend, sin build, sin npm install.**
- Estructura: `index.html` (portada que lleva a `demo/`), `demo/index.html` (launcher con las tarjetas),
  `tools/01-…` a `tools/05-…` (una carpeta por herramienta), `shared/` (tema, clientes de IA, cálculo,
  librerías en `shared/vendor/`), `data/` (datos técnicos verificados + `data/SOURCES.md`).

## Cómo se abre en local
- Desde la **raíz** del repo:
  - Mac: `python3 -m http.server 8700`
  - Windows: `python -m http.server 8700`
- Luego abrir `http://localhost:8700/`. No funciona abriendo el archivo con doble clic (`file://`).
- Si el puerto 8700 está ocupado, **avisa al usuario antes de cambiarlo**: otro puerto es otro "origen"
  para el navegador y las claves guardadas en ⚙ Ajustes no aparecerán (habrá que pegarlas de nuevo).

## Claves de API (regla absoluta)
- Las claves viven **solo** en **⚙ Ajustes** del kit (se guardan en el `localStorage` del navegador).
- **Nunca** en archivos, `.env`, commits, capturas ni mensajes. Si el usuario pega una clave en el chat,
  no la repitas ni la escribas en ningún archivo, y recomiéndale rotarla.

## Lo que no se toca sin permiso
- `data/` (precios, normativa, UMA…) y las fórmulas o cálculos: `shared/js/calculo.js`,
  `DEFAULTS` de `tools/05-factibilidad/index.html` y cualquier lógica que produzca cifras.
- Para cambiarlos: pide **permiso explícito** y explica antes **qué cifras cambian y dónde se nota**.

## Git: deshacer sin romper
- Para deshacer: `git revert <commit>` o restaurar el archivo (`git restore <archivo>`).
- **Nunca** `git push --force`, `git reset --hard` ni reescribir historial (rebase, amend de algo ya subido).
- **Antes de cada commit**: muestra la lista de archivos (`git status`) y confirma que no hay claves
  ni datos de clientes. Mensajes de commit en español y claros.

## Caso de estudio
- La carpeta `caso-estudio` (planos, fotos y datos del cliente) vive **fuera de este repo**.
  No la copies ni la muevas dentro, y no subas sus archivos.

## Agregar una herramienta nueva (06)
1. Crear `tools/06-<nombre>/index.html` siguiendo el patrón de `tools/05-factibilidad/index.html`
   (rutas `../../shared/...`, `appHeader`, tema `aec-theme.css`).
2. En `demo/index.html`, descomentar el bloque **«HUECO PARA LA HERRAMIENTA 06»** dentro de `TOOLS`
   y ajustar `title`, `url`, `desc` y `hook`.
3. El ícono `'06'` ya existe en `shared/js/icons.js`.
4. Si la herramienta usa Gemini, abrir Ajustes con `openSettings({ gemini: true })` (como 02 y 04).

## Resultados
- Todo lo que genera el kit es **de referencia**. Nada sustituye la validación del responsable del proyecto.
