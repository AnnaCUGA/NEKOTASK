-- ════════════════════════════════════════════════════════════════════
--  NekoTask Studio — 0003: sincronización entre dispositivos + recordatorios
--
--  La app guarda cada elemento (una tarea, un vaso de agua, una nota…)
--  como un registro en `sync_registros`. Así el celular y la compu pueden
--  editar al mismo tiempo, sin conexión, y mezclarse elemento por elemento.
--  Las tablas detalladas de 0001/0002 se quedan como referencia del modelo;
--  las vistas de abajo exponen los datos sincronizados con sus columnas.
-- ════════════════════════════════════════════════════════════════════

create table sync_registros (
  usuario_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  coleccion       text not null check (coleccion ~ '^[a-zA-Z]{2,40}$'),
  id              text not null check (char_length(id) between 1 and 200),
  datos           jsonb not null default '{}'::jsonb,
  borrado         boolean not null default false,
  dispositivo     text,
  actualizado_en  timestamptz not null default now(),
  primary key (usuario_id, coleccion, id)
);
create index sync_registros_cambios_idx on sync_registros (usuario_id, actualizado_en);

-- la hora la pone el servidor: la última escritura gana, sin depender del reloj del celular
create or replace function sync_marcar_hora()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := clock_timestamp();
  return new;
end $$;
create trigger t_sync_hora before insert or update on sync_registros
  for each row execute function sync_marcar_hora();

alter table sync_registros enable row level security;
create policy "solo_lo_mio" on sync_registros for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- cambios en vivo entre dispositivos (Supabase Realtime)
alter publication supabase_realtime add table sync_registros;

-- ─── Vistas legibles (útiles en el Table Editor y para WhatsApp/widget) ─
create or replace view v_tareas with (security_invoker = true) as
select usuario_id, id,
       datos->>'titulo'                         as titulo,
       datos->>'prioridad'                      as prioridad,
       (datos->>'completada')::boolean          as completada,
       (datos->>'fechaLimite')::timestamptz     as fecha_limite,
       (datos->>'estimadoMin')::int             as estimado_min,
       (datos->>'realMin')::int                 as real_min,
       actualizado_en
  from sync_registros
 where coleccion = 'tareas' and not borrado;

create or replace view v_registro_agua with (security_invoker = true) as
select usuario_id, id,
       datos->>'tipoId'                                              as bebida,
       (datos->>'ml')::int                                           as ml,
       ((datos->>'ml')::int * (datos->>'porcentaje')::int / 100)     as ml_efectivos,
       (datos->>'en')::timestamptz                                   as registrado_en
  from sync_registros
 where coleccion = 'registroBebidas' and not borrado;

create or replace view v_notas with (security_invoker = true) as
select usuario_id, id,
       datos->>'titulo'                  as titulo,
       datos->>'contenido'               as contenido,
       datos->>'origen'                  as origen,
       (datos->>'creadoEn')::timestamptz as creado_en
  from sync_registros
 where coleccion = 'notas' and not borrado;

-- ════════════════════════════════════════════════════════════════════
--  NOTIFICACIONES PUSH
-- ════════════════════════════════════════════════════════════════════
create table suscripciones_push (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  dispositivo  text,
  creado_en    timestamptz not null default now()
);
create index suscripciones_push_usuario_idx on suscripciones_push (usuario_id);
alter table suscripciones_push enable row level security;
create policy "solo_lo_mio" on suscripciones_push for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- evita mandar el mismo recordatorio dos veces
create table recordatorios_enviados (
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  clave       text not null,
  enviado_en  timestamptz not null default now(),
  primary key (usuario_id, clave)
);
alter table recordatorios_enviados enable row level security;
create policy "leer_lo_mio" on recordatorios_enviados for select using (usuario_id = auth.uid());

-- limpieza semanal de claves viejas (opcional, ver bloque de cron abajo)
create or replace function limpiar_recordatorios_viejos()
returns void language sql security definer set search_path = public as $$
  delete from recordatorios_enviados where enviado_en < now() - interval '14 days';
$$;

-- ════════════════════════════════════════════════════════════════════
--  CRON: revisar recordatorios cada 10 minutos (Supabase pg_cron + pg_net)
--  1) Dashboard → Database → Extensions: activa pg_cron y pg_net
--  2) Reemplaza TU-APP y TU_CRON_SECRET y ejecuta este bloque aparte
-- ════════════════════════════════════════════════════════════════════
-- select cron.schedule(
--   'neko-recordatorios',
--   '*/10 * * * *',
--   $$ select net.http_post(
--        url     := 'https://TU-APP.vercel.app/api/recordatorios',
--        headers := '{"Authorization": "Bearer TU_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
--        body    := '{}'::jsonb
--      ) $$
-- );
-- select cron.schedule('neko-limpieza', '0 4 * * 0', $$ select limpiar_recordatorios_viejos() $$);
