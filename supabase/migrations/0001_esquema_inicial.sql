-- ════════════════════════════════════════════════════════════════════
--  NekoTask Studio — Esquema inicial (Supabase / PostgreSQL)
--  Ejecutar en: Supabase → SQL Editor, o `supabase db push`
--  Todas las tablas usan RLS: cada usuaria solo ve sus propios datos.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Tipos enumerados ───────────────────────────────────────────────
create type prioridad_tarea   as enum ('baja', 'media', 'alta', 'urgente');
create type estado_tarea      as enum ('pendiente', 'en_progreso', 'completada', 'archivada');
create type origen_registro   as enum ('app', 'widget', 'whatsapp', 'telegram', 'ia', 'calendario', 'samsung_notes', 'importacion');
create type tipo_entrada_tiempo as enum ('pomodoro', 'descanso', 'manual');
create type tipo_habito       as enum ('si_no', 'cantidad', 'tiempo', 'dejar');
create type frecuencia_habito as enum ('diaria', 'dias_semana', 'veces_semana');
create type rutina_habito     as enum ('manana', 'dia', 'noche', 'ninguna');
create type tipo_cuidado      as enum ('comida', 'agua_fresca', 'arenero', 'cepillado', 'juego',
                                       'vacuna', 'desparasitacion', 'veterinario', 'medicamento');
create type canal_mensaje     as enum ('whatsapp', 'telegram');
create type clasificacion_mensaje as enum ('tarea', 'nota', 'bebida', 'habito', 'cuidado', 'desconocido');
create type estado_mensaje    as enum ('recibido', 'procesado', 'error', 'ignorado');
create type proveedor_ia      as enum ('claude', 'gemini');

-- ─── Utilidad: actualizar `actualizado_en` ──────────────────────────
create or replace function tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  AJUSTES DE USUARIO (user_settings)
-- ════════════════════════════════════════════════════════════════════
create table ajustes_usuario (
  usuario_id            uuid primary key references auth.users(id) on delete cascade,
  nombre                text,
  zona_horaria          text        not null default 'America/Mexico_City',
  meta_agua_ml          int         not null default 2000 check (meta_agua_ml between 250 and 8000),
  hora_inicio_dia       time        not null default '07:00',
  hora_fin_dia          time        not null default '23:00',
  gatita_principal_id   uuid,       -- FK se agrega después de crear `gatitas`
  proveedor_ia          proveedor_ia not null default 'claude',
  sonidos_activos       boolean     not null default true,
  pomodoro_trabajo_min  int         not null default 25,
  pomodoro_descanso_min int         not null default 5,
  croquetas             int         not null default 0 check (croquetas >= 0),
  whatsapp_numero       text unique,          -- 521XXXXXXXXXX, para enlazar mensajes entrantes
  telegram_chat_id      text unique,
  google_calendar_id    text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);
create trigger t_ajustes_actualizado before update on ajustes_usuario
  for each row execute function tocar_actualizado_en();

-- ════════════════════════════════════════════════════════════════════
--  TAREAS (tasks) + CHECKLIST
-- ════════════════════════════════════════════════════════════════════
create table tareas (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  tarea_padre_id   uuid references tareas(id) on delete cascade,   -- subpasos generados por IA
  titulo           text not null check (char_length(titulo) between 1 and 300),
  descripcion      text,
  prioridad        prioridad_tarea not null default 'media',
  estado           estado_tarea    not null default 'pendiente',
  etiquetas        text[]          not null default '{}',
  fecha_limite     timestamptz,          -- cuándo vence / cuándo está agendada
  recordatorio_en  timestamptz,
  estimado_min     int check (estimado_min is null or estimado_min > 0),
  real_min         int not null default 0,   -- caché de la suma de entradas_tiempo
  origen           origen_registro not null default 'app',
  google_event_id  text,
  orden            int not null default 0,
  completada_en    timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);
create index tareas_usuario_estado_idx on tareas (usuario_id, estado, fecha_limite);
create index tareas_etiquetas_idx on tareas using gin (etiquetas);
create unique index tareas_google_evento_uq on tareas (usuario_id, google_event_id) where google_event_id is not null;
create trigger t_tareas_actualizado before update on tareas
  for each row execute function tocar_actualizado_en();

