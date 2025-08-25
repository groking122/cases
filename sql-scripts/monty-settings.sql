create table if not exists public.monty_settings (
  id uuid primary key default gen_random_uuid(),
  is_true_monty boolean not null default true,
  cost integer not null default 100,
  payout_win integer not null default 118,
  payout_lose integer not null default 40,
  ev_cap numeric not null default 126,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.monty_settings (is_true_monty, cost, payout_win, payout_lose)
select true, 100, 118, 40
where not exists (select 1 from public.monty_settings);

alter table public.monty_settings enable row level security;
drop policy if exists srw_monty_settings_all on public.monty_settings;
create policy srw_monty_settings_all on public.monty_settings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');


