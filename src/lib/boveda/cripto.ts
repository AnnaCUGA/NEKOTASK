/**
 * Bóveda de accesos — cifrado de extremo a extremo con Web Crypto.
 *
 *  contraseña maestra ──PBKDF2-SHA256 (600 000 vueltas)──▶ llave maestra
 *  llave maestra ──AES-GCM──▶ envuelve la "llave de la bóveda" (32 bytes al azar)
 *  llave de la bóveda ──AES-GCM──▶ cifra cada acceso completo (nombre, usuario, contraseña, enlace, descripción)
 *
 * A la nube solo llegan: la sal, la llave de la bóveda envuelta y los accesos cifrados.
 * Nada de esto sirve sin la contraseña maestra (o la huella de un dispositivo registrado).
 */

export interface Cifrado { iv: string; ct: string }

export interface MetaBoveda {
  id: "principal";
  version: 1;
  sal: string;
  iteraciones: number;
  llaveEnvuelta: Cifrado;
  /** "neko-ok" cifrado con la llave de la bóveda: confirma que una llave abierta con huella sigue siendo la buena */
  prueba: Cifrado;
  creadoEn: string;
}

export interface AccesoCifrado extends Cifrado {
  id: string;
  actualizadoEn: string;
}

/** Lo que hay dentro de cada acceso: solo existe en memoria mientras la bóveda está abierta */
export interface Acceso {
  id: string;
  nombre: string;
  usuario: string;
  contrasena: string;
  url: string;
  descripcion: string;
  creadoEn: string;
  actualizadoEn: string;
}

/** Bytes sobre un ArrayBuffer normal (lo que pide Web Crypto) */
export type Bytes = Uint8Array<ArrayBuffer>;

export const ITERACIONES = 600_000;
const sutil = () => globalThis.crypto.subtle;
const azar = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const texto = new TextEncoder();
const deTexto = new TextDecoder();

