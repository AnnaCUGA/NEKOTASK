// Tipos del dominio — reflejan las tablas de supabase/migrations/0001_esquema_inicial.sql

export type Prioridad = "baja" | "media" | "alta" | "urgente";
export type Rutina = "manana" | "dia" | "noche" | "ninguna";
export type ClaveGatita = "blanquita" | "bizca" | "mango" | "ronro";
export type ClaveAccesorio = "mono" | "collar" | "gorrito" | "lentes" | "corona";
export type TipoCuidado =
  | "comida" | "agua_fresca" | "arenero" | "cepillado" | "juego"
  | "vacuna" | "desparasitacion" | "veterinario" | "medicamento";

export interface ItemChecklist { id: string; texto: string; hecho: boolean }

export interface Tarea {
  id: string;
  titulo: string;
  prioridad: Prioridad;
  etiquetas: string[];
  fechaLimite?: string;     // ISO
  estimadoMin?: number;
  realMin: number;
  checklist: ItemChecklist[];
  completada: boolean;
  completadaEn?: string;
  creadoEn: string;
}

export interface EntradaTiempo {
  id: string;
  tareaId?: string;
  inicio: string;
  fin: string;
  tipo: "pomodoro" | "descanso" | "manual";
}

export interface TipoBebida {
  id: string;
  nombre: string;
  icono: NombreIcono;
  color: string;
  porcentaje: number;        // cuánto cuenta para la meta (0-100)
  tamanosMl: number[];
}

export interface RegistroBebida {
  id: string;
  tipoId: string;
  ml: number;
  porcentaje: number;        // % vigente al registrar
  en: string;
}

export interface Habito {
  id: string;
  nombre: string;
  icono: NombreIcono;
  color: string;
  rutina: Rutina;
  diasSemana: number[];      // vacío = todos los días
  creadoEn: string;
}

export interface RegistroHabito { habitoId: string; fecha: string } // fecha = AAAA-MM-DD

export interface Gatita {
  clave: ClaveGatita;
  nombre: string;
  rol: string;
  accesorio?: ClaveAccesorio;
}

export interface CitaGatita {
  id: string;
  gatita: ClaveGatita;
  tipo: Extract<TipoCuidado, "vacuna" | "desparasitacion" | "veterinario" | "medicamento">;
  fecha: string;
  nota?: string;
  hecha: boolean;
}

export interface RegistroCuidado { gatita: ClaveGatita; tipo: TipoCuidado; fecha: string }

export type OrigenEvento = "local" | "google" | "ejemplo";

export interface EventoCalendario {
  id: string;
  titulo: string;
  inicio: string;           // ISO
  fin: string;              // ISO
  todoElDia?: boolean;
  descripcion?: string;
  origen: OrigenEvento;
  googleId?: string;        // id del evento en Google Calendar
}

export interface Nota {
  id: string;
  titulo: string;
  contenido: string;
  etiquetas: string[];
  fijada: boolean;
  origen: "app" | "ia" | "compartido" | "samsung_notes" | "whatsapp" | "telegram";
  creadoEn: string;
}

export type ProveedorIA = "claude" | "gemini";
export type ModoIA = "libre" | "desglosar" | "redactar" | "resumir" | "ideas" | "planear";

export interface MensajeIA {
  id: string;
  rol: "usuaria" | "blanquita";
  texto: string;
  en: string;
  proveedor?: ProveedorIA;
  modo?: ModoIA;
  error?: boolean;
}

export interface Conversacion {
  id: string;
  titulo: string;
  modo: ModoIA;
  mensajes: MensajeIA[];
  creadaEn: string;
  actualizadaEn: string;
}

export interface MovimientoCroquetas { id: string; cantidad: number; motivo: string; en: string }

export interface ConfigRecordatorios {
  agua: { activo: boolean; cadaMin: number; desde: string; hasta: string };
  rutinas: { activo: boolean; manana: string; noche: string };
  tareas: { activo: boolean; minutosAntes: number };
  gatitas: { activo: boolean; hora: string };
}

export interface Ajustes {
  nombre: string;
  metaAguaMl: number;
  horaInicioDia: string;   // "07:00"
  horaFinDia: string;      // "23:00"
  sonidos: boolean;
  pomodoroMin: number;
  descansoMin: number;
  proveedorIa: ProveedorIA;
  claveIa?: string;        // NEKO_CLAVE_ACCESO, si la configuraste en Vercel
  recordatorios: ConfigRecordatorios;
}

export type NombreIcono =
  | "agua" | "jugo" | "te" | "cafe" | "sabor" | "refresco"
  | "tarea" | "check" | "mas" | "menos" | "reloj" | "cepillo" | "cara"
  | "croqueta" | "huella" | "corazon" | "luna" | "sol" | "nube" | "calendario"
  | "nota" | "estrella" | "basura" | "play" | "pausa" | "reiniciar"
  | "plato" | "arenero" | "vacuna" | "pastilla" | "veterinario" | "racha"
  | "etiqueta" | "cerrar" | "chispa" | "libro" | "pesa" | "tienda" | "casa"
  | "ajustes" | "flecha" | "bocina" | "silencio" | "lista"
  | "copiar" | "enviar" | "detener" | "google" | "sincronizar" | "izquierda" | "derecha";
