# Post-Map Data Tools Rollout Plan

## Goal

Melanjutkan batch `Data Tools` export/import setelah task map publik WFS benar-benar ditutup, tanpa mencampur prioritas staging map dengan review operasional CSV backoffice.

## Current Status

- Implementasi inti sudah ada di branch aktif:
  - compact export `Wajib Pajak`
  - backward-compatible import `Wajib Pajak`
  - export `Objek Pajak` mode template universal
  - export `Objek Pajak` mode operasional per jenis pajak
  - indikator `lampiran`
  - update UI `Data Tools`
- Regression dan build yang sudah pernah lulus:
  - `npx tsx tests/integration/wp-csv-contract.integration.ts`
  - `npx tsx tests/integration/op-csv-roundtrip.integration.ts`
  - `npx tsx tests/integration/performance-query-hardening.integration.ts`
  - `npm run check`
  - `npm run build`
- Yang belum ditutup:
  - browser/manual smoke halaman `Data Tools`
  - review operator atas bentuk file export aktual
  - keputusan final apakah kontrak export sekarang langsung naik ke staging bersama map, atau dipisah sesudah map stabil

## Sequence After Map Is Closed

1. Konfirmasi task map `7.0` di `tasks/tasks-map-wfs-refactor.md` sudah selesai.
2. Refresh verifikasi batch `Data Tools` agar evidence tidak stale.
3. Jalankan smoke manual pada halaman `Data Tools`:
   - export `Wajib Pajak`
   - import `Wajib Pajak` compact
   - import `Wajib Pajak` legacy
   - export `Objek Pajak` template
   - export `Objek Pajak` operasional per jenis
4. Buka sample file di spreadsheet desktop dan cek:
   - header sesuai kontrak docs
   - kolom `lampiran` terisi `ADA` jika ada attachment
   - file operasional OP tidak lagi membawa kolom detail lintas jenis yang tidak relevan
5. Capture evidence PASS/FAIL dan catat deviasi operator jika ada.
6. Jika perlu perubahan UX/kontrak lagi, kerjakan di branch turunan baru dari `codex/staging` setelah branch map selesai diintegrasikan.

## Acceptance Criteria

1. Operator dapat membedakan `template import` vs `export operasional` tanpa ambigu.
2. Export `Wajib Pajak` compact tetap bisa di-import ulang bersama CSV legacy.
3. Export `Objek Pajak` operasional per jenis lebih pendek dan terbaca dibanding template universal.
4. Kolom `lampiran` tervalidasi pada sample yang memang memiliki attachment.
5. Semua perubahan lanjutan setelah map selesai tetap tercatat di task log dan changelog.

## Notes

- Plan ini sengaja menunggu map selesai agar review export/import tidak mengganggu handoff staging map.
- Bila map selesai dan tidak ada feedback tambahan untuk `Data Tools`, batch export/import yang sudah ada bisa langsung diperlakukan sebagai kandidat merge setelah smoke manual dicatat.
