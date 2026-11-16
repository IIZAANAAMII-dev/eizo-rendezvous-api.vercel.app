create table public.eizo_events (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  starts_on date,
  created_at timestamptz not null default now()
);
create table public.eizo_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.eizo_events(slug),
  source_id text not null,
  registered_at timestamptz not null,
  name text not null,
  email text not null,
  company text not null default '',
  sector text not null default '',
  status text not null default 'Nouveau' check (status in ('Nouveau','Contacté','Confirmé','Annulé')),
  notes text not null default '',
  unique (event_slug, source_id)
);
create index eizo_event_participants_date on public.eizo_event_participants (event_slug, registered_at desc, id);
alter table public.eizo_events enable row level security;
alter table public.eizo_event_participants enable row level security;
revoke all on public.eizo_events, public.eizo_event_participants from anon, authenticated;
grant select, insert on public.eizo_events to service_role;
grant select, insert, update on public.eizo_event_participants to service_role;
create view public.eizo_event_counts with (security_invoker = true) as
  select event.slug, count(participant.id)::integer as registrations
  from public.eizo_events event
  left join public.eizo_event_participants participant on participant.event_slug = event.slug
  group by event.slug;
revoke all on public.eizo_event_counts from anon, authenticated;
grant select on public.eizo_event_counts to service_role;
insert into public.eizo_events(slug,title) values ('rencontre-2026','Les Rencontres EIZO 2026');