create table tarea_checklist (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  tarea_id    uuid not null references tareas(id) on delete cascade,
  texto       text not null,
  hecho       boolean not null default false,
  orden       int not null default 0
);
create index checklist_tarea_idx on tarea_checklist (tarea_id, orden);

-- ════════════════════════════════════════════════════════════════════
--  ENTRADAS DE TIEMPO (time_entries) — Pomodoro / tiempo real
-- ════════════════════════════════════════════════════════════════════
create table entradas_tiempo (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  tarea_id      uuid references tareas(id) on delete set null,
  tipo          tipo_entrada_tiempo not null default 'pomodoro',
  inicio        timestamptz not null default now(),
  fin           timestamptz,
  duracion_seg  int generated always as (
                  case when fin is null then null
                       else greatest(0, extract(epoch from (fin - inicio))::int) end
                ) stored,
  completo      boolean not null default false,   -- ¿el pomodoro llegó a su fin?
  creado_en     timestamptz not null default now(),
  check (fin is null or fin >= inicio)
);
create index entradas_tiempo_tarea_idx on entradas_tiempo (tarea_id);
create index entradas_tiempo_usuario_idx on entradas_tiempo (usuario_id, inicio desc);

-- Mantiene `tareas.real_min` sincronizado
create or replace function recalcular_tiempo_real()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tarea uuid := coalesce(new.tarea_id, old.tarea_id);
begin
  if v_tarea is not null then
    update tareas
       set real_min = coalesce((select sum(duracion_seg) / 60
                                  from entradas_tiempo
                                 where tarea_id = v_tarea and tipo <> 'descanso'), 0)
     where id = v_tarea;
  end if;
  return null;
end $$;
create trigger t_entradas_tiempo_real
  after insert or update or delete on entradas_tiempo
  for each row execute function recalcular_tiempo_real();

-- ════════════════════════════════════════════════════════════════════
--  HIDRATACIÓN: tipos de bebida + registro_agua (water_log)
-- ════════════════════════════════════════════════════════════════════
create table tipos_bebida (
  id                      uuid primary key default gen_random_uuid(),
  usuario_id              uuid not null references auth.users(id) on delete cascade,
  nombre                  text not null,
  icono                   text not null default 'agua',      -- clave de <IconoNeko>
  color                   text not null default '#67c7f0',
  porcentaje_hidratacion  int  not null default 100 check (porcentaje_hidratacion between 0 and 100),
  tamanos_rapidos_ml      int[] not null default '{250,350,500}',
  orden                   int  not null default 0,
  activo                  boolean not null default true,
  unique (usuario_id, nombre)
);

create table registro_agua (
  id                   uuid primary key default gen_random_uuid(),
  usuario_id           uuid not null references auth.users(id) on delete cascade,
  tipo_bebida_id       uuid references tipos_bebida(id) on delete set null,
  cantidad_ml          int not null check (cantidad_ml between 1 and 3000),
  -- Se guarda el % vigente al registrar: si después lo cambias, el historial no se altera
  porcentaje_aplicado  int not null default 100 check (porcentaje_aplicado between 0 and 100),
  ml_efectivos         int generated always as (cantidad_ml * porcentaje_aplicado / 100) stored,
  origen               origen_registro not null default 'app',
  registrado_en        timestamptz not null default now()
);
create index registro_agua_usuario_fecha_idx on registro_agua (usuario_id, registrado_en desc);

-- ════════════════════════════════════════════════════════════════════
--  HÁBITOS (habits) + registro diario
-- ════════════════════════════════════════════════════════════════════
create table habitos (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references auth.users(id) on delete cascade,
  nombre             text not null check (char_length(nombre) between 1 and 80),
  icono              text not null default 'estrella',
  color              text not null default '#a78bfa',
  tipo               tipo_habito not null default 'si_no',
  meta_cantidad      numeric,          -- p. ej. 20 (páginas) o 30 (min); null para si_no
  unidad             text,             -- 'páginas', 'min', 'veces'
  frecuencia         frecuencia_habito not null default 'diaria',
  dias_semana        smallint[] not null default '{}',   -- 0=domingo … 6=sábado
  veces_por_semana   smallint check (veces_por_semana between 1 and 7),
  rutina             rutina_habito not null default 'ninguna',
  orden_rutina       int not null default 0,
  recordatorio_hora  time,
  vidas_semanales    smallint not null default 1 check (vidas_semanales between 0 and 7), -- "7 vidas"
  archivado          boolean not null default false,
  creado_en          timestamptz not null default now()
);
create index habitos_usuario_idx on habitos (usuario_id, archivado, rutina, orden_rutina);

