# Changelog

## Phase 2.14 — WP/OP Attachments MVP

### Added
- Attachment backend generik untuk `wajib_pajak` dan `objek_pajak`:
  - upload
  - list
  - download
  - delete
- Metadata attachment baru:
  - `entity_type`
  - `entity_id`
  - `document_type`
  - `file_name`
  - `mime_type`
  - `file_size`
  - `storage_path`
  - `uploaded_at`
  - `uploaded_by`
  - `notes`
- Panel lampiran di dialog edit Wajib Pajak:
  - KTP/NIK
  - NPWP
  - Surat Kuasa
  - Dokumen Lain
- Panel lampiran di dialog edit Objek Pajak:
  - Foto Usaha
  - Foto Lokasi
  - Izin Usaha
  - Dokumen Lain
- Preview attachment untuk gambar dan PDF, termasuk zoom in/out/reset pada gambar.
- Health endpoint sekarang juga memverifikasi storage attachment dengan status `attachmentsStorage: ready`.

### Improved
- Flow upload memakai volume/filesystem lokal sebagai baseline staging/production awal.
- Error upload file dinormalisasi ke pesan user-friendly:
  - `Format file tidak didukung`
  - `Ukuran file melebihi batas 5 MB`
  - `File gagal diunggah. Silakan coba lagi.`
- Runbook staging kini mencakup mount volume persisten untuk `/app/uploads`.

### Fixed
- Preview gambar attachment sekarang auto-fit ke box tanpa crop, lalu bisa di-zoom manual.

### Breaking
- Tidak ada breaking API pada flow lama, tetapi environment staging/production sekarang membutuhkan storage persisten untuk attachment jika fitur upload diaktifkan.

## Phase 2.13 — OP Detail FE Hard Sync

### Improved
- Form detail OP mulai hard-sync ke contract final untuk jenis yang sudah ada di UI:
  - Makan Minum
  - Perhotelan
  - Hiburan
  - Parkir
  - Reklame
- Panel detail baru ditambahkan untuk:
  - PBJT Tenaga Listrik
  - Pajak Air Tanah
  - Pajak Sarang Burung Walet
- Detail hotel sekarang memakai `fasilitas[]` dan UI multi-select.
- Detail reklame sekarang memakai tiga ukuran terpisah:
  - `ukuranPanjang`
  - `ukuranLebar`
  - `ukuranTinggi`
- Contract CSV OP mulai disinkronkan dengan shape detail final baru.
- Taksonomi PBJT di form OP mulai dirapikan ke kategori resmi untuk:
  - Makanan Minuman
  - Perhotelan
  - Parkir
  - Hiburan
  - Tenaga Listrik
- Detail parkir sekarang membedakan `jenisUsaha` dan `jenisLokasi`.
- Detail makanan-minuman sekarang mendukung klasifikasi khusus untuk Restoran.
- Halaman backoffice OP dipecah menjadi modul terpisah untuk helper/schema, detail fields, map picker, dan dialog form agar perubahan berikutnya tidak lagi bertumpu pada satu file raksasa.
- Halaman Master Data FE disederhanakan menjadi rekening-only; CRUD kecamatan dan kelurahan disembunyikan dari UI backoffice, tetapi tetap dipakai sebagai data referensi dropdown di form.
- Setelah create/update OP berhasil, list kembali ke halaman pertama agar data yang baru diubah langsung terlihat operator.
- Kolom PAJAK/BLN di list OP sekarang hanya menampilkan Rp, tanpa simbol mata uang ganda.
- Flow quality check WP sekarang menampilkan dialog duplikasi di tengah layar dengan CTA `Perbaiki` dan `Lihat Data Duplikasi`, bukan warning teks polos di dalam form.
- Payload warning duplicate WP sekarang membawa metadata `duplicates[]` berisi nama data bentrok dan nilai yang sama agar FE bisa mengarahkan operator ke record existing.
- Quality check WP mode edit sekarang mendukung `excludeWpId`, sehingga record yang sedang diedit tidak dianggap duplikat terhadap dirinya sendiri.

## Phase 2.12 — OP NOPD + Validation UX Hardening

