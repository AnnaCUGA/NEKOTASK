import { Fragment, type ReactNode } from "react";

/** Markdown sencillo y seguro (sin innerHTML): títulos, listas, negritas, código. */
export function Markdown({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r/g, "").split("\n");
  const bloques: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (/^```/.test(l)) {
      const codigo: string[] = [];
      i++;
      while (i < lineas.length && !/^```/.test(lineas[i])) codigo.push(lineas[i++]);
      i++;
      bloques.push(
        <pre key={k++} className="overflow-x-auto rounded-xl bg-noche-900 p-3 text-[12px] leading-relaxed text-cian-suave"><code>{codigo.join("\n")}</code></pre>,
      );
      continue;
    }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      bloques.push(<p key={k++} className={`font-titulo font-semibold text-white ${h[1].length === 1 ? "text-lg" : "text-base"} mt-1`}>{enLinea(h[2])}</p>);
      i++;
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const numerada = /^\s*\d+[.)]/.test(l);
      const items: string[] = [];
      while (i < lineas.length && /^\s*([-*•]|\d+[.)])\s+/.test(lineas[i])) items.push(lineas[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      const Lista = numerada ? "ol" : "ul";
      bloques.push(
        <Lista key={k++} className={`space-y-1 pl-5 ${numerada ? "list-decimal" : "list-disc"} marker:text-violeta`}>
          {items.map((t, j) => <li key={j}>{enLinea(t)}</li>)}
        </Lista>,
      );
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i].trim() && !/^(```|#{1,3}\s|\s*([-*•]|\d+[.)])\s)/.test(lineas[i])) parrafo.push(lineas[i++]);
    bloques.push(<p key={k++}>{parrafo.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{enLinea(p)}</Fragment>)}</p>);
  }
  return <div className="space-y-2.5 text-[14.5px] leading-relaxed text-white/85 [overflow-wrap:anywhere]">{bloques}</div>;
}

function enLinea(t: string): ReactNode[] {
  const partes = t.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return partes.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-bold text-white">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-noche-900 px-1 py-0.5 text-[12.5px] text-cian-suave">{p.slice(1, -1)}</code>;
    if (/^\*[^*\s][^*]*\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
