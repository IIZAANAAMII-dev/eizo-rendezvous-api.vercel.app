-- Synthèse tous les deux jours + liens « choisir mon mot de passe » à usage unique.
alter table public.eizo_event_reports drop constraint if exists eizo_event_reports_cadence_check;
alter table public.eizo_event_reports add constraint eizo_event_reports_cadence_check check (cadence in ('jour','2jours','semaine'));
create table if not exists public.eizo_event_password_links (
  jti uuid primary key,
  email text not null,
  used_at timestamptz not null default now()
);
alter table public.eizo_event_password_links enable row level security;
revoke all on public.eizo_event_password_links from anon, authenticated;
grant select, insert on public.eizo_event_password_links to service_role;