### Added
- Error payload OP sekarang mendukung `fieldErrors` agar form bisa menandai field yang salah tanpa menampilkan JSON teknis mentah.
- `SIMILAR_NAME_ADDRESS` dipertahankan sebagai signal internal di `GET /api/quality/report`.

### Improved
- Validasi backend OP kini menerjemahkan error Zod/DB ke pesan yang lebih manusiawi untuk field numerik utama dan `NOPD`.
- Pesan error `NOPD` sekarang disederhanakan menjadi `Format NOPD salah, mohon diperiksa kembali`.
- Toast/import OP sekarang merangkum hasil gagal dengan contoh error baris pertama, bukan hanya payload mentah.
- Dokumen API kini lock ke aturan `NOPD` final `AA.BB.CC.XXXX`.

### Fixed
- Warning `DUPLICATE_NOPD` tidak lagi muncul di warning form OP.
- Warning `SIMILAR_NAME_ADDRESS` tidak lagi mengganggu submit form OP.
- Helper text di bawah field `NOPD` dihapus dari form OP.
- Contoh `NOPD` lama `OP.321.XXX.YYYY` dibersihkan dari kontrak API aktif.

### Breaking
- Create, update, dan import OP tidak lagi menerima format `NOPD` lama; semua jalur wajib `AA.BB.CC.XXXX`.

## Phase 2.10 — Production Stabilization + Post-Launch Review (Completed Dry-Run Baseline)

### Added
- Post-launch snapshot automation:
  - `script/ops-post-launch-snapshot.ts`
- npm command:
  - `ops:post-launch:snapshot`
- Integration suite baru:
  - `tests/integration/ops-post-launch.integration.ts`
- Evidence doc:
  - `docs/operations/post-launch-summary-2026-03-07.md`

### Improved
- Wave 5 docs diperkuat agar operasional pasca-launch punya command baseline dan evidence path:
  - `docs/operations/post-launch-monitoring.md`
  - `docs/operations/incident-review-template.md`
  - `docs/operations/post-launch-summary.md`

### Fixed
- Gap monitoring pasca-launch yang sebelumnya hanya template tanpa snapshot automation.

### Breaking
- Tidak ada breaking API; perubahan fokus pada operasi pasca go-live.

## Phase 2.11 — Staging/Production Execution Window Pack (Docs Lock)

### Added
- Bootstrap plan untuk membangun staging dari nol:
  - `docs/release/staging-bootstrap-plan.md`
- Runbook khusus skenario 1 VPS (production + staging):
  - `docs/release/staging-single-vps-runbook.md`
- Runbook eksekusi staging berurutan:
  - `docs/release/staging-execution-window-runbook.md`
- Template approval owner:
  - `docs/release/owner-approval-log-template.md`
- Template decision log:
  - `docs/release/go-no-go-decision-log-template.md`

### Improved
- `docs/release/release-readiness-gate.md` kini menautkan artefak wajib untuk sign-off final.
- Runbook staging diperbarui agar kompatibel format EasyPanel (service-based deploy + panel backup/restore).
- Jalur deploy EasyPanel sekarang direkomendasikan via `Dockerfile` multi-stage, bukan `Nixpacks`.

### Fixed
- Gap handoff eksekusi staging/prod yang sebelumnya belum punya urutan command + approval artifact baku.

### Breaking
- Tidak ada breaking API; perubahan fokus pada governance release execution.

## Phase 2.9 — Release Readiness Gate + Go-Live Rehearsal (Completed Dry-Run Baseline)

### Added
- Smoke automation script:
  - `script/ops-smoke-check.ts`
- npm command:
  - `ops:smoke`
- Integration suite baru:
  - `tests/integration/ops-smoke-check.integration.ts`
- Evidence docs:
  - `docs/release/go-live-rehearsal-report-2026-03-07.md`
  - `docs/release/release-readiness-board-2026-03-07.md`

### Improved
- Dokumen Wave 4 diperkuat dengan command baseline dan evidence board:
  - `docs/release/go-live-rehearsal-checklist.md`
  - `docs/release/release-readiness-gate.md`
  - `docs/release/slo-baseline.md`

### Fixed
- Gap validasi smoke critical path yang sebelumnya belum punya automation command khusus.

### Breaking
- Tidak ada breaking API; perubahan fokus pada governance release.

