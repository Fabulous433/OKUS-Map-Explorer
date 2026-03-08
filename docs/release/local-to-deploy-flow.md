# Release Flow — Local ke Staging ke Production

## Tujuan
Memberi alur kerja yang konsisten supaya perubahan dari local development masuk ke staging dulu, diuji, lalu baru dipromosikan ke production.

## Branch Strategy
Gunakan 3 level kerja:
1. `codex/<fitur-atau-task>` untuk kerja harian di local.
2. `codex/staging` sebagai branch deploy candidate untuk environment staging.
3. `main` sebagai branch deploy candidate untuk production.

Catatan:
- Di workspace ini branch staging dibuat sebagai `codex/staging` agar konsisten dengan policy branch lokal.
- Jika nanti kamu ingin branch literal `staging` di Git hosting, itu bisa dibuat/rename terpisah di luar flow kerja agent ini.

## Flow Utama
1. Kerja fitur/bugfix di branch `codex/<fitur-atau-task>`.
2. Jalankan verifikasi local:
   - `npm run check`
   - test/integration yang relevan
   - smoke local bila perlu
3. Commit perubahan dari branch fitur.
4. Push branch fitur ke Git remote.
5. Merge branch fitur ke `codex/staging`.
6. Push `codex/staging` ke remote.
7. EasyPanel staging auto deploy dari branch `codex/staging`.
8. Jalankan test staging:
   - `/health`
   - login backoffice
   - smoke WP/OP/map/master data
   - command operasional staging bila diperlukan
9. Jika staging lulus:
   - merge `codex/staging` ke `main`
   - push `main`
10. Deploy production dari `main`.

## Rule Per Environment

### Local
- Tempat implementasi dan debugging.
- Boleh memakai seed local.
- Tidak dipakai sebagai bukti release.

### Staging
- Sumber code: `codex/staging`
- Deploy: auto deploy dari Git
- Tujuan:
  - validasi build nyata
  - validasi env staging
  - smoke/UAT
  - validasi readiness sebelum prod

### Production
- Sumber code: `main`
- Deploy: manual dulu
- Hanya menerima commit yang sudah pernah hidup di staging.

## Why This Flow
1. Local cepat untuk bikin fitur.
2. Staging jadi pagar keamanan sebelum production.
3. Production tidak langsung menerima commit dari branch fitur.
4. Audit commit lebih jelas karena promosi code terjadi antar branch yang tetap.

## Alur Harian yang Disarankan

### Saat mulai kerja
1. Pastikan branch dasar terbaru:
   - `git switch codex/staging`
   - `git pull`
2. Buat branch fitur baru dari `codex/staging`:
   - `git switch -c codex/nama-fitur`

### Saat fitur selesai
1. Verifikasi local.
2. Commit:
   - `git add ...`
   - `git commit -m "..." `
3. Push:
   - `git push -u origin codex/nama-fitur`

### Saat mau kirim ke staging
1. Pindah ke branch staging:
   - `git switch codex/staging`
2. Merge branch fitur:
   - `git merge codex/nama-fitur`
3. Push:
   - `git push origin codex/staging`
4. Tunggu EasyPanel auto deploy staging.

### Saat staging lulus
1. Pindah ke `main`:
   - `git switch main`
2. Pastikan `main` terbaru:
   - `git pull`
3. Merge branch staging:
   - `git merge codex/staging`
4. Push:
   - `git push origin main`
5. Deploy production dari `main`.

## Production Deploy Policy
Saat ini yang disarankan:
1. Staging: auto deploy
2. Production: manual deploy

Alasan:
1. Staging memang tempat validasi cepat.
2. Production masih butuh keputusan sadar dari operator.
3. Rollback lebih aman saat release cadence belum stabil penuh.

Kalau nanti release process sudah matang, production boleh dipindah ke auto deploy dari `main`.

## Checklist Staging
Setelah EasyPanel auto deploy dari `codex/staging`, cek:
1. `GET /health` -> `healthy`
2. login backoffice berhasil
3. list WP terbuka
4. list OP terbuka
5. peta terbuka
6. master data tampil
7. create/update data dummy jika memang sedang dites

## Checklist Production
Sebelum deploy production dari `main`, pastikan:
1. commit di `main` sudah sama dengan commit yang lolos di staging
2. readiness board sudah hijau
3. backup production tersedia
4. rollback checklist siap
5. operator tahu commit/version yang sedang dirilis

## Anti-Pattern yang Harus Dihindari
1. Deploy production langsung dari branch fitur.
2. Test hanya di local lalu langsung rilis ke prod.
3. Staging dan production memakai branch yang sama untuk eksperimen.
4. Merge ke `main` sebelum staging benar-benar selesai diuji.

## Keputusan Operasional Saat Ini
1. Staging source branch: `codex/staging`
2. Production source branch: `main`
3. Staging deploy mode: auto deploy
4. Production deploy mode: manual deploy
