---
name: mi-despacho
description: Personaliza el kit con los datos del despacho del participante — nombre, ciudad, especialidad, tipo de proyectos, colores de marca, logo y tono de las propuestas. Hace una entrevista breve y luego actualiza la sección «Mi despacho» de CLAUDE.md, los colores de shared/css/aec-theme.css y, si lo dan, el logo. Úsala cuando el usuario quiera personalizar, poner su marca, sus colores, su logo o los datos de su despacho en el kit.
---

# Mi despacho: personalizar el kit

Vas a dejar el kit con la identidad del participante. Es arquitecto o ingeniero, **no programa**:
habla en español de México, claro y directo, y explica cada cambio en una línea antes de hacerlo.

## Reglas que no se rompen

- **Nunca pidas ni guardes claves de API.** Si el participante pega una, no la repitas, no la escribas
  en ningún archivo y dile que la rote; las claves van solo en ⚙ Ajustes del kit.
- **Nunca pidas ni guardes datos personales de clientes** (nombres de clientes, teléfonos, correos,
  direcciones de obras). Solo datos públicos del despacho.
- No toques `data/`, `shared/js/calculo.js` ni nada que produzca cifras.
- No inventes datos del despacho (premios, años de experiencia, obras). Si no lo dijo, no se escribe.

## 1. Entrevista breve

Pregunta en **un solo mensaje**, numerado, y aclara que puede responder solo lo que quiera
(lo que deje en blanco se queda como está):

1. Nombre del despacho o tu nombre profesional.
2. Ciudad o región donde trabajas.
3. Especialidad: arquitectura, estructuras, instalaciones, construcción, interiorismo, urbanismo, otra.
4. Tipo de proyectos que haces más (p. ej. casa habitación, remodelaciones, naves industriales, locales).
5. Colores de marca: 1 o 2 colores en código HEX (`#1F4E79`). Si no los sabes, descríbelos
   («azul marino y gris») y te propongo códigos.
6. Logo: ruta del archivo en tu computadora (de preferencia PNG cuadrado). Opcional.
7. Tono de tus propuestas: formal, cercano, técnico, breve…

Espera la respuesta. Si algo es ambiguo, pregunta una sola vez.

## 2. Sección «Mi despacho» en CLAUDE.md

En `CLAUDE.md`, crea o reemplaza **solo** la sección `## Mi despacho` (si ya existe, sustituye su
contenido; si no, agrégala justo después de la sección «Con quién trabajas»). Formato:

```markdown
## Mi despacho
- **Nombre:** …
- **Ciudad:** …
- **Especialidad:** …
- **Proyectos típicos:** …
- **Colores de marca:** principal `#……`, secundario `#……`
- **Tono de las propuestas:** …
- Usa estos datos como predeterminados al redactar textos (propuestas, contenido, ejemplos).
```

Omite las líneas de lo que no respondió. No cambies ninguna otra sección de CLAUDE.md.

## 3. Colores en shared/css/aec-theme.css

Cambia **solo** variables dentro del primer bloque `:root { … }`. No toques reglas, selectores ni
el `@media print`.

- Color principal → `--gold` (es el acento de todo el kit). Calcula `--gold-bright` (el mismo
  color ~15 % más claro) y `--gold-deep` (~20 % más oscuro).
- Actualiza también los derivados que usan el acento en `rgba(...)`: `--line`, `--line-strong` y
  `--accent-wash`, conservando su transparencia original (.16, .38 y .09) con el RGB del nuevo color.
- Color secundario (si lo dio) → fondos: `--navy` (y ajusta `--navy-2`, `--navy-3`, `--panel-solid`
  en la misma familia, ligeramente más claros). Si no lo dio, deja los fondos como están.
- **Contraste:** el tema es oscuro. Si el color principal es muy oscuro (texto ilegible sobre azul
  marino), dilo y propón una versión más clara para el acento; no la apliques sin su OK.
- Antes de editar, anota los valores anteriores para mostrarlos al final.

Aviso: algunos íconos y la cuadrícula de fondo tienen el dorado escrito directo (`#e6c169` o
`rgba(230, 193, 105, …)`) fuera de las variables. No los cambies en esta skill; si el participante
nota que algo sigue dorado, explícale que es un detalle aparte y ofrece revisarlo después.

## 4. Logo (solo si dio la ruta)

Todo el kit apunta a `shared/img/logo_igb.png` (ícono de pestaña y `LOGO_URL`). Para no editar
muchos archivos, **sustituye ese archivo conservando el nombre**:

1. Verifica que el archivo existe (`ls "<ruta>"`). Si no existe, dilo y salta este paso.
2. Si es PNG: `cp "<ruta>" shared/img/logo_igb.png`.
3. Si es JPG, WEBP u otro formato de imagen y estás en Mac: `sips -s format png "<ruta>" --out shared/img/logo_igb.png`.
   En Windows o si es SVG/PDF: pídele que lo exporte como PNG y vuelva a darte la ruta.
4. No copies el logo a otra ruta ni subas carpetas de su computadora.

## 5. Mostrar qué cambió

Al final:

- Corre `git diff --stat` y `git diff CLAUDE.md shared/css/aec-theme.css` y resume en una tabla
  corta: archivo → qué cambió (valor anterior → valor nuevo en los colores).
- Pide que lo revise: `python3 -m http.server 8700` (Windows: `python -m http.server 8700`),
  abrir `http://localhost:8700/` y recargar sin caché (**Ctrl + F5** (Windows) o **Comando + Mayús + R** (Mac)).
- Explica cómo deshacer: `git restore <archivo>` antes de confirmar.
- **No hagas commit.** Si quiere guardarlo y publicarlo, que use `/publicar`.
