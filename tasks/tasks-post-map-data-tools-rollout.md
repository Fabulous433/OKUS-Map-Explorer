## Relevant Files

- `docs/plans/2026-03-13-post-map-data-tools-rollout-plan.md` - Rencana follow-up sesudah task map ditutup.
- `client/src/pages/backoffice/data-tools.tsx` - UI pilihan export/import yang harus dismoke.
- `server/routes.ts` - Kontrak export/import WP dan OP.
- `docs/api-spec.md` - Dokumen kontrak CSV yang harus cocok dengan hasil file aktual.
- `docs/changelog.md` - Catatan perubahan user-facing/operasional.

### Notes

- Task ini baru boleh dijalankan setelah `tasks/tasks-map-wfs-refactor.md` bagian `7.0` selesai.
- Fokus task ini adalah validasi, evidence, dan penyempurnaan lanjutan bila ditemukan gap operator.
- Semua perubahan tambahan sesudah task map selesai harus tetap dicatat di changelog dan docs plan terkait.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang implementasi sebelum command verifikasi dijalankan dan hasilnya dibaca.

## Tasks

- [ ] 0.0 Resume batch after map close
  - [ ] 0.1 Konfirmasi `tasks/tasks-map-wfs-refactor.md` task `7.0` sudah selesai
  - [ ] 0.2 Refresh konteks branch aktif dan status docs/changelog terakhir

- [ ] 1.0 Refresh verification evidence
  - [ ] 1.1 Jalankan `npx tsx tests/integration/wp-csv-contract.integration.ts`
  - [ ] 1.2 Jalankan `npx tsx tests/integration/op-csv-roundtrip.integration.ts`
  - [ ] 1.3 Jalankan `npm run check`
  - [ ] 1.4 Jalankan `npm run build`

- [ ] 2.0 Run manual Data Tools smoke
  - [ ] 2.1 Export `Wajib Pajak` compact dari halaman `Data Tools`
  - [ ] 2.2 Import CSV `Wajib Pajak` compact dan CSV legacy
  - [ ] 2.3 Export `Objek Pajak` template universal
  - [ ] 2.4 Export `Objek Pajak` operasional minimal untuk 2 jenis pajak yang berbeda
  - [ ] 2.5 Simpan evidence PASS/FAIL dan catatan operator

- [ ] 3.0 Review spreadsheet outputs
  - [ ] 3.1 Cek kolom `lampiran`
  - [ ] 3.2 Cek header compact `Wajib Pajak`
  - [ ] 3.3 Cek bahwa export operasional OP hanya memuat kolom detail yang relevan
  - [ ] 3.4 Catat potensi masalah Excel seperti scientific notation pada NIK/NPWPD/NOPD

- [ ] 4.0 Close follow-up docs
  - [ ] 4.1 Update changelog bila ada adjustment baru
  - [ ] 4.2 Tambahkan evidence/handoff note bila batch siap naik
  - [ ] 4.3 Putuskan apakah batch ini merge apa adanya atau butuh refinement tambahan
