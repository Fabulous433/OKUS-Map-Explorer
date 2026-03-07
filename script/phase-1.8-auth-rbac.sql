-- Phase 1.8 Auth + RBAC (one-off migration)
-- Run manually if database lama belum memiliki kolom users.role.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'viewer';

UPDATE users
SET role = 'viewer'
WHERE role IS NULL
   OR role NOT IN ('admin', 'editor', 'viewer');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'editor', 'viewer'));
  END IF;
END
$$;

COMMIT;
