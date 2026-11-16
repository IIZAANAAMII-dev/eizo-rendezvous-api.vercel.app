create table public.eizo_event_reports (
  scope text not null,
  cadence text not null check (cadence in ('jour','semaine')),
  period_start date not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (scope,cadence,period_start)
);
alter table public.eizo_event_reports enable row level security;
revoke all on public.eizo_event_reports from anon, authenticated;
grant select, insert, update on public.eizo_event_reports to service_role;