create table registro_habitos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  habito_id   uuid not null references habitos(id) on delete cascade,
  fecha       date not null,
  valor       numeric not null default 1,
  completado  boolean not null default true,
  usa_vida    boolean not null default false,   -- día salvado con una "vida"
  origen      origen_registro not null default 'app',
  creado_en   timestamptz not null default now(),
  unique (habito_id, fecha)
);
create index registro_habitos_fecha_idx on registro_habitos (usuario_id, fecha desc);

-- Racha actual: días consecutivos completados (o salvados con vida) hasta hoy/ayer
create or replace function racha_habito(p_habito uuid, p_hoy date default current_date)
returns int language sql stable as $$
  with dias as (
    select fecha from registro_habitos
     where habito_id = p_habito and (completado or usa_vida)
  ),
  inicio as (
    select case when exists (select 1 from dias where fecha = p_hoy) then p_hoy
                else p_hoy - 1 end as d
  ),
  serie as (
    select g::date as fecha
      from inicio, generate_series((select d from inicio), (select d from inicio) - 3650, interval '-1 day') g
  )
  select count(*)::int from (
    select s.fecha, (s.fecha in (select fecha from dias)) as ok,
           sum(case when s.fecha in (select fecha from dias) then 0 else 1 end)
             over (order by s.fecha desc) as cortes
      from serie s
  ) x where ok and cortes = 0;
$$;

-- Registro de sueño y estado de ánimo (hábitos de bienestar)
create table registro_sueno (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  fecha       date not null,
  dormir_en   timestamptz,
  despertar_en timestamptz,
  calidad     smallint check (calidad between 1 and 5),
  unique (usuario_id, fecha)
);

create table estado_animo (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  fecha       date not null,
  animo       smallint not null check (animo between 1 and 5),   -- se dibuja con caritas gatunas
  nota        text,
  unique (usuario_id, fecha)
);

-- ════════════════════════════════════════════════════════════════════
--  GATITAS + CUIDADOS
-- ════════════════════════════════════════════════════════════════════
create table gatitas (
  id                   uuid primary key default gen_random_uuid(),
  usuario_id           uuid not null references auth.users(id) on delete cascade,
  clave                text not null,          -- 'blanquita' | 'bizca' | 'mango' | 'ronro' (perfil visual)
  nombre               text not null,
  rol                  text,                   -- 'agua', 'tareas', 'pomodoro', 'descanso'
  perfil_visual        jsonb not null default '{}'::jsonb,  -- colores/manchas para el SVG
  fecha_adopcion       date,
  fecha_nacimiento     date,
  peso_kg              numeric(4,2),
  notas                text,
  accesorio_equipado   text,
  orden                int not null default 0,
  creado_en            timestamptz not null default now(),
  unique (usuario_id, clave)
);

alter table ajustes_usuario
  add constraint ajustes_gatita_principal_fk
  foreign key (gatita_principal_id) references gatitas(id) on delete set null;

create table cuidados_gatitas (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  gatita_id        uuid not null references gatitas(id) on delete cascade,
  tipo             tipo_cuidado not null,
  programado_para  timestamptz,       -- citas: vacuna, veterinario…
  realizado_en     timestamptz,       -- null = pendiente
  recurrencia_dias int check (recurrencia_dias is null or recurrencia_dias > 0),
  notas            text,
  creado_en        timestamptz not null default now()
);
create index cuidados_gatita_idx on cuidados_gatitas (gatita_id, tipo, realizado_en desc);
create index cuidados_pendientes_idx on cuidados_gatitas (usuario_id, programado_para) where realizado_en is null;

-- ════════════════════════════════════════════════════════════════════
--  CROQUETAS (moneda) + ACCESORIOS + LOGROS
-- ════════════════════════════════════════════════════════════════════
create table movimientos_croquetas (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  cantidad         int not null check (cantidad <> 0),   -- + ganas, − gastas
  motivo           text not null,                         -- 'tarea_completada', 'habito', 'compra:moño'…
  referencia_tipo  text,
  referencia_id    uuid,
  creado_en        timestamptz not null default now()
);
create index movimientos_croquetas_idx on movimientos_croquetas (usuario_id, creado_en desc);

