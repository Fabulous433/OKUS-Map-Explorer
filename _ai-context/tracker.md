# Tracker — Global Task Registry

## Status Legend
- [x] Selesai
- [ ] Belum dikerjakan
- [~] Sedang dikerjakan

---

## Verification Note
- Label "e2e test passed" merepresentasikan verifikasi historis sesi sebelumnya.
- Artefak test automation belum tersimpan di repository saat ini.
- Tracker Sync Date: 2026-03-07
- Source of truth utama untuk sinkronisasi status phase: `docs/future-plan.md`

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

### T010c: Local Dev Infra Baseline (Docker + Env)
- **Status**: [x] Selesai
- **Acceptance**: docker-compose PostgreSQL+Adminer, `.env.local` flow, fail-fast env check, docs local dev tersedia
- **Verified**: Ya (compose, db:push, smoke API, negative startup test)

---

## Phase 2: Enhancements (Backlog)

### T011: Autentikasi Backoffice
- **Status**: [x] Selesai
- **Acceptance**: Login page, session management, proteksi route backoffice
- **Priority**: High (sebelum production)
- **Verified**: Ya (Session auth + RBAC hardening aktif)

### T012: Responsive / Mobile Support
- **Status**: [~] Parsial
- **Acceptance**: Peta dan backoffice bisa digunakan di mobile
- **Priority**: Medium
- **Verified**: Parsial (responsive utility class sudah ada, acceptance formal lintas device belum ditutup)

### T013: Filter Peta per Jenis Pajak
- **Status**: [ ] Belum
- **Acceptance**: Toggle visibility marker per jenis pajak di peta publik
- **Priority**: Low
- **Verified**: Belum (filter explicit per jenis/toggle marker belum tersedia)

### T014: Audit Trail
- **Status**: [x] Selesai
- **Acceptance**: Log setiap perubahan data (siapa, kapan, apa yang berubah)
- **Priority**: Medium (setelah auth)
- **Verified**: Ya (endpoint audit + panel riwayat WP/OP tersedia)


---

## Phase 2A: Data Alignment Sprint (Internal Pilot)

### T015: WP Data Contract Alignment
- **Status**: [x] Selesai
- **Acceptance**:
  - Mapping WP CSV/header distandarkan (`WP_CSV_COLUMNS`)
  - Normalisasi + validasi backend ketat sesuai kontrak
  - Form WP mengirim payload ter-normalisasi
- **Verified**: Ya (`npm run check` + verifikasi alur import/export pada route)

### T016: OP Hybrid Master+Detail Transition
- **Status**: [x] Selesai
- **Acceptance**:
  - Tabel detail per jenis tersedia di schema
  - Read path hydrate `detailPajak` dari detail tables dengan fallback legacy JSONB
  - Write path diarahkan ke detail tables
  - Migrator legacy JSONB -> detail tables dijalankan saat startup
- **Verified**: Ya (`npm run check`)

### T017: OP Internal Operational Filters
- **Status**: [x] Selesai
- **Acceptance**:
  - Endpoint `/api/objek-pajak` menerima query `jenisPajak`, `status`, `kecamatan`
  - UI OP mendukung filter status + kecamatan (server-side query)
  - Filter jenis tetap via tab dan dikirim ke query endpoint
- **Verified**: Ya (`npm run check`)

