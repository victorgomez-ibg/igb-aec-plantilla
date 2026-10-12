---
name: publicar
description: Revisa el kit antes de publicarlo (que no haya claves ni archivos .env, que las pruebas pasen y que no haya enlaces rotos), hace commit y, con confirmación, push al repositorio del participante en GitHub; después guía la publicación en Netlify. Úsala cuando el usuario quiera publicar, subir, guardar en GitHub o poner en línea su kit.
disable-model-invocation: true
---

# Publicar el kit

El participante es arquitecto o ingeniero y **no programa**. Explica cada paso en una línea, en español
de México. Si algo de la revisión falla, **detente**: explica qué falló y cómo arreglarlo; no publiques.

## 1. ¿Dónde estamos?

```bash
git status
git remote -v
git branch --show-current
```

- Si no hay remoto `origin`, explícale que primero necesita su repositorio en GitHub (botón
  **Use this template** de la plantilla → repo **privado** a su nombre) y que te dé la URL para
  `git remote add origin <url>`. No crees repos por tu cuenta.
- Si `origin` apunta a la plantilla del curso (`victorgomez-ibg/igb-aec-plantilla`) y el participante
  no es su dueño, avísale: el push fallará; necesita su propio repo.

## 2. Revisión de seguridad (obligatoria)

1. Archivos de secretos versionados o por agregar:
   ```bash
   git ls-files | grep -Ei '(^|/)\.env|\.pem$|\.key$|credentials|secret' || echo "OK: sin archivos de secretos"
   git status --porcelain | grep -Ei '\.env|\.pem$|\.key$' || echo "OK: nada pendiente"
   ```
2. Claves escritas en el código (incluye lo pendiente de commit):
   ```bash
   git grep -nIE 'sk-ant-[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}|xox[bp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY' -- . ':!shared/vendor' || echo "OK: sin claves en archivos versionados"
   git grep -nIE --untracked 'sk-ant-[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}' -- . ':!shared/vendor' || echo "OK: sin claves en archivos nuevos"
   ```
   Si aparece algo: **no publiques**. Quita la clave del archivo, dile que la **rote** en la consola del
   proveedor (Anthropic / Google) y explícale que las claves van solo en ⚙ Ajustes.
3. Datos de clientes: confirma que no se agregó la carpeta `caso-estudio` ni planos/fotos de clientes
   (`git status`). Si los ves, no los agregues y pregúntale.

## 3. Pruebas

Revisa `package.json`: el script `test` corre `node --test shared/js/` (los `*.test.mjs`).

```bash
npm test
```

Si no tiene Node instalado, dilo y sigue (el sitio no necesita Node para funcionar). Si alguna prueba
falla, detente y explica cuál.

## 4. Enlaces rotos básicos

Comprueba que las rutas locales de `href`/`src`/`import` en los HTML apuntan a archivos que existen.
Con Node:

```bash
node -e '
const fs=require("fs"),path=require("path");let bad=0;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name.startsWith(".")||e.name==="node_modules"?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk(".").filter(f=>f.endsWith(".html"))){
  const s=fs.readFileSync(f,"utf8");
  for(const m of s.matchAll(/(?:href|src)="([^"#?]+)"|from\s+["\x27](\.{1,2}\/[^"\x27]+)["\x27]/g)){
    const u=m[1]||m[2]; if(/^(https?:|mailto:|data:|javascript:|\$\{)/.test(u)||u.includes("${"))continue;
    let p=path.resolve(path.dirname(f),u); if(u.endsWith("/"))p=path.join(p,"index.html");
    if(!fs.existsSync(p)){console.log("ROTO:",f,"→",u);bad++;}
  }
}
console.log(bad?bad+" enlace(s) roto(s)":"OK: sin enlaces locales rotos");'
```

Si hay rotos, muéstralos y propón la corrección; no publiques hasta resolverlos o que él decida.

## 5. Commit

1. Muestra `git status` y explica en palabras simples qué archivos van.
2. Agrega **por nombre** (`git add CLAUDE.md shared/css/aec-theme.css …`). **Nunca** `git add -A` ni `git add .`.
3. Commit con mensaje en español, claro: `git commit -m "Personaliza colores y datos del despacho"`.

## 6. Push (pide confirmación)

Antes de subir, pregunta explícitamente: «¿Subo estos cambios a GitHub (`<url de origin>`, rama
`<rama>`)?». Solo con un **sí**:

```bash
git push origin <rama>
```

- **Nunca** `git push --force`, `git reset --hard` ni reescribir historial.
- Si GitHub rechaza el push (cambios en GitHub que no tienes en local), **no fuerces**: explica la causa
  y propón `git pull` y volver a intentar, revisando juntos si hay conflictos.
- Si pide usuario/contraseña, explícale que GitHub usa su sesión del navegador (GitHub Desktop o
  `gh auth login`); no le pidas tokens en el chat.

## 7. Netlify

Revisa si está la herramienta de Netlify: `netlify --version`.

- **Si está instalada y ya enlazada** (`netlify status` muestra el sitio): basta con el push; Netlify
  publica solo al detectar el cambio en GitHub. Dale la URL del sitio.
- **Si no está (lo normal en el curso)**, guíalo con clics en la web:
  1. Entra a **app.netlify.com** y elige **Log in with GitHub**.
  2. **Add new site → Import an existing project → Deploy with GitHub**. Autoriza a Netlify a ver
     su repositorio (puede limitarlo a ese solo repo).
  3. Elige su repositorio y la rama `main`.
  4. **Build command:** vacío. **Publish directory:** `.` (punto: la raíz del repo).
  5. **Deploy**. Al terminar, Netlify da una URL `https://<nombre>.netlify.app`; en
     **Site configuration → Change site name** puede ponerle un nombre más claro.
  6. Desde ahora, cada push a `main` vuelve a publicar solo.
- Recuérdale que las claves **no** viajan con el sitio: en la URL publicada tendrá que pegarlas de nuevo
  en ⚙ Ajustes (se guardan en su navegador, por sitio).

## 8. Cierre

Resume: qué se revisó (y resultado), hash del commit (`git log --oneline -1`), si se subió y la URL de
Netlify si ya la tiene.
