ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS rejection_reason text;
