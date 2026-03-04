# Scope — Project Charter

## Vision
Aplikasi web untuk membantu Pemerintah Kabupaten OKU Selatan dalam visualisasi, pendataan, dan monitoring progress pencatatan Pajak Daerah secara digital.

## Goals
1. Menyediakan peta interaktif publik untuk melihat sebaran WP dan OP di OKU Selatan
2. Memberikan tools backoffice bagi petugas pajak untuk mengelola data WP & OP
3. Tracking progress pendataan — berapa OP yang sudah diisi detail pajak vs belum
4. Mendukung import/export CSV untuk integrasi dengan sistem existing

## In-Scope
- Peta interaktif read-only dengan marker per jenis pajak
- Pencarian WP/OP di peta dengan display relasi WP → OP
- Cluster marker untuk OP di lokasi yang sama
- Backoffice: Dashboard progress pendataan per jenis pajak
- Backoffice: CRUD lengkap WP (Create, Read, Update, Delete)
- Backoffice: CRUD lengkap OP dengan form detail per jenis pajak
- Backoffice: Map picker untuk set koordinat OP
- Import/Export CSV untuk WP dan OP
- 9 jenis pajak daerah (MKN, HTL, PKR, HBR, LST, RKL, AIR, WLT, MBL)
- Seed data dengan lokasi nyata di Muaradua, OKU Selatan
- Neo-brutalist design system

## Out-of-Scope (saat ini)
- Autentikasi dan otorisasi pengguna
- Reporting pajak bulanan/tahunan (laporan keuangan)
- Pembayaran pajak online
- Notifikasi / reminder jatuh tempo
- Multi-tenant (kabupaten lain)
- Mobile native app
- Integrasi dengan SISMIOP atau sistem pemerintah lainnya
- Audit trail / log aktivitas pengguna
- Print / generate surat ketetapan pajak
- Analitik dan grafik omset/pajak (chart) — dashboard hanya untuk tracking pendataan

## Success Metrics
| Metrik | Target |
|--------|--------|
| Semua 9 jenis pajak terdaftar dan bisa di-CRUD | 100% |
| Dashboard menunjukkan progress pendataan akurat | Sesuai data |
| CSV import berhasil untuk file valid | > 95% success rate |
| Peta load dengan seed data | < 3 detik |
| Marker berwarna per jenis pajak terlihat jelas | Visual test pass |