## Phase 2.8 — Reporting/Export Operasional + Scheduling (Completed)

### Added
- Script scheduled export operasional:
  - `script/ops-report-export.ts`
- npm commands:
  - `ops:report:daily`
  - `ops:report:weekly`
- Integration suite baru:
  - `tests/integration/ops-report-export.integration.ts`
- Evidence report:
  - `docs/operations/reporting-export-evidence-2026-03-07.md`
- Baseline env reporting ops:
  - `REPORT_EXPORT_*` pada `.env.example`

### Improved
- `docs/operations/*` sekarang selaras dengan command runnable (daily/weekly export) dan output directory baseline `reports/<frequency>/YYYY/MM/DD`.
- Katalog laporan operasional kini lock ke artifact naming actual dari script.

### Fixed
- Gap antara policy scheduled export dan implementasi executable untuk generate artifact CSV.

### Breaking
- Tidak ada breaking API; perubahan fokus pada operasional reporting/export.

## Phase 2.7 — UAT Framework + Smoke + Rollback Drill (Completed)

### Added
- Evidence report rehearsal:
  - `docs/uat/release-rehearsal-report-2026-03-07.md`
- Gate lock section pada release readiness:
  - `docs/release/release-readiness-gate.md`
- Penguatan checklist operasional:
  - `docs/uat/uat-checklist.md`
  - `docs/uat/smoke-test-checklist.md`
  - `docs/runbooks/rollback-checklist.md`
  - `docs/uat/release-rehearsal-report-template.md`

### Improved
- Acceptance Wave 2 sekarang punya evidence eksplisit:
  - dry-run rehearsal,
  - smoke pass,
  - rollback simulation pass.

### Fixed
- Gap antara template checklist dan bukti eksekusi rehearsal.

### Breaking
- Tidak ada breaking API; perubahan fokus pada release governance dan operasional.

## Phase 2.6 — Data Lifecycle Hardening (Completed)

### Added
- Baseline runbook data lifecycle:
  - `docs/runbooks/backup-retention-policy.md`
  - `docs/runbooks/restore-drill-runbook.md`
  - `docs/runbooks/data-purge-retention-policy.md`
  - `docs/runbooks/restore-drill-evidence-template.md`
  - `docs/runbooks/restore-drill-evidence-2026-03-07.md`
- Template dokumen eksekusi production readiness:
  - `docs/uat/*` (UAT, smoke, release rehearsal)
  - `docs/release/*` (gate, rehearsal checklist, SLO, escalation)
  - `docs/operations/*` (reporting/export ops, post-launch monitoring/review)
- Script automation Wave 1:
  - `script/ops-backup.ts`
  - `script/ops-backup-prune.ts`
  - `script/ops-restore-drill.ts`
- Integration suite baru:
  - `tests/integration/ops-lifecycle.integration.ts`
- npm command baseline:
  - `ops:backup:*`, `ops:backup:prune*`, `ops:restore:drill`

### Improved
- `docs/local-development.md` sekarang menautkan seluruh runbook production baseline untuk backup/restore/purge.

### Fixed
- Gap dokumentasi operasional untuk backup retention, restore drill, dan purge policy sebelum go-live production.

### Breaking
- Tidak ada breaking API; perubahan fokus di baseline dokumentasi operasional.

## Phase 2.5 — Dashboard Analytics Lanjutan (MVP)

### Added
- Dashboard summary mendukung filter waktu + grouping periodik:
  - query `from`, `to`, `groupBy=day|week` pada `GET /api/dashboard/summary`.
- Payload dashboard kini menyertakan data trend periodik (`trend[]`) + metadata filter window (`filters`).
- Endpoint export ringkasan:
  - `GET /api/dashboard/summary/export` (CSV)
- Integration suite baru:
  - `dashboard-analytics.integration.ts`

### Improved
- Halaman dashboard backoffice kini bisa:
  - filter periode tanggal,
  - switch grouping harian/mingguan,
  - tampilkan chart trend OP dibuat vs diverifikasi,
  - export CSV sesuai filter aktif.

### Fixed
- Keterbatasan dashboard sebelumnya yang hanya menampilkan snapshot agregat tanpa analisis periodik.

