# NekoTask Studio

App de productividad, hábitos e hidratación con temática kawaii/cyberpunk, protagonizada por **Blanquita, Bizca, Mango y Ronro**.

| Gatita | Rol en la app | Reacciona cuando… |
|---|---|---|
| Blanquita | Guardiana del agua y **asistente IA** | registras una bebida · piensa y escribe cuando le preguntas algo · te avisa si vas atrasada con el agua |
| Bizca | Compañera de tareas | completas una tarea · te avisa antes de una tarea con hora |
| Mango | Coach del Pomodoro | inicias o terminas un Pomodoro · te recuerda los cuidados de las gatitas |
| Ronro | Guardiana del descanso | marcas hábitos · te recuerda tus rutinas de mañana y noche |

---

## Estado

- [x] **Fase 1** — Dashboard, gatitas animadas, tareas, hidratación por bebida, hábitos, Pomodoro, cuidado de gatitas, croquetas
- [x] **Fase 2** — Calendario con Google Calendar en ambos sentidos, Blanquita IA (Claude o Gemini), notas
- [x] **Fase 2b** — Cuenta (Google o enlace al correo) y sincronización en vivo entre celular y compu
- [x] **Fase 3a** — App instalable, funciona sin internet, accesos directos, *Compartir con NekoTask* (Samsung Notes), recordatorios y notificaciones push
- [ ] **Fase 3b** — Widget Android (Capacitor + Kotlin) y WhatsApp → app

---

## 1. Arquitectura

```
nekotask-studio/
├── public/
│   ├── sw.js                         # service worker: sin internet + notificaciones
│   └── iconos/                       # ícono de la app, atajos y una carita por gatita
├── src/
│   ├── app/
│   │   ├── page.tsx · layout.tsx · manifest.ts · compartir/page.tsx
│   │   └── api/
│   │       ├── ia/                   # Blanquita (Claude | Gemini, streaming)
│   │       ├── calendario/ · google/ # Google Calendar (OAuth + eventos)
│   │       ├── push/                 # suscribir dispositivo · notificación de prueba
│   │       └── recordatorios/        # lo llama el cron de Supabase cada 10 min
│   ├── components/
│   │   ├── gatitas/ · dashboard/ · calendario/ · asistente/
│   │   ├── cuenta/                   # pantalla de entrada · avisos de las gatitas
│   │   ├── ajustes/HojaAjustes.tsx   # cuenta, notificaciones, recordatorios, instalar
│   │   └── iconos/ · efectos/ · ui/
│   ├── store/                        # Zustand + persistencia local
│   └── lib/
│       ├── sync/                     # colecciones.ts (mezcla pura) + motor.ts (Supabase)
│       ├── cuenta/useCuenta.ts       # sesión de Supabase Auth
│       ├── recordatorios/            # reglas.ts (puras) · enApp.ts · push-servidor.ts
│       ├── pwa/pwa.ts                # instalar, service worker, suscripción push
│       ├── ia/ · google/ · supabase/
│       └── eventos.ts · sonidos.ts · fechas.ts · tipos.ts
├── supabase/migrations/              # 0001 esquema · 0002 calendario/IA · 0003 sync/push
└── scripts/
    ├── vista-previa/                 # HTML único con el mismo Dashboard
    ├── iconos/                       # genera los PNG desde los dibujos SVG
    └── pruebas/                      # sincronización entre dispositivos y recordatorios
```

### Cómo se sincroniza

Cada elemento (una tarea, un vaso, una nota, una conversación…) es una fila en `sync_registros`:

```
celular ──cambio──▶ store ──(1.2 s)──▶ sube solo lo que cambió ──▶ Supabase ──en vivo──▶ compu
                                       ◀── baja lo nuevo al abrir, al volver a la pestaña y cada minuto
```

