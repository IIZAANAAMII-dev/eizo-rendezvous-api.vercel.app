-- Inscriptions aux événements EIZO faites via un formulaire Shopify (Globo Form Builder),
-- ex. https://eizo.fr/pages/rencontre-2026. Ces demandes ne passent pas par le widget
-- de réservation : elles sont envoyées par la page vers /api/events/inscriptions/<slug>.
create table if not exists public.eizo_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null check (event_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  email text not null check (email = lower(email)),
  first_name text not null default '',
  last_name text not null default '',
  company text not null default '',
  job_title text not null default '',
  slot text not null default '',
  message text not null default '',
  consent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','confirmed','refused','cancelled','completed','no_show')),
  source text not null default 'globo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_slug, email)
);
create index if not exists eizo_event_registrations_created
  on public.eizo_event_registrations (event_slug, created_at desc);

alter table public.eizo_event_registrations enable row level security;
revoke all on public.eizo_event_registrations from anon, authenticated;
grant select, insert, update on public.eizo_event_registrations to service_role;

-- Permet de libérer une période si l'envoi SMTP échoue (table créée par 202611160002).
grant delete on public.eizo_event_reports to service_role;
-- Les envois de synthèse sont tracés par portée : 'global' (équipe) et 'global-dev' (test).