### Breaking
- Tidak ada breaking API; endpoint summary bersifat backward-compatible (query baru opsional).

## Phase 2.4 — Security Baseline Login (MVP)

### Added
- Baseline proteksi login:
  - rate limit `POST /api/auth/login`
  - lockout ringan untuk gagal login berulang
- Endpoint baru:
  - `POST /api/auth/change-password`
- Integration suite baru:
  - `auth-security-baseline.integration.ts`

### Improved
- Response auth lock/rate-limit kini menyertakan `Retry-After` + code terstruktur (`AUTH_RATE_LIMITED`, `AUTH_LOCKED`).
- Password policy minimum diterapkan untuk perubahan password user internal.

### Fixed
- Risiko brute-force login pada endpoint auth berkurang lewat kombinasi rate-limit + lockout.

### Breaking
- Tidak ada breaking API; penambahan behavior keamanan di endpoint login.

## Phase 2.3 — Cache Strategy Hot Path (MVP)

### Added
- Conditional fetch `ETag + If-None-Match` untuk endpoint hot-path:
  - `GET /api/master/kecamatan`
  - `GET /api/master/kelurahan`
  - `GET /api/master/rekening-pajak`
  - `GET /api/wajib-pajak`
  - `GET /api/objek-pajak`
  - `GET /api/objek-pajak/map`
  - `GET /api/dashboard/summary`
- Integration suite baru:
  - `cache-etag.integration.ts`

### Improved
- Response cache header distandarkan ke `private, max-age=0, must-revalidate`.
- Backoffice/client dapat melakukan conditional revalidation tanpa download payload berulang.

### Fixed
- Beban transfer payload list/master berulang pada polling/filter yang data-nya belum berubah.

### Breaking
- Tidak ada breaking API; perubahan bersifat additive di level HTTP caching header.

## Phase 2.2 — Observability Query Performance (MVP)

### Added
- Middleware correlation id request (`x-request-id`) untuk semua endpoint API.
- Slow query logging pada PostgreSQL pool dengan threshold env `SLOW_QUERY_MS`.
- Integration suite baru:
  - `observability.integration.ts`

### Improved
- Error response kini menyertakan `requestId` untuk mempercepat trace troubleshooting.
- Log API dan DB lebih mudah dikorelasi lintas request.

### Fixed
- Gap tracing request antar layer app/db pada debugging performa.

### Breaking
- Tidak ada breaking API contract; perubahan observability bersifat additive.

## Phase 2.1 — Dashboard Aggregation Endpoint (MVP)

### Added
- Endpoint agregasi dashboard:
  - `GET /api/dashboard/summary?includeUnverified=`
- Integration suite baru:
  - `dashboard-summary.integration.ts`

### Improved
- Halaman dashboard backoffice tidak lagi fetch-all-pages WP/OP.
- Statistik dan progress per jenis pajak sekarang diambil langsung dari agregasi server.
- Response dashboard dirancang ringkas untuk UI cards + progress table.

### Fixed
- Menghilangkan ketergantungan statistik dashboard pada sampling page list.

### Breaking
- Tidak ada breaking API publik; endpoint baru bersifat additive.

## Phase 2.0 — Cursor Pagination Rollout (WP/OP List)

### Added
- Cursor pagination support di list endpoint:
  - `GET /api/wajib-pajak?cursor=&limit=`
  - `GET /api/objek-pajak?cursor=&limit=`
- Metadata pagination baru:
  - `mode`, `cursor`, `nextCursor` (tetap kompatibel dengan meta offset existing).
- Integrasi UI WP/OP backoffice ke navigasi cursor next/prev (stack cursor lokal).
- Integration test diperluas untuk validasi alur cursor (`performance-query-hardening.integration.ts`).

### Improved
- Order list offset tetap dipertahankan untuk kompatibilitas existing flow.
- Cursor mode memakai path query berbasis `id` desc agar paging stabil dan ringan.
- Kontrak API tetap backward compatible:
  - offset (`page+limit`) masih berjalan,
  - cursor mode bisa dipakai bertahap.

### Fixed
- Inkonistensi test setelah perubahan order list diselesaikan tanpa mematahkan kontrak final WP/OP.

