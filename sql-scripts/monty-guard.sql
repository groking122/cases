-- One-active-session guard (choose A or B)

-- A) Light index to quickly find active sessions
create index if not exists idx_monty_user_active
on public.monty_sessions(user_id)
where is_settled = false;

-- B) Strict trigger preventing parallel active sessions
create or replace function public.monty_no_parallel()
returns trigger language plpgsql as $$
begin
  if new.is_settled = false then
    if exists (
      select 1 from public.monty_sessions
      where user_id = new.user_id and is_settled = false
    ) then
      raise exception 'user already has an active monty session';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_monty_no_parallel on public.monty_sessions;
create trigger trg_monty_no_parallel
before insert on public.monty_sessions
for each row execute function public.monty_no_parallel();


