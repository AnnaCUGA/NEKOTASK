-- ════════════════════════════════════════════════════════════════════
--  NekoTask Studio — 0002: calendario propio + asistente Blanquita
-- ════════════════════════════════════════════════════════════════════

-- ─── Calendario: eventos propios además de los de Google ───────────────
create type origen_evento as enum ('local', 'google');

alter table eventos_calendario
  alter column google_event_id drop not null,
  add column origen       origen_evento not null default 'google',
  add column descripcion  text,
  add column creado_en    timestamptz not null default now();

-- el unique (usuario_id, google_event_id) sigue funcionando: los NULL no chocan
alter table eventos_calendario
  add constraint eventos_google_tiene_id check (origen = 'local' or google_event_id is not null);

-- ─── Asistente: conversaciones con Blanquita ──────────────────────────
create type modo_ia as enum ('libre', 'desglosar', 'redactar', 'resumir', 'ideas', 'planear');
create type rol_mensaje_ia as enum ('usuaria', 'blanquita');

create table conversaciones_ia (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  titulo          text not null default 'Nueva conversación',
  modo            modo_ia not null default 'libre',
  creada_en       timestamptz not null default now(),
  actualizada_en  timestamptz not null default now()
);
create index conversaciones_ia_usuario_idx on conversaciones_ia (usuario_id, actualizada_en desc);

create table mensajes_ia (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  conversacion_id  uuid not null references conversaciones_ia(id) on delete cascade,
  rol              rol_mensaje_ia not null,
  texto            text not null,
  proveedor        proveedor_ia,            -- solo en respuestas de Blanquita
  modo             modo_ia,
  con_error        boolean not null default false,
  creado_en        timestamptz not null default now()
);
create index mensajes_ia_conversacion_idx on mensajes_ia (conversacion_id, creado_en);

-- mantiene `actualizada_en` al llegar mensajes nuevos
create or replace function tocar_conversacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversaciones_ia set actualizada_en = now() where id = new.conversacion_id;
  return new;
end $$;
create trigger t_mensaje_ia_nuevo after insert on mensajes_ia
  for each row execute function tocar_conversacion();

alter table conversaciones_ia enable row level security;
alter table mensajes_ia enable row level security;
create policy "solo_lo_mio" on conversaciones_ia for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "solo_lo_mio" on mensajes_ia for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Bebida "Refresco" en lugar de "Café" para cuentas creadas con la versión anterior
update tipos_bebida
   set nombre = 'Refresco', icono = 'refresco', color = '#e2575c', porcentaje_hidratacion = 100,
       tamanos_rapidos_ml = '{355,600,1000}'
 where nombre = 'Café' and icono = 'cafe';