### Breaking
- Tidak ada breaking tambahan; perubahan bersifat additive terhadap contract paginated Phase 1.9.

## Phase 1.9 — Performance & Query Hardening

### Added
- Endpoint map viewport baru:
  - `GET /api/objek-pajak/map?bbox=minLng,minLat,maxLng,maxLat&zoom=&q=&kecamatanId=&rekPajakId=&limit=`
- One-off SQL hardening index + trgm:
  - `script/phase-1.9-performance-query-hardening.sql`
- Integration suite baru:
  - `performance-query-hardening.integration.ts`

### Improved
- `GET /api/wajib-pajak` kini server-side paginated + server-first search/filter.
- `GET /api/objek-pajak` kini server-side paginated + server-first search/filter.
- Query guardrails ditambahkan:
  - `page` min 1
  - `limit` bounded
  - `q` trim + max length
  - `bbox` validasi format/range
- FE backoffice WP/OP:
  - debounced search 300ms
  - keep-previous-data saat pindah page/filter
  - pagination controls + page size selector
- FE map:
  - load marker by viewport (`moveend/zoomend`)
  - request lama otomatis dibatalkan saat viewport berubah
  - marker payload ringan dari endpoint map

### Fixed
- List OP tidak lagi hydrate `detailPajak` penuh pada endpoint list (detail tetap on-demand via `GET /api/objek-pajak/:id`).
- Halaman dashboard/map/backoffice tersinkron dengan contract paginated baru.

### Breaking
- `GET /api/wajib-pajak` dan `GET /api/objek-pajak` tidak lagi return array langsung.
  - Contract baru: `{ items: [...], meta: {...} }`.

## Phase 1.8 — Auth + RBAC

### Added
- Endpoint autentikasi sesi:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Role aplikasi pada user (`admin|editor|viewer`) di schema `users`.
- Seed akun default internal:
  - `admin/admin123`
  - `editor/editor123`
  - `viewer/viewer123`
- Integration suite baru: `auth-rbac.integration.ts`.
- One-off migration SQL: `script/phase-1.8-auth-rbac.sql`.

### Improved
- RBAC backend pada endpoint internal WP/OP/master/audit/quality/verifikasi.
- Akses publik OP diperketat:
  - default list `verified` tetap publik,
  - mode internal (`includeUnverified` / status non-verified) wajib login.
- Backoffice FE sekarang memakai login page + guard sesi + logout.
- UI backoffice role-aware:
  - viewer read-only,
  - menu/halaman master data hanya admin.

### Fixed
- Seluruh integration test existing disesuaikan agar login-aware (session cookie test helper).
- Cleanup integration test tidak lagi gagal karena endpoint delete kini diproteksi role.

### Breaking
- Endpoint internal yang sebelumnya terbuka kini memerlukan autentikasi/otorisasi role.

## Phase 1.7 — Governance & Quality

### Added
- CRUD Master Data untuk rekening pajak, kecamatan, dan kelurahan.
- Tabel `audit_log` + endpoint baca audit dengan filter + cursor pagination.
- Workflow verifikasi OP (`draft|verified|rejected`) + endpoint `PATCH /api/objek-pajak/:id/verification`.
- Endpoint quality guardrail:
  - `POST /api/quality/check`
  - `GET /api/quality/report`
- Halaman backoffice baru `Master Data` (tab Rekening/Kecamatan/Kelurahan).
- Panel riwayat perubahan (audit) di halaman WP dan OP.
- Integration suite baru: `governance-quality.integration.ts`.

### Improved
- List OP default ke data `verified`, dengan mode internal `includeUnverified=true`.
- Dashboard backoffice membaca data internal mode (`includeUnverified=true`).
- Form WP/OP menampilkan warning quality sebelum submit (non-blocking).
- Mutasi WP/OP/Master/Verification kini otomatis menulis audit log.

### Fixed
- Contract-final integration test disesuaikan untuk filter verifikasi default.
- Seed OP dilengkapi status verifikasi agar data contoh tetap tampil di mode publik.

### Breaking
- `GET /api/objek-pajak` default response kini hanya OP `verified`.
  - Untuk kebutuhan internal/backoffice gunakan `?includeUnverified=true`.

