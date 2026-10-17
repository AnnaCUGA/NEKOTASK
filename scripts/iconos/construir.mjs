// Renderiza scripts/iconos/generar.tsx y toma una captura PNG de cada pieza.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = mkdtempSync(join(tmpdir(), "neko-iconos-"));
await build({
  entryPoints: [resolve(raiz, "scripts/iconos/generar.tsx")],
  bundle: true, platform: "node", jsx: "automatic", outfile: join(tmp, "g.cjs"),
  tsconfig: resolve(raiz, "tsconfig.json"), logLevel: "warning",
});
execFileSync("node", [join(tmp, "g.cjs"), join(tmp, "iconos.html")], { stdio: "inherit" });
mkdirSync(resolve(raiz, "public/iconos/gatitas"), { recursive: true });
const py = `
import sys
from playwright.sync_api import sync_playwright
html, destino = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto('file://' + html)
    for el in pg.query_selector_all('[data-n]'):
        n = el.get_attribute('data-n')
        el.query_selector(':scope > div').screenshot(path=f"{destino}/{n}.png", omit_background=True)
    b.close()
`;
execFileSync("python3", ["-c", py, join(tmp, "iconos.html"), resolve(raiz, "public/iconos")], { stdio: "inherit" });
console.log("Íconos listos en public/iconos");
