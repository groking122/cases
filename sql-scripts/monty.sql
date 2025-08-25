create table if not exists public.monty_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid null,
  winning_door smallint not null,
  first_pick smallint null,
  reveal_door smallint null,
  did_switch boolean null,
  final_door smallint null,
  payout int null,
  is_settled boolean not null default false,
  server_seed text null,
  server_seed_hash text null,
  created_at timestamptz not null default now(),
  settled_at timestamptz null
);

create index if not exists idx_monty_user_created on public.monty_sessions(user_id, created_at);
create index if not exists idx_monty_settled on public.monty_sessions(is_settled, created_at);

alter table public.monty_sessions enable row level security;
drop policy if exists srw_monty_all on public.monty_sessions;
create policy srw_monty_all on public.monty_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


