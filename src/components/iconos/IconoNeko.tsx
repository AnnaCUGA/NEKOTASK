import type { ReactNode } from "react";
import type { NombreIcono } from "@/lib/tipos";

/**
 * Íconos dibujados a mano para NekoTask, en el mismo estilo que las gatitas:
 * trazo redondeado + relleno suave. Nada de emojis.
 * Las piezas con `R` llevan el relleno translúcido del color actual.
 */
const R = { fill: "currentColor", fillOpacity: 0.22 } as const;

const ICONOS: Record<NombreIcono, ReactNode> = {
  agua: (<>
    <path {...R} d="M6 4h12l-1.5 15.4a2 2 0 0 1-2 1.6h-5a2 2 0 0 1-2-1.6Z" />
    <path d="M6.7 10.5c1.8-1 3.6 1 5.3 0s3.5-1 5.3 0" />
  </>),
  jugo: (<>
    <path {...R} d="M6.5 8h11l-1.3 11.5a1.8 1.8 0 0 1-1.8 1.5H9.6a1.8 1.8 0 0 1-1.8-1.5Z" />
    <path d="M13 8l1.6-5H18" />
    <path {...R} d="M5 8a3 3 0 0 1 6 0Z" />
  </>),
  te: (<>
    <path {...R} d="M4 9h12v5.5A5.5 5.5 0 0 1 10.5 20h-1A5.5 5.5 0 0 1 4 14.5Z" />
    <path d="M16 11h1.4a2.6 2.6 0 0 1 0 5.2H16M10 9V5.5" />
    <path {...R} d="M8.6 2.5h2.8v3H8.6Z" />
  </>),
  cafe: (<>
    <path {...R} d="M4 9h12v5.5A5.5 5.5 0 0 1 10.5 20h-1A5.5 5.5 0 0 1 4 14.5Z" />
    <path d="M16 11h1.4a2.6 2.6 0 0 1 0 5.2H16M8 3.5c-1 1 1 2 0 3.2M12 3.5c-1 1 1 2 0 3.2" />
  </>),
  sabor: (<>
    <path {...R} d="M6 6h12l-1.4 13.4a2 2 0 0 1-2 1.6H9.4a2 2 0 0 1-2-1.6Z" />
    <path d="M9 12.5h2.4v2.4H9ZM12.6 14.5h2.4v2.4h-2.4Z" />
    <circle {...R} cx="17.5" cy="5.5" r="3" />
    <path d="M17.5 3.5v4M15.5 5.5h4" />
  </>),
  refresco: (<>
    <path {...R} d="M7.5 6h9l-.6 1.5V19a2 2 0 0 1-2 2h-3.8a2 2 0 0 1-2-2V7.5Z" />
    <path d="M8 4h8M7.6 11h8.8M7.6 15h8.8M13 4l1.5-2" />
  </>),
  tarea: (<>
    <path {...R} d="M7 4.5h10a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    <path d="M9.3 3h5.4v3H9.3ZM9 11.5l1.6 1.6L14 9.8M9 16.5h6" />
  </>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  reloj: (<>
    <circle {...R} cx="12" cy="13" r="8" />
    <path d="M12 9v4.2l2.8 1.8M4.5 5.5l2.2-2.2M19.5 5.5l-2.2-2.2" />
  </>),
  cepillo: (<>
    <path d="M3.5 19.5c3.2-2.4 6.6-5.4 9.5-8.5" />
    <path {...R} d="M12 8.5l3-3 4.5 4.5-3 3Z" />
    <path d="M15.6 4.4l1.1-1.1M17.6 6.4l1.1-1.1M19.6 8.4l1.1-1.1" />
    <circle cx="6" cy="9" r="1.2" /><circle cx="8.5" cy="5.5" r="0.8" />
  </>),
  cara: (<>
    <circle {...R} cx="11" cy="13.5" r="7" />
    <path d="M8 12.5q1 1.1 2 0M12 12.5q1 1.1 2 0M9 16q2 1.4 4 0" />
    <path {...R} d="M19 2.8c1.1 1.6 1.7 2.5 1.7 3.3a1.7 1.7 0 0 1-3.4 0c0-.8.6-1.7 1.7-3.3Z" />
  </>),
  croqueta: (<>
    <path {...R} d="M3 12c3-5.2 9.2-6 13.2-2L20 7v10l-3.8-3c-4 4-10.2 3.2-13.2-2Z" />
    <circle cx="8" cy="11.2" r="0.6" />
    <path d="M11 9.5q1.2 2.5 0 5" />
  </>),
  huella: (<>
    <path {...R} d="M12 12.5c-3 0-5.2 2.6-5.2 4.6 0 1.8 2 2.9 5.2 2.9s5.2-1.1 5.2-2.9c0-2-2.2-4.6-5.2-4.6Z" />
    <circle {...R} cx="6.4" cy="9.6" r="1.8" /><circle {...R} cx="9.8" cy="6.4" r="1.8" />
    <circle {...R} cx="14.2" cy="6.4" r="1.8" /><circle {...R} cx="17.6" cy="9.6" r="1.8" />
  </>),
  corazon: <path {...R} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  luna: (<>
    <path {...R} d="M19 15A8 8 0 1 1 10 4a6.5 6.5 0 0 0 9 11Z" />
    <path d="M17 4.5v2.5M15.8 5.8h2.4" />
  </>),
  sol: (<>
    <circle {...R} cx="12" cy="12" r="4.2" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </>),
  nube: <path {...R} d="M7 18a4 4 0 0 1-.6-7.9A5 5 0 0 1 16 8.6 4 4 0 1 1 17 18Z" />,
  calendario: (<>
    <path {...R} d="M4.5 6h15a.5.5 0 0 1 .5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a.5.5 0 0 1 .5-.5Z" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M8 14h2M12 14h2M8 17h2" />
  </>),
  nota: (<>
    <path {...R} d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M15 3v4h4M8.5 12h7M8.5 16h5" />
  </>),
  estrella: <path {...R} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />,
  basura: (<>
    <path {...R} d="M6.5 7.5l1 12a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-12Z" />
    <path d="M4.5 7.5h15M9.5 7.5V4.5h5v3M10.5 11v6M13.5 11v6" />
  </>),
  play: <path {...R} d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.4-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5Z" />,
  pausa: (<>
    <path {...R} d="M7 5h3.2v14H7ZM13.8 5H17v14h-3.2Z" />
  </>),
  reiniciar: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8" />,
  plato: (<>
    <path {...R} d="M3 11.5h18l-1.8 5.8A3 3 0 0 1 16.3 19.5H7.7a3 3 0 0 1-2.9-2.2Z" />
    <circle cx="9" cy="8.6" r="1.1" /><circle cx="12.2" cy="7.6" r="1.1" /><circle cx="15.2" cy="8.8" r="1.1" />
  </>),
  arenero: (<>
    <path {...R} d="M3 11h18v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
    <path d="M3 11c3-1.8 6 .2 9-1.3s6 .1 9-1.1M16.5 3.5l-2.6 5" />
  </>),
  vacuna: (<>
    <path {...R} d="M15.5 6.5l2 2-8.6 8.6-3.3.7.7-3.3Z" />
    <path d="M14 5l5 5M17.5 3.5l3 3M19 5l-1.5 1.5M5.5 18.5L3.5 20.5M11 9.5l1.5 1.5M9 11.5l1.5 1.5" />
  </>),
  pastilla: (<>
    <path {...R} d="M4.9 13.4l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a3.5 3.5 0 0 1-5-5Z" />
    <path d="M9.2 9.2l5.6 5.6" />
  </>),
  veterinario: <path {...R} d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5Z" />,
  racha: (<>
    <path {...R} d="M12 21a6 6 0 0 0 6-6c0-4-3-5.5-3-9.5-2.2 1.2-4.2 3.4-4 6.6-1-.8-1.6-1.9-1.6-3.1C7.2 10.5 6 12.9 6 15a6 6 0 0 0 6 6Z" />
    <path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.4-2.4 2.5-4 1.1 1.6 2.5 2.4 2.5 4A2.5 2.5 0 0 1 12 21Z" />
  </>),
  etiqueta: (<>
    <path {...R} d="M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1l9 9-8.1 8.1Z" />
    <circle cx="8" cy="8" r="1.4" />
  </>),
  cerrar: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chispa: (<>
    <path {...R} d="M11 3c.8 4.5 2.2 6 7 7-4.8 1-6.2 2.5-7 7-.8-4.5-2.2-6-7-7 4.8-1 6.2-2.5 7-7Z" />
    <path d="M19 15.5v5M16.5 18h5" />
  </>),
  libro: (<>
    <path {...R} d="M4.5 5a2 2 0 0 1 2-2H19v15.5H6.5a2 2 0 0 0-2 2Z" />
    <path d="M4.5 20.5a2 2 0 0 1 2-2H19v2.5H6.5M9 7.5h6" />
  </>),
  pesa: <path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11" strokeWidth={2.6} />,
  tienda: (<>
    <path {...R} d="M4.5 10h15v10h-15Z" />
    <path d="M3.5 10l2-5.5h13l2 5.5c0 1.4-1.2 2.4-2.6 2.4S15.4 11.4 15.4 10c0 1.4-1.2 2.4-2.6 2.4h-1.6c-1.4 0-2.6-1-2.6-2.4 0 1.4-1.2 2.4-2.5 2.4S3.5 11.4 3.5 10ZM10 20v-4.5h4V20" />
  </>),
  casa: (<>
    <path {...R} d="M4.5 10.5L12 4l7.5 6.5V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
    <path d="M10 20v-5h4v5" />
  </>),
  ajustes: (<>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle {...R} cx="16" cy="7" r="2.2" /><circle {...R} cx="10" cy="17" r="2.2" />
  </>),
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  bocina: (<>
    <path {...R} d="M4 9.5h3.6L12.5 5.5v13l-4.9-4H4Z" />
    <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4" />
  </>),
  silencio: (<>
    <path {...R} d="M4 9.5h3.6L12.5 5.5v13l-4.9-4H4Z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </>),
  copiar: (<>
    <path {...R} d="M9 8.5h9.5a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
    <path d="M5.5 15.5H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v.5" />
  </>),
  enviar: <path {...R} d="M4 11.6 19.6 4.4a.6.6 0 0 1 .8.8L13.2 20.8a.6.6 0 0 1-1.1-.1l-1.9-6.2-6.1-1.8a.6.6 0 0 1-.1-1.1ZM10.2 14.5l4.3-4.3" />,
  detener: <path {...R} d="M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />,
  google: (<>
    <path {...R} d="M4.5 6h15a.5.5 0 0 1 .5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a.5.5 0 0 1 .5-.5Z" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M9 15a3 3 0 0 1 5.4-1.6M15 15a3 3 0 0 1-5.4 1.6M14.6 12.4v1.4h-1.4M9.4 17.6v-1.4h1.4" />
  </>),
  sincronizar: <path d="M4.5 10a7.5 7.5 0 0 1 13.4-3.6M19.5 14a7.5 7.5 0 0 1-13.4 3.6M18 3.5v3.3h-3.3M6 20.5v-3.3h3.3" />,
  izquierda: <path d="M15 5.5 8.5 12l6.5 6.5" />,
  derecha: <path d="M9 5.5 15.5 12 9 18.5" />,
  lista: (<>
    <path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20" />
    <circle {...R} cx="5" cy="6.5" r="1.5" /><circle {...R} cx="5" cy="12" r="1.5" /><circle {...R} cx="5" cy="17.5" r="1.5" />
  </>),
};

export const ICONOS_HABITO: NombreIcono[] = [
  "cepillo", "cara", "agua", "libro", "pesa", "luna", "sol", "corazon", "estrella",
  "nota", "pastilla", "reloj", "huella", "chispa", "casa", "plato", "racha", "te",
];

export function IconoNeko({
  nombre,
  tamano = 20,
  className,
  grosor = 1.9,
  titulo,
}: {
  nombre: NombreIcono;
  tamano?: number;
  className?: string;
  grosor?: number;
  titulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
    >
      {titulo && <title>{titulo}</title>}
      {ICONOS[nombre]}
    </svg>
  );
}
