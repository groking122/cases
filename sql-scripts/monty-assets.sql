create table if not exists public.monty_assets (
  key text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

alter table public.monty_assets enable row level security;
drop policy if exists srw_monty_assets_all on public.monty_assets;
create policy srw_monty_assets_all on public.monty_assets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


