/**
 * Fondo de la "sala" de las gatitas: ventana con ciudad neón de noche.
 * La ciudad es un patrón que se repite a lo ancho y se ancla al suelo,
 * así nunca se deforma ni se recorta en móvil o escritorio.
 */
const EDIFICIOS: [number, number, number][] = [
  [0, 46, 58], [44, 30, 82], [72, 52, 48], [122, 26, 96], [146, 44, 66], [188, 34, 104],
  [220, 56, 54], [274, 30, 86], [302, 48, 70], [348, 26, 112], [372, 54, 60], [424, 36, 90],
  [458, 50, 52], [506, 30, 98], [534, 52, 64], [584, 34, 84], [616, 50, 56], [664, 36, 92],
  [698, 52, 62], [748, 32, 100], [778, 56, 50], [832, 40, 80], [870, 50, 66], [918, 30, 94], [946, 54, 58],
];
const ALTO = 150; // alto del patrón de ciudad (px)
const SUELO = 34;  // alto de la repisa

export function FondoSala() {
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" width="100%" height="100%">
      <defs>
        <pattern id="neko-estrellas" width="420" height="120" patternUnits="userSpaceOnUse">
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={(i * 131) % 420} cy={8 + ((i * 47) % 100)} r={i % 4 === 0 ? 1.5 : 0.9} fill="#e9e2ff" opacity={0.3 + (i % 3) * 0.2}>
              <animate attributeName="opacity" values="0.15;0.9;0.15" dur={`${2 + (i % 5)}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </pattern>
        <pattern id="neko-ciudad" width="1000" height={ALTO} patternUnits="userSpaceOnUse">
          <g fill="#231d33">
            {EDIFICIOS.map(([x, w, h], i) => (
              <rect key={i} x={x} y={ALTO - h * 1.2} width={w} height={h * 1.2} rx={2} />
            ))}
          </g>
          {EDIFICIOS.flatMap(([x, w, h], i) =>
            Array.from({ length: Math.floor((h * 1.2) / 22) }, (_, j) => (
              <rect
                key={`${i}-${j}`}
                x={x + 6 + ((i + j) % 2) * (w / 2 - 6)}
                y={ALTO - h * 1.2 + 10 + j * 20}
                width={6}
                height={4}
                rx={1}
                fill={(i + j) % 3 === 0 ? "#f472b6" : (i + j) % 3 === 1 ? "#67e8f9" : "#a78bfa"}
                opacity={(i * 7 + j) % 4 === 0 ? 0.9 : 0.22}
              />
            )),
          )}
          <g transform={`translate(560 ${ALTO - 108})`}>
            <rect width="74" height="22" rx="6" fill="#16131f" stroke="#f472b6" strokeWidth="2">
              <animate attributeName="opacity" values="0.9;0.5;0.9;0.9;0.3;0.9" dur="5s" repeatCount="indefinite" />
            </rect>
            <text x="37" y="15.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f9a8d4" fontFamily="var(--font-titulo), sans-serif" letterSpacing="2">NEKO</text>
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="#16131f" />
      <rect width="100%" height="120" fill="url(#neko-estrellas)" />
      {/* luna */}
      <svg x="86%" y="18" overflow="visible">
        <circle cx="0" cy="22" r="20" fill="#f6efe0" opacity="0.92" />
        <circle cx="9" cy="16" r="18" fill="#16131f" />
      </svg>
      {/* ciudad anclada al suelo */}
      <svg y="100%" overflow="visible">
        <g transform={`translate(0 ${-(ALTO + SUELO - 4)})`}>
          <rect width="6000" height={ALTO} fill="url(#neko-ciudad)" />
        </g>
        <rect y={-SUELO} width="6000" height={SUELO} fill="#2a2338" />
        <rect y={-SUELO - 2} width="6000" height="4" fill="#a78bfa" opacity="0.55" />
        <rect y={-SUELO + 2} width="6000" height="1.5" fill="#f472b6" opacity="0.35" />
      </svg>
    </svg>
  );
}