create or replace function aplicar_movimiento_croquetas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update ajustes_usuario
     set croquetas = croquetas + new.cantidad
   where usuario_id = new.usuario_id;
  -- el CHECK (croquetas >= 0) impide gastar lo que no tienes
  return new;
end $$;
create trigger t_movimiento_croquetas after insert on movimientos_croquetas
  for each row execute function aplicar_movimiento_croquetas();

create table catalogo_accesorios (
  clave   text primary key,
  nombre  text not null,
  precio  int  not null check (precio > 0)
);
insert into catalogo_accesorios (clave, nombre, precio) values
  ('mono',     'Moño rosa',          30),
  ('collar',   'Collar con cascabel', 45),
  ('gorrito',  'Gorrito de fiesta',  60),
  ('lentes',   'Lentes neón',        90),
  ('corona',   'Corona de estrellas', 150);

create table accesorios_usuario (
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  clave          text not null references catalogo_accesorios(clave),
  comprado_en    timestamptz not null default now(),
  primary key (usuario_id, clave)
);

create table logros_usuario (
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  clave            text not null,     -- 'hidratada_30', 'semana_pomodoro'…
  desbloqueado_en  timestamptz not null default now(),
  primary key (usuario_id, clave)
);

-- ════════════════════════════════════════════════════════════════════
--  NOTAS (módulo propio + Samsung Notes vía "Compartir")
-- ════════════════════════════════════════════════════════════════════
create table notas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  titulo          text,
  contenido       text not null default '',
  etiquetas       text[] not null default '{}',
  fijada          boolean not null default false,
  origen          origen_registro not null default 'app',
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create index notas_usuario_idx on notas (usuario_id, fijada desc, actualizado_en desc);
create index notas_busqueda_idx on notas
  using gin (to_tsvector('spanish', coalesce(titulo, '') || ' ' || contenido));
create trigger t_notas_actualizado before update on notas
  for each row execute function tocar_actualizado_en();

-- ════════════════════════════════════════════════════════════════════
--  CALENDARIO (caché de Google Calendar para el cálculo de tiempo libre)
-- ════════════════════════════════════════════════════════════════════
create table eventos_calendario (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  google_event_id  text not null,
  titulo           text not null,
  inicio           timestamptz not null,
  fin              timestamptz not null,
  todo_el_dia      boolean not null default false,
  ocupa_tiempo     boolean not null default true,   -- "transparente" en Google = false
  sincronizado_en  timestamptz not null default now(),
  unique (usuario_id, google_event_id),
  check (fin >= inicio)
);
create index eventos_rango_idx on eventos_calendario (usuario_id, inicio, fin);

-- ════════════════════════════════════════════════════════════════════
--  MENSAJES ENTRANTES (WhatsApp / Telegram → app)
-- ════════════════════════════════════════════════════════════════════
create table mensajes_entrantes (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid references auth.users(id) on delete cascade,
  canal               canal_mensaje not null,
  mensaje_externo_id  text not null,           -- wamid / message_id: evita duplicados por reintentos
  remitente           text not null,
  texto               text,
  clasificacion       clasificacion_mensaje not null default 'desconocido',
  datos_extraidos     jsonb,                   -- salida de la IA {titulo, fecha, ml, …}
  estado              estado_mensaje not null default 'recibido',
  entidad_tipo        text,                    -- 'tareas' | 'notas' | 'registro_agua' …
  entidad_id          uuid,
  error               text,
  recibido_en         timestamptz not null default now(),
  procesado_en        timestamptz,
  unique (canal, mensaje_externo_id)
);
create index mensajes_usuario_idx on mensajes_entrantes (usuario_id, recibido_en desc);

