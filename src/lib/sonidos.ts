/**
 * Sonidos gatunos sintetizados con Web Audio (sin archivos de audio).
 * Todo es opcional: se respeta `ajustes.sonidos`.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** "Mrrp": un trino corto ascendente, como saludo gatuno */
export function mrrp(tono = 1) {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(420 * tono, t);
  o.frequency.exponentialRampToValueAtTime(780 * tono, t + 0.09);
  o.frequency.exponentialRampToValueAtTime(560 * tono, t + 0.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + 0.26);
}

/** "Miau": dos tramos de vocal con vibrato */
export function miau() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const vib = a.createOscillator();
  const vibG = a.createGain();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  o.type = "sawtooth";
  f.type = "bandpass"; f.Q.value = 3;
  f.frequency.setValueAtTime(900, t);
  f.frequency.linearRampToValueAtTime(1600, t + 0.15);
  f.frequency.linearRampToValueAtTime(700, t + 0.45);
  o.frequency.setValueAtTime(520, t);
  o.frequency.linearRampToValueAtTime(700, t + 0.14);
  o.frequency.linearRampToValueAtTime(430, t + 0.48);
  vib.frequency.value = 7; vibG.gain.value = 12;
  vib.connect(vibG).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t); vib.start(t); o.stop(t + 0.52); vib.stop(t + 0.52);
}

/** Ronroneo: ruido grave modulado a ~25 Hz */
export function ronroneo(segundos = 1.4) {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * segundos), a.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const ruido = a.createBufferSource(); ruido.buffer = buf;
  const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
  const am = a.createGain(); am.gain.value = 0;
  const lfo = a.createOscillator(); lfo.frequency.value = 24;
  const lfoG = a.createGain(); lfoG.gain.value = 0.5;
  lfo.connect(lfoG).connect(am.gain);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + segundos);
  ruido.connect(lp).connect(am).connect(g).connect(a.destination);
  ruido.start(t); lfo.start(t); ruido.stop(t + segundos); lfo.stop(t + segundos);
}

/** "Glu": burbuja corta para la hidratación */
export function glu() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  [0, 0.12].forEach((d, i) => {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(300 + i * 80, t + d);
    o.frequency.exponentialRampToValueAtTime(900 + i * 120, t + d + 0.08);
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.14, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1);
    o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + 0.12);
  });
}

/** Campanita de croqueta */
export function tilin() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  [1320, 1760].forEach((f, i) => {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.09, t + i * 0.07 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.35);
    o.connect(g).connect(a.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.4);
  });
}
