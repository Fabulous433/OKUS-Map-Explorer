# Tracker — Global Task Registry

## Status Legend
- [x] Selesai
- [ ] Belum dikerjakan
- [~] Sedang dikerjakan

---

## Phase 1: Restructuring (Completed)

### T001: Remove Wikipedia Landmarks
- **Status**: [x] Selesai
- **Acceptance**: Tidak ada referensi Wikipedia di routes, schema, atau frontend
- **Verified**: Ya

### T002: Redesign Map Markers per Jenis Pajak
- **Status**: [x] Selesai
- **Acceptance**: Setiap marker berwarna dan berlabel sesuai jenis pajak (MKN, HTL, RKL, dll)
- **Verified**: Ya (e2e test passed)

### T003: WP/OP Search dengan Related OP Display
- **Status**: [x] Selesai
- **Acceptance**: Search "Pak Syarif" → tampil WP + semua OP terkait di peta; cluster untuk OP di lokasi sama
- **Verified**: Ya (e2e test passed)

### T004: Simplify Map Page (Front-end Publik)
- **Status**: [x] Selesai
- **Acceptance**: Peta bersih dengan search, marker berwarna, legenda, link backoffice; tanpa side panel/CRUD
- **Verified**: Ya (e2e test passed)

### T005: Backoffice Layout Shell
- **Status**: [x] Selesai
- **Acceptance**: Layout sidebar dengan navigasi Dashboard, WP, OP, link kembali ke peta
- **Verified**: Ya (e2e test passed)

### T006: Dashboard Progress Tracking
- **Status**: [x] Selesai
- **Acceptance**: Progress bar per jenis pajak (total/sudah update/belum update), expandable table
- **Verified**: Ya (e2e test passed)

### T007: Backoffice WP Management
- **Status**: [x] Selesai
- **Acceptance**: CRUD WP di /backoffice/wajib-pajak, edit support, tabel dengan search
- **Verified**: Ya (e2e test passed)

### T008: Backoffice OP Management
- **Status**: [x] Selesai
- **Acceptance**: CRUD OP di /backoffice/objek-pajak, map picker, form detail per jenis, tabel
- **Verified**: Ya (e2e test passed)

### T009: CSV Import/Export
- **Status**: [x] Selesai
- **Acceptance**: Export/Import CSV untuk WP dan OP; validasi + laporan hasil import
- **Verified**: Ya (routes verified, UI buttons confirmed via e2e)

### T010: Update Routing & Cleanup
- **Status**: [x] Selesai
- **Acceptance**: Routes baru aktif, file lama dihapus, replit.md di-update
- **Verified**: Ya

### T010b: README & Future Plan
- **Status**: [x] Selesai
- **Acceptance**: README.md lengkap dengan fitur, tech stack, API endpoints, struktur; future-plan.md dengan roadmap Phase 2-7
- **Verified**: Ya

---

## Phase 2: Enhancements (Backlog)

### T011: Autentikasi Backoffice
- **Status**: [ ] Belum
- **Acceptance**: Login page, session management, proteksi route backoffice
- **Priority**: High (sebelum production)

### T012: Responsive / Mobile Support
- **Status**: [ ] Belum
- **Acceptance**: Peta dan backoffice bisa digunakan di mobile
- **Priority**: Medium

### T013: Filter Peta per Jenis Pajak
- **Status**: [ ] Belum
- **Acceptance**: Toggle visibility marker per jenis pajak di peta publik
- **Priority**: Low

### T014: Audit Trail
- **Status**: [ ] Belum
- **Acceptance**: Log setiap perubahan data (siapa, kapan, apa yang berubah)
- **Priority**: Medium (setelah auth)
