# Backoffice Boundary Topology Editor Smoke - 2026-03-20

## Scope

- Feature: topology-aware backoffice editor untuk override boundary `desa/kelurahan` OKU Selatan
- Region scope: `OKU Selatan` only
- Runtime rule: tidak memuat shapefile nasional ke runtime
- Guardrail runtime: publish/rollback hanya mengubah boundary pack final yang dipakai lookup publik dan spatial guard

## Automated Evidence

Command bundle yang dijalankan pada session ini:

```bash
npx tsx tests/integration/region-boundary-topology-contract.integration.ts
npx tsx tests/integration/region-boundary-topology-analysis.integration.ts
npx tsx tests/integration/region-boundary-topology-resolution-api.integration.ts
npx tsx tests/integration/region-boundary-topology-publish.integration.ts
npx tsx tests/integration/boundary-editor-topology-model.integration.ts
npx tsx tests/integration/backoffice-boundary-topology-resolution.integration.ts
npx tsx tests/integration/region-boundary-runtime-merge.integration.ts
npx tsx tests/integration/objek-pajak-spatial-guard.integration.ts
npm run check
npm run build
```

Result:

- PASS `region-boundary-topology-contract.integration.ts`
- PASS `region-boundary-topology-analysis.integration.ts`
- PASS `region-boundary-topology-resolution-api.integration.ts`
- PASS `region-boundary-topology-publish.integration.ts`
- PASS `boundary-editor-topology-model.integration.ts`
- PASS `backoffice-boundary-topology-resolution.integration.ts`
- PASS `region-boundary-runtime-merge.integration.ts`
- PASS `objek-pajak-spatial-guard.integration.ts`
- PASS `npm run check`
- PASS `npm run build`

Build notes:

- `npm run build` sempat kena timeout pada percobaan awal, lalu PASS saat dijalankan ulang dengan timeout lebih longgar.
- Warning PostCSS `from` option dan chunk size > 500 kB masih muncul, tetapi tidak memblokir build.

## Smoke Checklist

- Edit `Bumi Agung`: PASS
- Shrink polygon: PASS
- Verify sole-candidate fragment auto-assigned: PASS
- Verify multi-candidate fragment requires manual resolution: PASS
- Verify takeover warning on expansion into `Batu Belang Jaya`: PASS
- Verify publish result shows only final boundary pack: PASS
- Verify rollback restores previous published pack: PASS

## Notes

- Smoke evidence ini melacak alur topology-aware baru:
  - auto-assign saat kandidat tunggal
  - manual assignment saat kandidat > 1
  - takeover warning saat `Save Draft`
  - publish guard yang menunggu topology clean, takeover confirmation, dan preview impact sukses
- Runtime boundary final yang diverifikasi pada bundle ini tetap tidak menyisakan boundary lama pada lookup publik.
- Spatial guard tetap hijau pada bundle final verifikasi.
