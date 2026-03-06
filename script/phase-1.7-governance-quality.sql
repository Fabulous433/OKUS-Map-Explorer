-- Phase 1.7 Governance & Quality (manual SQL fallback)
-- Use when `drizzle-kit push` is blocked by interactive constraint prompt.

ALTER TABLE objek_pajak ADD COLUMN IF NOT EXISTS status_verifikasi varchar(20);
ALTER TABLE objek_pajak ALTER COLUMN status_verifikasi SET DEFAULT 'draft';
UPDATE objek_pajak SET status_verifikasi = 'verified' WHERE status_verifikasi IS NULL;
ALTER TABLE objek_pajak ALTER COLUMN status_verifikasi SET NOT NULL;

ALTER TABLE objek_pajak ADD COLUMN IF NOT EXISTS catatan_verifikasi text;
ALTER TABLE objek_pajak ADD COLUMN IF NOT EXISTS verified_at timestamp;
ALTER TABLE objek_pajak ADD COLUMN IF NOT EXISTS verified_by varchar(120);

CREATE TABLE IF NOT EXISTS audit_log (
  id serial PRIMARY KEY,
  entity_type varchar(60) NOT NULL,
  entity_id varchar(120) NOT NULL,
  action varchar(40) NOT NULL,
  actor_name varchar(120) NOT NULL DEFAULT 'system',
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'master_kecamatan_cpm_kode_kec_unique' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT cpm_kode_kec
      FROM master_kecamatan
      GROUP BY cpm_kode_kec
      HAVING count(*) > 1
      LIMIT 1
    ) THEN
      CREATE UNIQUE INDEX master_kecamatan_cpm_kode_kec_unique ON master_kecamatan(cpm_kode_kec);
    END IF;
  END IF;
END $$;