- Funciona sin internet: todo se guarda en el dispositivo y se sube al reconectar.
- Si editas lo mismo en dos dispositivos, gana la última versión que llegó a la nube.
- Las croquetas se recalculan sumando sus movimientos, así no se pierden si ganas en ambos a la vez.
- La primera vez que entras en un dispositivo, lo que tenías ahí se une con tu cuenta.
- Se quedan solo en cada dispositivo: la clave de acceso de Blanquita, el Pomodoro en curso, la conexión de Google Calendar y los eventos de ejemplo.

### Recordatorios

| Gatita | Cuándo avisa |
|---|---|
| Blanquita | Entre las horas que elijas, si vas atrasada con tu meta y no has registrado nada en el intervalo |
| Ronro | A la hora de tu rutina de mañana o noche, si falta algún hábito |
| Bizca | Minutos antes de una tarea con hora |
| Mango | Citas de las gatitas del día y, a las 8 p. m., si falta registrar comida, agua fresca o arenero |

Con la app abierta aparecen como avisos dentro de la app. Con la app cerrada llegan como notificación del celular (necesita cuenta, llaves VAPID y el cron). El aviso del agua trae un botón **+250 ml**.

---

## 2. Correr en tu computadora

```bash
npm install
cp .env.example .env.local     # llena lo que vayas a usar
npm run dev                     # http://localhost:3000
npm run vista-previa            # dist/nekotask-vista-previa.html
node scripts/iconos/construir.mjs   # regenera los íconos (requiere Playwright)
```

Pruebas de lógica:

```bash
npx esbuild scripts/pruebas/sync.prueba.ts --bundle --platform=node --outfile=/tmp/s.cjs && node /tmp/s.cjs
npx esbuild scripts/pruebas/recordatorios.prueba.ts --bundle --platform=node --outfile=/tmp/r.cjs && node /tmp/r.cjs
```

---

## 3. Despliegue paso a paso

### 3.1 GitHub y Vercel
1. Sube el proyecto a un repositorio privado de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo → **Deploy**.
3. Anota tu dirección, por ejemplo `https://nekotask-anna.vercel.app`. La usarás en los pasos siguientes.

