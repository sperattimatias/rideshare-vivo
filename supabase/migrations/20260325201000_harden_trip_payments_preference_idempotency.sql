/*
  # Harden trip payments for backend source-of-truth and idempotency
*/

ALTER TABLE trip_payments
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS preference_init_point text,
  ADD COLUMN IF NOT EXISTS preference_sandbox_init_point text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz;

-- Backfill data for existing rows created before preference/payment split was hardened
UPDATE trip_payments
SET
  external_reference = COALESCE(external_reference, trip_id::text),
  mp_preference_id = COALESCE(mp_preference_id, mp_payment_id)
WHERE external_reference IS NULL OR mp_preference_id IS NULL;

ALTER TABLE trip_payments
  ALTER COLUMN external_reference SET NOT NULL;

-- Ensure we can register preference first and payment id later via webhook
ALTER TABLE trip_payments
  ALTER COLUMN mp_payment_id DROP NOT NULL;

-- Deduplicate by trip_id before adding uniqueness (keep newest row)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY trip_id
      ORDER BY COALESCE(approved_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM trip_payments
)
DELETE FROM trip_payments tp
USING ranked r
WHERE tp.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trip_payments_trip_id_unique'
  ) THEN
    ALTER TABLE trip_payments
      ADD CONSTRAINT trip_payments_trip_id_unique UNIQUE (trip_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_payments_external_reference_unique
  ON trip_payments(external_reference);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_payments_mp_preference_id_unique
  ON trip_payments(mp_preference_id)
  WHERE mp_preference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_payments_idempotency_key_unique
  ON trip_payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_payments_last_webhook_at
  ON trip_payments(last_webhook_at DESC);
