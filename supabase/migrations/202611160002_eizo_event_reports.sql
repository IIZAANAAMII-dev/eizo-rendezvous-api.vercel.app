create table public.eizo_event_reports (
  event_slug text not null references public.eizo_events(slug),
  cadence text not null check (cadence in ('jour','semaine')),
  period_start date not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (event_slug,cadence,period_start)
);
alter table public.eizo_event_reports enable row level security;
revoke all on public.eizo_event_reports from anon, authenticated;
grant select, insert, update on public.eizo_event_reports to service_role;
