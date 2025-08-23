-- Core credits schema and RPCs
-- Run this in Supabase SQL editor as SERVICE ROLE or via migration

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Balances table (single row per user)
CREATE TABLE IF NOT EXISTS public.balances (
  user_id uuid PRIMARY KEY,
  amount bigint NOT NULL DEFAULT 0,
  purchased_credits integer NOT NULL DEFAULT 0,
  winnings_credits integer NOT NULL DEFAULT 0,
  bonus_credits integer NOT NULL DEFAULT 0,
  last_purchase_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Simple updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_balances_set_updated_at ON public.balances;
CREATE TRIGGER trg_balances_set_updated_at
BEFORE UPDATE ON public.balances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Credit ledger for audit + idempotency
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta bigint NOT NULL,
  reason text,
  idempotency_key text,
  balance_after bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);

-- Minimal credit_transactions table used by add-credits API (idempotent on tx_hash)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tx_hash text UNIQUE,
  credits_purchased integer NOT NULL,
  ada_spent numeric(10,2),
  transaction_type text NOT NULL DEFAULT 'purchase',
  wallet_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON public.credit_transactions(user_id);

-- RPC: credit_apply_and_log
-- Atomically apply a delta to balances.amount, with optional idempotency key.
-- Returns the new balance as bigint.
CREATE OR REPLACE FUNCTION public.credit_apply_and_log(
  p_user_id uuid,
  p_delta numeric,
  p_reason text DEFAULT NULL,
  p_key text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_current bigint;
  v_new bigint;
  v_exists int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Idempotency: if key was already used, return current balance
  IF p_key IS NOT NULL THEN
    SELECT 1 INTO v_exists FROM public.credit_ledger WHERE idempotency_key = p_key LIMIT 1;
    IF FOUND THEN
      SELECT amount INTO v_current FROM public.balances WHERE user_id = p_user_id;
      RETURN COALESCE(v_current, 0);
    END IF;
  END IF;

  -- Ensure balance row exists, then lock it
  INSERT INTO public.balances(user_id, amount)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT amount INTO v_current FROM public.balances WHERE user_id = p_user_id FOR UPDATE;
  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  v_new := v_current + COALESCE(CAST(p_delta AS bigint), 0);

  -- Prevent negative balance
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE public.balances
  SET amount = v_new
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger(user_id, delta, reason, idempotency_key, balance_after)
  VALUES (p_user_id, COALESCE(CAST(p_delta AS bigint), 0), p_reason, p_key, v_new);

  RETURN v_new;
END;
$$;

-- Optional: allow authenticated to call the RPC if desired (server uses service role already)
GRANT EXECUTE ON FUNCTION public.credit_apply_and_log(uuid, numeric, text, text) TO authenticated;


