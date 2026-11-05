/**
 * Abrir la bóveda con la huella (WebAuthn + extensión PRF).
 * El lector de huella del celular entrega un secreto que solo sale si pasas tu huella;
 * con él se envuelve la llave de la bóveda. Se guarda solo en ESTE dispositivo (no se sincroniza).
 * Si el navegador no soporta PRF, la huella no se ofrece y se usa la contraseña maestra.
 */
import { aB64, cifrar, deB64, descifrar, type Bytes, type Cifrado } from "./cripto";

const LLAVE = "neko-boveda-huella";

interface HuellaLocal { credencial: string; sal: string; envuelta: Cifrado }

function leerLocal(): HuellaLocal | null {
  try { return JSON.parse(localStorage.getItem(LLAVE) ?? "null"); } catch { return null; }
}

export const huellaRegistrada = () => !!leerLocal();
export function olvidarHuella() { try { localStorage.removeItem(LLAVE); } catch { /* nada */ } }

export async function puedeUsarHuella(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
    if (window.self !== window.top) return false; // dentro de un marco (vista previa) no se permite
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

async function llaveDesdePRF(secreto: ArrayBuffer) {
  const base = await crypto.subtle.importKey("raw", secreto, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("neko-boveda-huella"), info: new Uint8Array() },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

type ConPRF = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

async function pedirSecreto(credencial: Bytes, sal: Bytes): Promise<ArrayBuffer | null> {
  const r = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: credencial }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: sal } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  return (r?.getClientExtensionResults() as ConPRF | undefined)?.prf?.results?.first ?? null;
}

/** Registra la huella de este dispositivo para la bóveda abierta. Regresa un mensaje si no se pudo. */
export async function registrarHuella(crudo: Bytes): Promise<string | null> {
  try {
    const sal = crypto.getRandomValues(new Uint8Array(32));
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "NekoTask" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "boveda", displayName: "Bóveda de NekoTask" },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60_000,
        extensions: { prf: { eval: { first: sal } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!cred) return "No se registró la huella.";
    const ext = cred.getClientExtensionResults() as ConPRF;
    if (ext.prf?.enabled === false) return "Este navegador no permite abrir la bóveda con huella. Usa la contraseña maestra.";
    const id = new Uint8Array(cred.rawId);
    const secreto = ext.prf?.results?.first ?? (await pedirSecreto(id, sal));
    if (!secreto) return "Este navegador no permite abrir la bóveda con huella. Usa la contraseña maestra.";
    const envuelta = await cifrar(await llaveDesdePRF(secreto), crudo, "neko-boveda-huella");
    localStorage.setItem(LLAVE, JSON.stringify({ credencial: aB64(id), sal: aB64(sal), envuelta } satisfies HuellaLocal));
    return null;
  } catch (e) {
    return (e as Error).name === "NotAllowedError" ? "Cancelaste la huella." : "No se pudo registrar la huella en este dispositivo.";
  }
}

/** Pide la huella y regresa la llave de la bóveda, o null si no se pudo */
export async function abrirConHuella(): Promise<Bytes | null> {
  const local = leerLocal();
  if (!local) return null;
  try {
    const secreto = await pedirSecreto(deB64(local.credencial), deB64(local.sal));
    if (!secreto) return null;
    return await descifrar(await llaveDesdePRF(secreto), local.envuelta, "neko-boveda-huella");
  } catch {
    return null;
  }
}
