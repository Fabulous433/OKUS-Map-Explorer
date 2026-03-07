# Smoke Test Checklist — Pre/Post Deploy

## Tujuan
Verifikasi cepat bahwa sistem sehat setelah deploy dan siap digunakan.

## Metadata
- Tanggal:
- Environment:
- Build:
- Executor:
- Ticket release:

## Pre-Deploy
- [ ] Backup terbaru tersedia.
- [ ] Migration plan dan rollback plan siap.
- [ ] `npm run check` pass pada build target.
- [ ] `npm run test:integration` pass pada kandidat release.

## Post-Deploy (Critical Path)
- [ ] `GET /api/auth/me` (dengan sesi valid) merespons benar.
- [ ] `GET /api/wajib-pajak?page=1&limit=25` sukses.
- [ ] `GET /api/objek-pajak?page=1&limit=25` sukses.
- [ ] `GET /api/master/rekening-pajak` sukses.
- [ ] `GET /api/dashboard/summary` sukses.
- [ ] `GET /api/objek-pajak/map?bbox=...` sukses.

## UI Smoke
- [ ] Login backoffice berhasil.
- [ ] Halaman WP terbuka tanpa error runtime.
- [ ] Halaman OP terbuka tanpa error runtime.
- [ ] Dashboard tampil data summary/trend.

## Observability Smoke
- [ ] Header `x-request-id` muncul di response API.
- [ ] Slow query log tidak menunjukkan spike abnormal.
- [ ] Tidak ada error burst di log aplikasi pasca deploy.

## Pass Criteria
- Semua item `Post-Deploy (Critical Path)` harus `PASS`.
- Jika satu critical path gagal, status smoke otomatis `FAIL` dan rollback dieksekusi.

## Keputusan
- Smoke Status: PASS / FAIL
- Jika FAIL:
  - [ ] Trigger rollback checklist
  - [ ] Buat incident ticket
