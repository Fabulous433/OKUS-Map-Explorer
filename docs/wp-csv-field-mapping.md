# WP CSV Field Mapping Matrix (Model Baru)

Dokumen ini menjadi acuan kontrak CSV endpoint `/api/wajib-pajak/import` dan `/api/wajib-pajak/export` setelah redesign WP.

## Catatan Penting
- `npwpd` **tidak boleh diisi** saat create/import baru.
- `npwpd` diisi melalui endpoint update (`PATCH /api/wajib-pajak/:id`).
- `badan_usaha` diisi sesuai aturan kombinasi `jenis_wp` + `peran_wp`.

## Field Matrix

| CSV Header | API Field | Required | Tipe Data | Keterangan |
| --- | --- | --- | --- | --- |
| `jenis_wp` | `jenisWp` | Ya | `orang_pribadi` \| `badan_usaha` | wajib |
| `peran_wp` | `peranWp` | Ya | `pemilik` \| `pengelola` | wajib |
| `npwpd` | `npwpd` | Tidak | string\|null | create/import baru harus kosong |
| `status_aktif` | `statusAktif` | Tidak | `active` \| `inactive` | default `active` |
| `nama_wp` | `namaWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `nik_ktp_wp` | `nikKtpWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `alamat_wp` | `alamatWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `kecamatan_wp` | `kecamatanWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `kelurahan_wp` | `kelurahanWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `telepon_wa_wp` | `teleponWaWp` | Kondisional | string\|null | wajib saat `peran_wp=pemilik` |
| `email_wp` | `emailWp` | Tidak | email\|null | opsional, validasi format jika diisi |
| `nama_pengelola` | `namaPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `nik_pengelola` | `nikPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `alamat_pengelola` | `alamatPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `kecamatan_pengelola` | `kecamatanPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `kelurahan_pengelola` | `kelurahanPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `telepon_wa_pengelola` | `teleponWaPengelola` | Kondisional | string\|null | wajib saat `peran_wp=pengelola` |
| `nama_badan_usaha` | `badanUsaha.namaBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `npwp_badan_usaha` | `badanUsaha.npwpBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `alamat_badan_usaha` | `badanUsaha.alamatBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `kecamatan_badan_usaha` | `badanUsaha.kecamatanBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `kelurahan_badan_usaha` | `badanUsaha.kelurahanBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `telepon_badan_usaha` | `badanUsaha.teleponBadanUsaha` | Kondisional | string\|null | wajib saat `jenis_wp=badan_usaha` & `peran_wp=pemilik` |
| `email_badan_usaha` | `badanUsaha.emailBadanUsaha` | Tidak | email\|null | opsional |

## Implementasi
- Backend: `server/routes.ts`, `shared/schema.ts`, `server/storage.ts`
- Frontend WP: `client/src/pages/backoffice/wajib-pajak.tsx`
