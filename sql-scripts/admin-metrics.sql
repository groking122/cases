-- Admin KPIs: RTP, Pity, Credit Flow, Withdrawals Ops
-- Run this in your database (Supabase SQL editor or psql)

create or replace function public.kpi_rtp(start_ts timestamptz, end_ts timestamptz)
returns table (
  case_id uuid,
  case_name text,
  spins bigint,
  total_cost numeric,
  total_reward numeric,
  rtp numeric,
  house_edge numeric
) language sql stable as $$
  select
    o.case_id,
    c.name as case_name,
    count(*)::bigint as spins,
    sum(o.case_cost)::numeric as total_cost,
    sum(o.reward_value)::numeric as total_reward,
    case when sum(o.case_cost)=0 then 0 else (sum(o.reward_value)::numeric / sum(o.case_cost)) end as rtp,
    case when sum(o.case_cost)=0 then 0 else (1 - (sum(o.reward_value)::numeric / sum(o.case_cost))) end as house_edge
  from public.case_openings o
  join public.cases c on c.id = o.case_id
  where o.created_at >= start_ts and o.created_at < end_ts
  group by 1,2
  order by spins desc;
$$;

create or replace function public.kpi_pity(start_ts timestamptz, end_ts timestamptz)
returns table (
  case_id uuid,
  spins bigint,
  pity_spins bigint,
  pity_rate numeric,
  rtp numeric
) language sql stable as $$
  with base as (
    select case_id, count(*)::bigint spins,
           sum(case when is_pity_activated then 1 else 0 end)::bigint pity_spins,
           sum(reward_value)::numeric reward, sum(case_cost)::numeric cost
    from public.case_openings
    where created_at >= start_ts and created_at < end_ts
    group by 1
  )
  select case_id, spins, pity_spins,
         case when spins=0 then 0 else pity_spins::numeric/spins end as pity_rate,
         case when cost=0 then 0 else reward/cost end as rtp
  from base
  order by pity_rate desc;
$$;

-- Adjust table/columns to your schema if needed
create or replace function public.kpi_credit_flow(start_ts timestamptz, end_ts timestamptz)
returns table (
  purchases numeric,
  winnings_credited numeric,
  withdrawals_gross numeric,
  withdrawals_net numeric,
  platform_fees numeric,
  network_fees numeric
) language sql stable as $$
  with w as (
    select coalesce(sum(net_ada),0)::numeric as net,
           coalesce(sum(gross_ada),0)::numeric as gross,
           coalesce(sum(platform_fee),0)::numeric as platform,
           coalesce(sum(network_fee),0)::numeric as network
    from public.withdrawals
    where created_at >= start_ts and created_at < end_ts
      and status in ('sent','completed')
  ),
  p as (
    select coalesce(sum(ada_amount),0)::numeric as ada
    from public.credit_purchases
    where created_at >= start_ts and created_at < end_ts
  ),
  wc as (
    -- Fallback to credit_events if present
    select coalesce(sum(credits_amount),0)::numeric as credits
    from public.credit_events
    where created_at >= start_ts and created_at < end_ts
      and event_type = 'win_credited'
  )
  select p.ada as purchases,
         wc.credits as winnings_credited,
         w.gross as withdrawals_gross,
         w.net as withdrawals_net,
         w.platform as platform_fees,
         w.network as network_fees
  from p, w, wc;
$$;

create or replace function public.kpi_withdrawals(start_ts timestamptz, end_ts timestamptz)
returns table (
  pending bigint,
  processing bigint,
  sent bigint,
  failed bigint,
  median_payout_minutes numeric,
  avg_payout_minutes numeric
) language sql stable as $$
  with base as (
    select *
    from public.withdrawals
    where created_at >= start_ts and created_at < end_ts
  ),
  tt as (
    select
      percentile_disc(0.5) within group (order by extract(epoch from (sent_at - created_at))/60)::numeric as med_min,
      avg(extract(epoch from (sent_at - created_at))/60)::numeric as avg_min
    from base
    where status in ('sent','completed') and sent_at is not null
  )
  select
    sum(case when status='pending' then 1 else 0 end)::bigint as pending,
    sum(case when status='processing' then 1 else 0 end)::bigint as processing,
    sum(case when status in ('sent','completed') then 1 else 0 end)::bigint as sent,
    sum(case when status='failed' then 1 else 0 end)::bigint as failed,
    coalesce(tt.med_min,0)::numeric as median_payout_minutes,
    coalesce(tt.avg_min,0)::numeric as avg_payout_minutes
  from base, tt;
$$;