-- ════════════════════════════════════════════════════════════════════
--  VISTAS ÚTILES
-- ════════════════════════════════════════════════════════════════════
create or replace view resumen_hidratacion_diaria
with (security_invoker = true) as
select r.usuario_id,
       (r.registrado_en at time zone a.zona_horaria)::date as fecha,
       sum(r.cantidad_ml)  as ml_totales,
       sum(r.ml_efectivos) as ml_efectivos,
       max(a.meta_agua_ml) as meta_ml
  from registro_agua r
  join ajustes_usuario a using (usuario_id)
 group by r.usuario_id, (r.registrado_en at time zone a.zona_horaria)::date;

-- ════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY — una política "solo lo mío" por tabla
-- ════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'ajustes_usuario','tareas','tarea_checklist','entradas_tiempo','tipos_bebida',
    'registro_agua','habitos','registro_habitos','registro_sueno','estado_animo',
    'gatitas','cuidados_gatitas','movimientos_croquetas','accesorios_usuario',
    'logros_usuario','notas','eventos_calendario','mensajes_entrantes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo_lo_mio" on %I for all
         using (usuario_id = auth.uid()) with check (usuario_id = auth.uid())', t);
  end loop;
end $$;

-- Los movimientos de croquetas solo se insertan (nunca se editan desde el cliente)
drop policy "solo_lo_mio" on movimientos_croquetas;
create policy "leer_mis_croquetas"    on movimientos_croquetas for select using (usuario_id = auth.uid());
create policy "insertar_mis_croquetas" on movimientos_croquetas for insert with check (usuario_id = auth.uid());

-- Los mensajes entrantes los escribe el webhook (service role); la usuaria solo los lee
drop policy "solo_lo_mio" on mensajes_entrantes;
create policy "leer_mis_mensajes" on mensajes_entrantes for select using (usuario_id = auth.uid());

alter table catalogo_accesorios enable row level security;
create policy "catalogo_publico" on catalogo_accesorios for select using (true);

-- ════════════════════════════════════════════════════════════════════
--  DATOS INICIALES al registrarse: ajustes, bebidas, gatitas, hábitos
-- ════════════════════════════════════════════════════════════════════
create or replace function crear_datos_iniciales()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_blanquita uuid;
begin
  insert into ajustes_usuario (usuario_id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));

  insert into tipos_bebida (usuario_id, nombre, icono, color, porcentaje_hidratacion, orden) values
    (new.id, 'Agua',           'agua',  '#67c7f0', 100, 1),
    (new.id, 'Jugo',           'jugo',  '#f5a142', 100, 2),
    (new.id, 'Té',             'te',    '#c9a06b', 100, 3),
    (new.id, 'Agua de sabor',  'sabor', '#f07aa8', 100, 4),
    (new.id, 'Refresco',       'refresco', '#e2575c', 100, 5);

  insert into gatitas (usuario_id, clave, nombre, rol, orden, perfil_visual) values
    (new.id, 'blanquita', 'Blanquita', 'agua', 1,
      '{"pelaje":"#f6f2ee","ojos":"#7fb8e6","mancha_mejilla":true}'),
    (new.id, 'bizca', 'Bizca', 'tareas', 2,
      '{"pelaje":"#ead7c0","rayas":"#c09f80","ojos":"#8fc1e3","ojos_bizcos":true,"hocico_blanco":true}'),
    (new.id, 'mango', 'Mango', 'pomodoro', 3,
      '{"pelaje":"#7d5f48","rayas":"#4c3729","parche":"#e0913f","ojos":"#9cc96b","pecho_blanco":true,"patas_blancas":true}'),
    (new.id, 'ronro', 'Ronro', 'descanso', 4,
      '{"pelaje":"#8e877b","rayas":"#5d564d","panza":"#d9cfbf","ojos":"#c8b26a","cola_anillada":true}');

  select id into v_blanquita from gatitas where usuario_id = new.id and clave = 'blanquita';
  update ajustes_usuario set gatita_principal_id = v_blanquita where usuario_id = new.id;

  insert into habitos (usuario_id, nombre, icono, rutina, orden_rutina) values
    (new.id, 'Lavarse los dientes', 'cepillo', 'manana', 1),
    (new.id, 'Lavarse la cara',     'cara',    'manana', 2),
    (new.id, 'Lavarse los dientes', 'cepillo', 'noche',  1),
    (new.id, 'Lavarse la cara',     'cara',    'noche',  2);

  return new;
end $$;

create trigger t_nueva_usuaria after insert on auth.users
  for each row execute function crear_datos_iniciales();