export const aB64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
export const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function llaveMaestra(contrasena: string, sal: Bytes, iteraciones: number) {
  const base = await sutil().importKey("raw", texto.encode(contrasena.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return sutil().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export const llaveAES = (crudo: Bytes) => sutil().importKey("raw", crudo, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

export async function cifrar(llave: CryptoKey, datos: Bytes, contexto: string): Promise<Cifrado> {
  const iv = azar(12);
  const ct = await sutil().encrypt({ name: "AES-GCM", iv, additionalData: texto.encode(contexto) }, llave, datos);
  return { iv: aB64(iv), ct: aB64(ct) };
}

export async function descifrar(llave: CryptoKey, c: Cifrado, contexto: string) {
  const claro = await sutil().decrypt({ name: "AES-GCM", iv: deB64(c.iv), additionalData: texto.encode(contexto) }, llave, deB64(c.ct));
  return new Uint8Array(claro);
}

/** Crea una bóveda nueva. Regresa lo que se guarda (meta) y la llave abierta (solo en memoria). */
export async function crearBoveda(contrasena: string, iteraciones = ITERACIONES) {
  const sal = azar(16);
  const crudo = azar(32);
  const maestra = await llaveMaestra(contrasena, sal, iteraciones);
  const meta: MetaBoveda = {
    id: "principal",
    version: 1,
    sal: aB64(sal),
    iteraciones,
    llaveEnvuelta: await cifrar(maestra, crudo, "neko-boveda-llave"),
    prueba: await cifrar(await llaveAES(crudo), texto.encode("neko-ok"), "neko-boveda-prueba"),
    creadoEn: new Date().toISOString(),
  };
  return { meta, crudo };
}

/** Abre con la contraseña maestra. Si es incorrecta, AES-GCM lo detecta y regresa null. */
export async function abrirConContrasena(meta: MetaBoveda, contrasena: string): Promise<Bytes | null> {
  try {
    const maestra = await llaveMaestra(contrasena, deB64(meta.sal), meta.iteraciones);
    return await descifrar(maestra, meta.llaveEnvuelta, "neko-boveda-llave");
  } catch {
    return null;
  }
}

/** Cambia la contraseña maestra sin volver a cifrar los accesos (solo se re-envuelve la llave) */
export async function cambiarContrasena(meta: MetaBoveda, crudo: Bytes, nueva: string, iteraciones = ITERACIONES): Promise<MetaBoveda> {
  const sal = azar(16);
  const maestra = await llaveMaestra(nueva, sal, iteraciones);
  return { ...meta, sal: aB64(sal), iteraciones, llaveEnvuelta: await cifrar(maestra, crudo, "neko-boveda-llave") };
}

/** ¿Esta llave abre esta bóveda? (sirve para la huella: la bóveda pudo haberse creado de nuevo) */
export async function llaveCorrecta(meta: MetaBoveda, crudo: Bytes) {
  try {
    return deTexto.decode(await descifrar(await llaveAES(crudo), meta.prueba, "neko-boveda-prueba")) === "neko-ok";
  } catch {
    return false;
  }
}

export async function cifrarAcceso(llave: CryptoKey, a: Acceso): Promise<AccesoCifrado> {
  const c = await cifrar(llave, texto.encode(JSON.stringify(a)), `neko-acceso:${a.id}`);
  return { id: a.id, ...c, actualizadoEn: a.actualizadoEn };
}

export async function descifrarAcceso(llave: CryptoKey, c: AccesoCifrado): Promise<Acceso | null> {
  try {
    return JSON.parse(deTexto.decode(await descifrar(llave, c, `neko-acceso:${c.id}`))) as Acceso;
  } catch {
    return null;
  }
}

// ─── Generador ──────────────────────────────────────────────────────────
const MINUS = "abcdefghijkmnopqrstuvwxyz";     // sin "l" para no confundir con 1
const MAYUS = "ABCDEFGHJKLMNPQRSTUVWXYZ";      // sin I ni O
const NUMS = "23456789";                       // sin 0 ni 1
const SIMB = "!#$%&*+-=?@^_~";

/** Número al azar en [0, n) sin sesgo */
function azarHasta(n: number) {
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const u = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(u); while (u[0] >= limite);
  return u[0] % n;
}

export interface OpcionesGenerador { largo: number; mayusculas: boolean; numeros: boolean; simbolos: boolean }

export function generarContrasena({ largo, mayusculas, numeros, simbolos }: OpcionesGenerador) {
  const grupos = [MINUS, ...(mayusculas ? [MAYUS] : []), ...(numeros ? [NUMS] : []), ...(simbolos ? [SIMB] : [])];
  const todo = grupos.join("");
  const n = Math.max(largo, grupos.length);
  // al menos uno de cada grupo elegido, el resto de todo, y se revuelve
  const chars = grupos.map((g) => g[azarHasta(g.length)]);
  while (chars.length < n) chars.push(todo[azarHasta(todo.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = azarHasta(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

export const PALABRAS = (
  "gato luna mango nube taco churro mapache panda zorro koala tigre leon nutria pinguino buho colibri ballena delfin pulpo medusa " +
  "cometa estrella planeta galaxia aurora trueno lluvia brisa niebla arcoiris volcan montana bosque selva desierto playa isla rio lago cascada " +
  "fresa sandia limon cereza durazno guayaba papaya coco pina uva kiwi melon nopal elote frijol tamal pozole mole salsa queso " +
  "galleta pastel dona bombon caramelo chicle helado gelatina cafe chocolate vainilla canela miel azucar pan tortilla sopa arroz " +
  "lapiz cuaderno mochila tijera pincel lienzo guitarra piano tambor violin flauta trompeta radio disco robot cohete satelite " +
  "linterna farol vela espejo reloj llave candado puerta ventana jardin maceta girasol tulipan rosa cactus helecho bambu musgo " +
  "azul violeta rosado dorado plateado coral turquesa lila menta canela grafito marfil ambar jade rubi zafiro perla opalo cuarzo " +
  "brillo susurro abrazo sonrisa siesta paseo viaje mapa brujula ancla velero faro puente torre castillo cueva tunel camino " +
  "chispa pixel neon laser eco ritmo melodia poema cuento fabula leyenda mito sueno deseo suerte magia hechizo pocion varita " +
  "manta cojin alfombra hamaca columpio pelota cometa yoyo trompo canica dado ficha carta tablero domino rompecabezas globo confeti"
).split(" ");

export function generarFrase(palabras: number, separador = "-") {
  const lista = Array.from({ length: palabras }, () => {
    const p = PALABRAS[azarHasta(PALABRAS.length)];
    return p.charAt(0).toUpperCase() + p.slice(1);
  });
  return `${lista.join(separador)}${separador}${10 + azarHasta(90)}`;
}

// ─── Medidor ────────────────────────────────────────────────────────────
export type NivelFuerza = "debil" | "regular" | "fuerte" | "muyFuerte";

/** Estimación de bits de entropía, castigando patrones típicos */
export function bitsDe(contrasena: string): number {
  if (!contrasena) return 0;
  // frase del generador: palabras de la lista + número
  const partes = contrasena.split(/[-_. ]/);
  if (partes.length >= 3 && partes.slice(0, -1).every((p) => PALABRAS.includes(p.toLowerCase()))) {
    return (partes.length - 1) * Math.log2(PALABRAS.length) + (/^\d{2}$/.test(partes[partes.length - 1]) ? Math.log2(90) : 0);
  }
  let alfabeto = 0;
  if (/[a-z]/.test(contrasena)) alfabeto += 26;
  if (/[A-Z]/.test(contrasena)) alfabeto += 26;
  if (/\d/.test(contrasena)) alfabeto += 10;
  if (/[^a-zA-Z0-9]/.test(contrasena)) alfabeto += 20;
  let bits = contrasena.length * Math.log2(Math.max(alfabeto, 2));
  const unicos = new Set(contrasena).size;
  if (unicos < contrasena.length / 2) bits *= 0.6;                                   // muchas repetidas
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf|zxcv)/i.test(contrasena)) bits *= 0.6;
  if (/(password|contrase|qwerty|admin|12345|111111|abc123|iloveyou|teamo)/i.test(contrasena)) bits = Math.min(bits, 20);
  if (/^[a-zA-Z]+\d{1,4}[!.]?$/.test(contrasena)) bits *= 0.5;                       // nombre + año: lo primero que se prueba
  return Math.round(bits);
}

export function fuerza(contrasena: string): { nivel: NivelFuerza; bits: number } {
  const bits = bitsDe(contrasena);
  return { bits, nivel: bits < 45 ? "debil" : bits < 60 ? "regular" : bits < 80 ? "fuerte" : "muyFuerte" };
}