### 3.2 Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (región `us-east-1` o la más cercana).
2. **SQL Editor**: ejecuta en orden `0001_esquema_inicial.sql`, `0002_calendario_y_blanquita.sql` y `0003_cuenta_sync_recordatorios.sql`.
3. **Authentication → URL Configuration**: *Site URL* = tu dirección de Vercel. En *Redirect URLs* agrega esa dirección y `http://localhost:3000`.
4. **Authentication → Providers → Email**: déjalo activo (enlace al correo).
5. **Project Settings → API**: copia `Project URL`, `anon public` y `service_role` a Vercel:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 3.3 Google Cloud (entrar con Google + Calendar)
Un solo proyecto de Google Cloud sirve para las dos cosas.
1. [console.cloud.google.com](https://console.cloud.google.com) → crea el proyecto "NekoTask".
2. **APIs y servicios → Biblioteca** → **Google Calendar API** → *Habilitar*.
3. **Pantalla de consentimiento de OAuth** → *Externo* → nombre y tu correo. Permisos: `calendar.events`. Usuarios de prueba: tu Gmail.
4. **Credenciales → ID de cliente de OAuth → Aplicación web**. En *URI de redireccionamiento autorizados* agrega:
   - `https://TU-APP.vercel.app/api/google/callback` (Calendar)
   - `https://TU-PROYECTO.supabase.co/auth/v1/callback` (Entrar con Google)
   - `http://localhost:3000/api/google/callback` (pruebas locales)
5. Copia el *Client ID* y el *Client secret*:
   - En Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_COOKIE_SECRET` (genéralo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - En Supabase: **Authentication → Providers → Google** → activa y pega los mismos dos valores.
6. Para que Google no te pida volver a conectar cada 7 días, cambia la pantalla de consentimiento a **En producción**. Como solo la usas tú no necesitas verificación: la primera vez verás un aviso de "app no verificada"; continúa con *Configuración avanzada → Ir a NekoTask*.

### 3.4 Blanquita IA
- `ANTHROPIC_API_KEY` desde [platform.claude.com](https://platform.claude.com) y `GEMINI_API_KEY` desde [aistudio.google.com](https://aistudio.google.com).
- `NEKO_CLAVE_ACCESO`: una frase larga; ponla también en *Blanquita → Ajustes* en la app.
- Modelos por defecto: `claude-sonnet-5-5` y `gemini-3.8-flash` (`ANTHROPIC_MODEL` / `GEMINI_MODEL`).

> Con tus llaves personales, lo que escribas se envía a Anthropic o Google con tu cuenta. Antes de pegar información confidencial del trabajo, revisa la política de tu organización.

### 3.5 Notificaciones y recordatorios
1. En tu compu: `npx web-push generate-vapid-keys`. Copia la llave pública a `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y la privada a `VAPID_PRIVATE_KEY`. Pon tu correo en `VAPID_SUBJECT` (`mailto:tu@correo.com`).
2. Inventa una frase larga para `CRON_SECRET`.
3. **Redeploy** en Vercel para que tome todas las variables.
4. En Supabase: **Database → Extensions** → activa `pg_cron` y `pg_net`.
5. **SQL Editor**: copia el bloque comentado del final de `0003`, cambia `TU-APP` y `TU_CRON_SECRET`, quita los `--` y ejecútalo.
6. En la app: **Ajustes → Notificaciones → Activar** y luego **Probar**.

### 3.6 Instalarla en tu Samsung
1. Abre tu dirección de Vercel en Chrome o Samsung Internet y entra con tu cuenta.
2. **Ajustes → App en tu celular → Instalar NekoTask**. Si no aparece el botón: menú → *Instalar app* o *Agregar a pantalla de inicio*.
3. Mantén presionado el ícono para los atajos: **+250 ml**, **Nueva tarea**, **Blanquita** y **Calendario**.
4. En Samsung Notes: abre una nota → *Compartir* → **NekoTask**. Se guarda como nota y puedes convertirla en tarea.
5. En la compu entra con la misma cuenta: todo aparece igual.

---

## 4. Calendario y Blanquita

- **Calendario:** semana o día, mini mes y "Lo que viene". Junta eventos propios, de Google, tareas con fecha, citas de las gatitas y Pomodoros hechos. Lo que crees también se guarda en Google, y lo de Google se sincroniza al abrir, al cambiar de semana y al volver a la pestaña.
- **Blanquita:** modos Platicar, Redactar, Resumir, Ideas, Desglosar y Planear mi día. Cada respuesta se copia, se guarda como nota o como tarea. Cada tarea tiene **Desglosar con Blanquita**.

## 5. Base de datos

| Tabla | Para qué |
|---|---|
| `sync_registros` | **Fuente principal**: todo lo de la app, un registro por elemento (con vistas `v_tareas`, `v_registro_agua`, `v_notas`) |
| `suscripciones_push` · `recordatorios_enviados` | dispositivos que reciben avisos y avisos ya mandados |
| Tablas de `0001` y `0002` | modelo detallado de referencia (tareas, hábitos, gatitas, calendario, IA…). La app todavía no escribe en ellas |

Las tres migraciones se validaron en PostgreSQL 16.

## 6. Vista previa en claude.ai

`npm run vista-previa` genera el mismo Dashboard en un HTML suelto: datos en ese navegador, Blanquita con Claude desde tu cuenta de claude.ai y recordatorios dentro de la app. Cuenta, Google Calendar, Gemini, instalación y notificaciones del celular funcionan al desplegar en Vercel.

## 7. Croquetas

| Acción | Croquetas |
|---|---|
| Completar tarea | 3 (baja) · 5 (media) · 8 (alta) · 10 (urgente) |
| Marcar hábito · rutina completa | 3 · +5 |
| Registrar bebida · llegar a la meta | 1 (máx. 10 al día) · +10 |
| Pomodoro completo | 4 |
| Cuidar a una gatita · cita cumplida | 2 · 5 |
