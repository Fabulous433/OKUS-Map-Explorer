-- Phase 1.9 Performance & Query Hardening (one-off)
-- Fokus: index hardening untuk pagination list, server-side search, dan viewport map query.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- OP list/filter pagination path
CREATE INDEX IF NOT EXISTS idx_objek_pajak_list_filters
  ON objek_pajak (status_verifikasi, status, kecamatan_id, rek_pajak_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_objek_pajak_wp_id
  ON objek_pajak (wp_id);

CREATE INDEX IF NOT EXISTS idx_objek_pajak_updated
  ON objek_pajak (updated_at DESC, id DESC);

-- Viewport map query (bbox)
CREATE INDEX IF NOT EXISTS idx_objek_pajak_lat_lng_cast
  ON objek_pajak ((latitude::double precision), (longitude::double precision))
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Search hardening (server-first)
CREATE INDEX IF NOT EXISTS idx_objek_pajak_nama_op_trgm
  ON objek_pajak USING gin (nama_op gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_objek_pajak_nopd_trgm
  ON objek_pajak USING gin (nopd gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_objek_pajak_alamat_op_trgm
  ON objek_pajak USING gin (alamat_op gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wajib_pajak_nama_wp_trgm
  ON wajib_pajak USING gin (nama_wp gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wajib_pajak_nama_pengelola_trgm
  ON wajib_pajak USING gin (nama_pengelola gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wajib_pajak_npwpd_trgm
  ON wajib_pajak USING gin (npwpd gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wp_badan_usaha_nama_trgm
  ON wp_badan_usaha USING gin (nama_badan_usaha gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_wp_badan_usaha_npwp_trgm
  ON wp_badan_usaha USING gin (npwp_badan_usaha gin_trgm_ops);

COMMIT;
