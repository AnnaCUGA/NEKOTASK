// Genera dist/nekotask-vista-previa.html: un solo archivo con todo incrustado.
// Uso: npm run vista-previa
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dist = resolve(raiz, "dist");
mkdirSync(dist, { recursive: true });

execFileSync(
  resolve(raiz, "node_modules/.bin/tailwindcss"),
  ["-c", "tailwind.config.ts", "-i", "src/app/globals.css", "-o", "dist/vista.css", "--minify"],
  { cwd: raiz, stdio: "inherit" },
);

const resultado = await build({
  entryPoints: [resolve(raiz, "scripts/vista-previa/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  write: false,
  tsconfig: resolve(raiz, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_VISTA_PREVIA": '"1"' },
  // el resto de variables NEXT_PUBLIC_* quedan vacías en la vista previa
  banner: { js: 'var process={env:{NODE_ENV:"production",NEXT_PUBLIC_VISTA_PREVIA:"1"}};' },
  logLevel: "warning",
});

const js = resultado.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
// sprites de las gatitas incrustados (en la app se sirven desde /sprites)
const sprites = Object.fromEntries(
  ["blanquita", "bizca", "mango", "ronro"].map((g) => [g, `data:image/webp;base64,${readFileSync(resolve(raiz, `public/sprites/${g}.webp`)).toString("base64")}`]),
);
const scriptSprites = `<script>window.__NEKO_SPRITES=${JSON.stringify(sprites)};</script>`;
const css = readFileSync(resolve(dist, "vista.css"), "utf8");

const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#121212">
<title>NekoTask Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>:root{--font-titulo:'Fredoka';--font-cuerpo:'Nunito'}</style>
<style>${css}</style>
</head>
<body>
<div id="raiz"></div>
${scriptSprites}
<script>${js}</script>
</body>
</html>`;

writeFileSync(resolve(dist, "nekotask-vista-previa.html"), html);

// Versión para publicar como Artifact de claude.ai (el host agrega doctype/head/body)
const fuentes = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">';
const artifact = `<title>NekoTask Studio</title>
<meta name="theme-color" content="#121212">
${fuentes}
<style>:root{--font-titulo:'Fredoka',system-ui,sans-serif;--font-cuerpo:'Nunito',system-ui,sans-serif;color-scheme:dark}body{background:#121212;color:#f4f1fa}</style>
<style>${css}</style>
<div id="raiz"></div>
${scriptSprites}
<script>${js}</script>`;
writeFileSync(resolve(dist, "nekotask-studio.html"), artifact);
console.log(`Vista previa lista: dist/nekotask-vista-previa.html (${(html.length / 1024).toFixed(0)} KB)`);
