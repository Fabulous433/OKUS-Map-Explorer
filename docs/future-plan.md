# Future Plan — Roadmap Pengembangan

## Phase 2: Security & Access Control
**Prioritas: Tinggi — Wajib sebelum production deploy**

### Autentikasi Backoffice
- Login page dengan username/password
- Session management (express-session + SESSION_SECRET sudah tersedia)
- Proteksi semua route `/backoffice/*` dan API mutasi (POST/PATCH/DELETE)
- Tabel `users` sudah tersedia di schema, tinggal diaktifkan
- Role-based access: Admin (full CRUD) vs Viewer (read-only)

### Keamanan Tambahan
- Rate limiting pada API endpoints
- CSRF protection
- Helmet.js untuk HTTP security headers
- Audit log — catat setiap perubahan data (siapa, kapan, apa)

---

## Phase 3: Fitur Peta Lanjutan

### Filter Peta per Jenis Pajak
- Toggle checkbox per jenis pajak di panel legenda
- Klik warna di legenda untuk show/hide marker jenis tersebut
- Simpan preferensi filter di localStorage

### Heatmap Layer
- Layer opsional menampilkan kepadatan OP sebagai heatmap
- Berguna untuk identifikasi area yang sudah terdata vs belum

### Geofencing Kecamatan
- Overlay batas wilayah kecamatan di peta
- Statistik per kecamatan saat hover
- GeoJSON boundary data dari BPS atau OpenStreetMap

### Directions / Rute
- Klik OP → tampilkan rute dari lokasi petugas ke lokasi OP
- Integrasi dengan OSRM atau Google Directions API

---

## Phase 4: Dashboard & Reporting

### Grafik & Analitik
- Chart omset bulanan per jenis pajak (bar/line chart)
- Trend pendataan progress per bulan
- Top 10 WP berdasarkan total pajak bulanan
- Perbandingan antar kecamatan

### Laporan
- Generate laporan pendataan dalam format PDF
- Rekap bulanan: total OP terdata, total pajak potensi
- Export laporan ke Excel (xlsx)

### Periode Pajak
- Tracking per bulan/tahun pajak
- History pembayaran per OP
- Status pembayaran (lunas/tunggakan)

---

## Phase 5: Mobile & Field Support

### Progressive Web App (PWA)
- Offline-capable untuk petugas lapangan
- Cache peta tiles untuk area OKU Selatan
- Sync data saat kembali online

### Mobile-Optimized UI
- Responsive layout untuk peta dan backoffice
- Bottom sheet navigation di mobile
- GPS auto-detect untuk set koordinat OP di lapangan

### Foto Dokumentasi
- Upload foto objek pajak dari lapangan
- Gallery per OP di halaman detail
- Kompresi otomatis sebelum upload

---

## Phase 6: Integrasi & Skalabilitas

### Integrasi Sistem Pemerintah
- SISMIOP (Sistem Manajemen Informasi Objek Pajak)
- SIMDA (Sistem Informasi Manajemen Daerah)
- API gateway untuk interoperabilitas

### Multi-Kabupaten
- Tenant system untuk kabupaten lain di Sumatera Selatan
- Shared infrastructure, isolated data
- Admin super untuk manage tenant

### Notifikasi
- Email reminder jatuh tempo pajak
- WhatsApp notification via API (Fonnte/WA Business)
- Push notification (jika PWA)

---

## Phase 7: AI & Automation

### Prediksi Pajak
- Model ML untuk estimasi potensi pajak per area
- Deteksi anomali — OP dengan omset tidak wajar
- Rekomendasi prioritas pendataan

### OCR Import
- Scan dokumen NPWPD/NOPD fisik → auto-fill form
- Parsing SPTPD (Surat Pemberitahuan Pajak Daerah)

### Chatbot Pajak
- Chatbot publik untuk pertanyaan seputar pajak daerah
- Integrasi dengan data OP untuk jawaban kontekstual

---

## Prioritas Ringkas

| Phase | Nama | Prioritas | Estimasi |
|-------|------|-----------|----------|
| 2 | Security & Access Control | 🔴 Tinggi | 1-2 minggu |
| 3 | Fitur Peta Lanjutan | 🟡 Sedang | 2-3 minggu |
| 4 | Dashboard & Reporting | 🟡 Sedang | 2-3 minggu |
| 5 | Mobile & Field Support | 🟡 Sedang | 3-4 minggu |
| 6 | Integrasi & Skalabilitas | 🟢 Rendah | 4-6 minggu |
| 7 | AI & Automation | 🟢 Rendah | 6-8 minggu |

---

## Catatan
- Phase 2 (Security) adalah **prasyarat wajib** sebelum deploy ke production
- Phase 3-4 bisa dikerjakan paralel setelah Phase 2 selesai
- Phase 5-7 adalah roadmap jangka menengah-panjang
- Estimasi bersifat indikatif, tergantung kompleksitas implementasi dan resource
