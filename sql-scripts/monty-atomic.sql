-- Atomic functions for Monty debit/create and credit/settle

create or replace function public.monty_start_atomic(
  p_user_id uuid,
  p_cost int,
  p_winning_door smallint,
  p_server_seed text,
  p_server_seed_hash text,
  p_idem_key text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  -- Idempotent debit using unique index on credit_events(idempotency_key)
  insert into public.credit_events(user_id, delta, reason, idempotency_key)
  values (p_user_id, -p_cost, 'bet:monty', p_idem_key);

  insert into public.monty_sessions(user_id, winning_door, server_seed, server_seed_hash)
  values (p_user_id, p_winning_door, p_server_seed, p_server_seed_hash)
  returning id into v_session_id;

  return v_session_id;

exception
  when unique_violation then
    -- Debit already exists for this idempotency key; reuse last active session
    select id into v_session_id
    from public.monty_sessions
    where user_id = p_user_id
      and is_settled = false
    order by created_at desc
    limit 1;
    if v_session_id is null then
      raise exception 'idempotent debit exists but no active session found';
    end if;
    return v_session_id;
end $$;

create or replace function public.monty_settle_atomic(
  p_session_id uuid,
  p_user_id uuid,
  p_payout int,
  p_idem_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settled boolean;
begin
  -- Lock the session row and check ownership
  perform 1 from public.monty_sessions
   where id = p_session_id and user_id = p_user_id
   for update;
  if not found then
    raise exception 'session not found';
  end if;

  select is_settled into v_settled from public.monty_sessions where id = p_session_id;
  if v_settled then
    return; -- already settled (idempotent)
  end if;

  -- Idempotent credit
  insert into public.credit_events(user_id, delta, reason, idempotency_key)
  values (p_user_id, p_payout, 'win:monty', p_idem_key);

  update public.monty_sessions
  set payout = p_payout, is_settled = true, settled_at = now()
  where id = p_session_id;
end $$;


