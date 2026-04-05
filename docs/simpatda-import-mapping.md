# SIMPATDA Import Mapping

Dokumen ini merangkum subset kolom yang dipilih dari dump SIMPATDA agar lebih relevan untuk kontrak import project ini.

## Prinsip

- Jangan menyalin semua kolom tabel SIMPATDA mentah.
- Gunakan hanya kolom yang benar-benar dipakai app ini saat create/import.
- Untuk `Objek Pajak`, prioritaskan referensi semantic:
  - `npwpd`
  - `no_rek_pajak`
  daripada ID internal `wp_id` dan `rek_pajak_id`.

## WP

Sumber acuan:
- `PATDA_WP.json`

Kolom SIMPATDA yang paling relevan:
- `CPM_NAMA_WP`
- `CPM_ALAMAT_WP`
- `CPM_KECAMATAN_WP`
- `CPM_KELURAHAN_WP`
- `CPM_TELEPON_WP`
- `CPM_EMAIL_WP`
- `CPM_NIK_WP`
- `CPM_NPWP`
- `CPM_NPWPD`:
  dipakai sebagai key update bila match ke WP existing, dan akan ikut disimpan bila row masuk jalur create baru dari import.

Sample target project:
- `jenis_wp`
- `peran_wp`
- `status_aktif`
- `nama_subjek`
- `nik_subjek`
- `alamat_subjek`
- `kecamatan_subjek`
- `kelurahan_subjek`
- `telepon_wa_subjek`
- `email_subjek`
- `nama_badan_usaha`
- `npwp_badan_usaha`
- `alamat_badan_usaha`
- `kecamatan_badan_usaha`
- `kelurahan_badan_usaha`
- `telepon_badan_usaha`
- `email_badan_usaha`

Catatan:
- Jika dump SIMPATDA belum memisahkan penanggung jawab dan badan usaha, operator tetap perlu memutuskan mana yang masuk ke `nama_subjek` dan mana yang masuk ke `nama_badan_usaha`.
- File sample WP di repo memakai placeholder `ISI_*` untuk field yang wajib di app ini tetapi kosong di dump contoh.
- Jika CSV membawa `npwpd` dan nilainya cocok tepat satu WP existing, import WP akan masuk jalur update parsial.
- Jika CSV membawa `npwpd` dan nilainya belum ditemukan, import WP tetap boleh create dan `npwpd` itu akan disimpan pada row baru.
- Jika CSV tidak membawa `npwpd`, import WP tetap boleh create, tetapi backend dapat mengembalikan warning duplikasi non-blocking berdasarkan `nik` atau `npwp_badan_usaha`.
- Field kosong pada CSV WP tidak akan menghapus nilai existing saat row masuk jalur update.

## OP PBJT Makanan dan Minuman

Sumber acuan:
- `PATDA_RESTORAN_PROFIL.json`

Kolom SIMPATDA yang paling relevan:
- `CPM_NPWPD` -> `npwpd`
- `CPM_REKENING` -> diterjemahkan ke rekening aktif project ini
- `CPM_NAMA_OP` -> `nama_op`
- `CPM_ALAMAT_OP` -> `alamat_op`
- `CPM_KECAMATAN_OP` -> `kecamatan_id`
- `CPM_KELURAHAN_OP` -> `kelurahan_id`
- `CPM_AKTIF` -> `status`

Penyesuaian penting:
- Kode rekening SIMPATDA lama untuk restoran tidak dipakai mentah jika tidak cocok dengan master rekening aktif project ini.
- Untuk project ini, sample PBJT Makanan dan Minuman memakai `no_rek_pajak=4.1.01.19.01.0001`.
- Detail PBJT Makanan dan Minuman bersifat opsional saat import; jika sumber belum punya detail final yang valid, sample minimal boleh tanpa kolom `detail_*`.
- Identity import OP memakai kombinasi `npwpd + no_rek_pajak|nama_rek_pajak + nama_op`.
- `nopd` boleh ikut dibawa sebagai cek konsistensi, tetapi bukan key utama matching.
- Jika row cocok ke OP existing, update berjalan dengan patch non-empty saja; field kosong pada CSV tidak menghapus nilai lama.

Sample target project minimal:
- `npwpd`
- `no_rek_pajak`
- `nama_op`
- `alamat_op`
- `kecamatan_id`
- `kelurahan_id`
- `status`

Artefak sample:
- [simpatda-wp-import-sample.csv](D:\Code\OKUS-Map-Explorer\docs\samples\simpatda-wp-import-sample.csv)
- [simpatda-op-pbjt-makanan-import-sample.csv](D:\Code\OKUS-Map-Explorer\docs\samples\simpatda-op-pbjt-makanan-import-sample.csv)
