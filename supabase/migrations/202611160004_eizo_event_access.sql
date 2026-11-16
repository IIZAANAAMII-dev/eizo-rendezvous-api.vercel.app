-- Accès au back-office EIZO Events, par personne.
-- events : slugs des événements visibles ('*' = tous). Les autres rendez-vous ne sont
-- ni affichés, ni exportés, ni modifiables, ni inclus dans sa synthèse du lundi.
create table if not exists public.eizo_event_access (
  email text primary key check (email = lower(email)),
  role text not null default 'reader' check (role in ('admin','reader')),
  events text[] not null default '{}',
  weekly_report boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.eizo_event_access enable row level security;
revoke all on public.eizo_event_access from anon, authenticated;
grant select, insert, update, delete on public.eizo_event_access to service_role;
insert into public.eizo_event_access (email, role, events) values
  ('klegarrec@feeder.fr','admin','{*}'),
  ('ldesnos@feeder.fr','reader','{rencontre-2026}'),
  ('sboll@feeder.fr','reader','{rencontre-2026}'),
  ('glouis@feeder.fr','reader','{rencontre-2026}'),
  ('fred.rol@feeder.fr','reader','{rencontre-2026}'),
  ('eevain@feeder.fr','reader','{rencontre-2026}'),
  ('direction@feeder.fr','reader','{rencontre-2026}'),
  ('ctissier@feeder.fr','reader','{rencontre-2026}')
on conflict (email) do nothing;
