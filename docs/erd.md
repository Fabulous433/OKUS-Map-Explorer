# Entity Relationship Diagram (ERD)

## Core Tables

### `wajib_pajak`
- `id` (PK)
- `jenis_wp`, `peran_wp`
- `npwpd` (nullable, partial unique saat not null)
- `status_aktif`
- data pemilik (`nama_wp`, `nik_ktp_wp`, `alamat_wp`, dst)
- data pengelola (`nama_pengelola`, `nik_pengelola`, `alamat_pengelola`, dst)
- `created_at`, `updated_at`

### `wp_badan_usaha`
- `wp_id` (PK/FK -> `wajib_pajak.id`, cascade delete)
- `nama_badan_usaha`, `npwp_badan_usaha`, `alamat_badan_usaha`, dst
- `created_at`, `updated_at`

### `objek_pajak`
- `id` (PK)
- `nopd` (unique)
- `wp_id` (FK -> `wajib_pajak.id`)
- `rek_pajak_id` (FK -> `master_rekening_pajak.id`)
- `nama_op`, `npwp_op`, `alamat_op`
- `kecamatan_id` (FK -> `master_kecamatan.cpm_kec_id`)
- `kelurahan_id` (FK -> `master_kelurahan.cpm_kel_id`)
- `omset_bulanan`, `tarif_persen`, `pajak_bulanan`
- `latitude`, `longitude`
- `status`
- `status_verifikasi` (`draft|verified|rejected`)
- `catatan_verifikasi`, `verified_at`, `verified_by`
- `created_at`, `updated_at`

### `users`
- `id` (PK)
- `username` (unique)
- `password` (hashed/plain legacy)
- `role` (`admin|editor|viewer`)

### Master
- `master_kecamatan` (`cpm_kec_id`, `cpm_kecamatan`, `cpm_kode_kec`, timestamps)
- `master_kelurahan` (`cpm_kel_id`, `cpm_kelurahan`, `cpm_kode_kec`, `cpm_kode_kel`, timestamps)
- `master_rekening_pajak` (`id`, `kode_rekening`, `nama_rekening`, `jenis_pajak`, `is_active`, timestamps)

### OP Detail (1:1 via `op_id` PK/FK)
- `op_detail_pbjt_makan_minum`
- `op_detail_pbjt_perhotelan`
- `op_detail_pbjt_hiburan`
- `op_detail_pbjt_parkir`
- `op_detail_pbjt_tenaga_listrik`
- `op_detail_pajak_reklame`
- `op_detail_pajak_air_tanah`
- `op_detail_pajak_walet`

### Audit
- `audit_log`
  - `id` (PK)
  - `entity_type`, `entity_id`, `action`, `actor_name`
  - `before_data` (jsonb), `after_data` (jsonb), `metadata` (jsonb)
  - `created_at`

## Relationship Summary
- `users` dipakai untuk session auth + RBAC layer aplikasi
- `wajib_pajak (1) -> (N) objek_pajak`
- `wajib_pajak (1) -> (0..1) wp_badan_usaha`
- `master_rekening_pajak (1) -> (N) objek_pajak`
- `master_kecamatan (1) -> (N) objek_pajak`
- `master_kelurahan (1) -> (N) objek_pajak`
- `master_kecamatan (1) -> (N) master_kelurahan` (by `cpm_kode_kec`)
- `objek_pajak (1) -> (0..1) detail_table_by_jenis`

## Constraints & Rules
- Delete master ditolak jika direferensikan OP.
- Verifikasi OP disimpan di kolom dedicated (`status_verifikasi`, `verified_*`).
- Rule conditional bisnis WP/OP tetap enforced di aplikasi (Zod/service), bukan DB CHECK kompleks.

## Performance Indexes (Phase 1.9)
- `objek_pajak`:
  - index list filter (`status_verifikasi`, `status`, `kecamatan_id`, `rek_pajak_id`, `updated_at`, `id`)
  - index `wp_id`
  - index `updated_at,id`
  - expression index bbox map (`latitude::double precision`, `longitude::double precision`)
  - trigram GIN (`nama_op`, `nopd`, `alamat_op`)
- `wajib_pajak`:
  - trigram GIN (`nama_wp`, `nama_pengelola`, `npwpd`)
- `wp_badan_usaha`:
  - trigram GIN (`nama_badan_usaha`, `npwp_badan_usaha`)
