/** Utilidades de fecha en la zona local del dispositivo. */

export const hoyISO = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

export const esHoy = (iso?: string) => !!iso && hoyISO(new Date(iso)) === hoyISO();

export const sumarDias = (iso: string, n: number) => {
  const [a, m, d] = iso.split("-").map(Number);
  return hoyISO(new Date(a, m - 1, d + n));
};

export const minutosDeHora = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const minutosAhora = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export const formatoDuracion = (min: number) => {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
};

export const formatoHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

export const formatoFechaCorta = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export const saludo = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

export const diasHasta = (iso: string) => {
  const hoy = new Date(hoyISO() + "T00:00:00").getTime();
  const obj = new Date(iso.slice(0, 10) + "T00:00:00").getTime();
  return Math.round((obj - hoy) / 86_400_000);
};

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** "viernes, 16 de octubre" → "Viernes, 16 de octubre" (sin poner mayúscula a cada palabra) */
export const mayusculaInicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
