-- Atomic credit change with idempotency and audit logging
-- Prereqs:
--   - balances(user_id UUID PRIMARY KEY, amount BIGINT)
--   - credit_events(key TEXT UNIQUE, user_id UUID, delta BIGINT, reason TEXT, created_at TIMESTAMPTZ DEFAULT now())

CREATE OR REPLACE FUNCTION credit_apply_and_log(
  p_user_id UUID,
  p_delta   BIGINT,
  p_reason  TEXT,
  p_key     TEXT
) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE new_amount BIGINT;
BEGIN
  -- Idempotency: if key already used, return current balance
  IF p_key IS NOT NULL THEN
    PERFORM 1 FROM credit_events WHERE key = p_key;
    IF FOUND THEN
      SELECT amount INTO new_amount FROM balances WHERE user_id = p_user_id;
      RETURN COALESCE(new_amount, 0);
    END IF;
  END IF;

  -- Ensure balance row exists
  INSERT INTO balances(user_id, amount) VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Guarded update: never go below zero
  UPDATE balances
     SET amount = amount + p_delta
   WHERE user_id = p_user_id
     AND amount + p_delta >= 0
  RETURNING amount INTO new_amount;

  IF new_amount IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Audit log (enforces idempotency via unique key)
  INSERT INTO credit_events(user_id, delta, reason, key)
  VALUES (p_user_id, p_delta, left(COALESCE(p_reason, ''), 128), p_key);

  RETURN new_amount;

EXCEPTION WHEN unique_violation THEN
  -- Racing duplicate key: treat as idempotent success
  SELECT amount INTO new_amount FROM balances WHERE user_id = p_user_id;
  RETURN COALESCE(new_amount, 0);
END; $$;


