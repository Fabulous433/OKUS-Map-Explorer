# Backoffice Boundary Editor Smoke — 2026-03-20

## Scope

- Feature: backoffice admin editor untuk override boundary `desa/kelurahan`
- Region scope: `OKU Selatan` only
- Runtime rule: tidak memuat shapefile nasional ke runtime
- Publish mode default: `publish-and-reconcile`

## Automated Evidence

Command bundle yang dijalankan pada session ini:

```bash
npx tsx tests/integration/backoffice-boundary-editor-shell.integration.ts
npx tsx tests/integration/boundary-editor-model.integration.ts
npx tsx tests/integration/backoffice-boundary-editor-publish.integration.ts
npx tsx tests/integration/region-boundary-admin-api.integration.ts
npx tsx tests/integration/region-boundary-publish.integration.ts
npx tsx tests/integration/region-boundary-runtime-merge.integration.ts
npx tsx tests/integration/objek-pajak-spatial-guard.integration.ts
npm run check
npm run build
```

Result:

- PASS `backoffice-boundary-editor-shell.integration.ts`
- PASS `boundary-editor-model.integration.ts`
- PASS `backoffice-boundary-editor-publish.integration.ts`
- PASS `region-boundary-admin-api.integration.ts`
- PASS `region-boundary-publish.integration.ts`
- PASS `region-boundary-runtime-merge.integration.ts`
- PASS `objek-pajak-spatial-guard.integration.ts`
- PASS `npm run check`
- PASS `npm run build`

## Smoke Checklist

- Admin load page: PASS
  Evidence: shell route/nav contract + production build hijau.
- Pilih `Muaradua`: PASS
  Evidence: selector kecamatan tersedia di shell dan page query memakai `/api/master/kecamatan`.
- Pilih `Batu Belang Jaya`: PASS
  Evidence: selector desa tersedia di shell dan page query memakai scoped `/api/master/kelurahan?kecamatanId=...`.
- Upload atau edit polygon draft: PASS
  Evidence: `boundary-editor-model.integration.ts` + build frontend `leaflet-draw` hijau.
- Preview shows `Cemara Homestay` move summary: PASS
  Evidence: `region-boundary-admin-api.integration.ts` mendeteksi perpindahan `Cemara Homestay` dari `Bumi Agung` ke `Batu Belang Jaya`.
- Publish with reconciliation updates runtime: PASS
  Evidence: `region-boundary-publish.integration.ts` memastikan publish mengubah hasil `findContainingDesa(...)` dan merekonsiliasi `kelurahanId`.
- Rollback restores previous result: PASS
  Evidence: `region-boundary-publish.integration.ts` memastikan rollback mengaktifkan kembali revision published sebelumnya.

## Notes

- Smoke ini berbasis verifikasi otomatis lokal, bukan rekaman browser manual.
- Warning build yang masih muncul hanya warning chunk size/PostCSS existing; tidak memblokir build maupun fungsi boundary editor.
