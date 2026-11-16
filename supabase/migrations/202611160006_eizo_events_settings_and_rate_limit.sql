-- Réglages modifiables depuis le back-office (mode d'envoi de la synthèse) et
-- journal anti-abus de l'API publique d'inscription. Téléphone saisissable par un admin.
create table if not exists public.eizo_event_settings (
  key text primary key,
  value text not null,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.eizo_event_settings enable row level security;
revoke all on public.eizo_event_settings from anon, authenticated;
grant select, insert, update on public.eizo_event_settings to service_role;
insert into public.eizo_event_settings (key, value, updated_by) values ('report_mode','dev','installation') on conflict (key) do nothing;

create table if not exists public.eizo_event_ingest_log (
  id bigserial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists eizo_event_ingest_log_ip on public.eizo_event_ingest_log (ip_hash, created_at desc);
alter table public.eizo_event_ingest_log enable row level security;
revoke all on public.eizo_event_ingest_log from anon, authenticated;
grant select, insert, delete on public.eizo_event_ingest_log to service_role;
grant usage on sequence public.eizo_event_ingest_log_id_seq to service_role;

alter table public.eizo_event_registrations add column if not exists phone text not null default '';
