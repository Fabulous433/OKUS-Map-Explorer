# UAT Checklist — WP/OP Platform

## Tujuan
Memvalidasi alur bisnis utama sebelum release ke production.

## Rule UAT
- Semua test case wajib punya hasil: `PASS` / `FAIL`.
- `FAIL` wajib punya defect reference dan owner perbaikan.
- UAT dianggap lulus jika semua test case `critical` = `PASS`.

## Metadata Sesi
- Tanggal:
- Environment:
- Build version:
- Tester:
- Reviewer:

## Domain Checklist

### 1) Auth & RBAC
- [ ] Login admin/editor/viewer berhasil.
- [ ] Akses endpoint sesuai role matrix.
- [ ] Viewer tidak bisa mutasi data.
- [ ] Change password validasi policy berjalan.

### 2) Wajib Pajak (WP)
- [ ] Create WP tanpa `npwpd` diterima.
- [ ] Patch WP bisa isi/update `npwpd`.
- [ ] Conditional field pemilik/pengelola tervalidasi.
- [ ] List/search/pagination cursor+offset tetap berjalan.

### 3) Objek Pajak (OP)
- [ ] Create OP dengan contract final berhasil.
- [ ] Verification flow (`draft/verified/rejected`) valid.
- [ ] List/filter/search server-first valid.
- [ ] Map viewport query berfungsi dan stabil.

### 4) Master Data
- [ ] CRUD kecamatan/kelurahan/rekening berjalan.
- [ ] Relasi dependent kecamatan -> kelurahan valid.
- [ ] Delete master yang direferensikan OP ditolak.

### 5) Dashboard & Reporting
- [ ] Dashboard summary/trend tampil sesuai filter.
- [ ] Export dashboard CSV berhasil.
- [ ] Data summary konsisten dengan dataset saat uji.

### 6) Audit & Quality
- [ ] Mutasi WP/OP/master tercatat di audit log.
- [ ] Quality check/report mengembalikan warning expected.

## Sign-off
- UAT Status: LULUS / BELUM LULUS
- Catatan:
- Approval Product Owner:
- Approval Engineering Lead:
