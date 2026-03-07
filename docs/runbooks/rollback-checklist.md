# Rollback Checklist — Staging/Production

## Tujuan
Memastikan rollback bisa dijalankan cepat dan aman ketika release gagal.

## Trigger Rollback
- Smoke test critical gagal.
- Error rate meningkat tajam setelah deploy.
- Data corruption risk terdeteksi.

## Metadata
- Incident/Ticket:
- Release version:
- Executor:
- Approver:
- Environment:

## Langkah Rollback

### 1) Freeze perubahan
- [ ] Hentikan deploy lanjutan.
- [ ] Informasikan status rollback ke stakeholder.

### 2) Tentukan rollback mode
- [ ] App rollback (versi aplikasi sebelumnya).
- [ ] DB rollback (restore dari backup) bila diperlukan.

### 3) App rollback
- [ ] Redeploy artifact versi stabil terakhir.
- [ ] Validasi service health endpoint.
- [ ] Jalankan smoke critical path pasca rollback.

### 4) DB rollback (jika dibutuhkan)
- [ ] Konfirmasi backup point-in-time yang akan dipakai.
- [ ] Restore ke DB target sesuai runbook restore.
- [ ] Verifikasi integritas data minimum.

Command baseline (lokal/staging):
```bash
npm run ops:backup:daily
tsx script/ops-restore-drill.ts --file backups/daily/<backup-file>.sql.gz --cleanup
```

### 5) Pasca rollback
- [ ] Jalankan smoke test checklist.
- [ ] Konfirmasi metrik kembali normal.
- [ ] Umumkan rollback selesai.

## Bukti Wajib
- Timestamp mulai/selesai rollback.
- Versi awal dan versi akhir.
- Link log deploy/restore.
- Hasil smoke test pasca rollback.

## Exit Criteria
- Service kembali stabil.
- Alur critical path lulus smoke.
- Incident memiliki RCA action owner.
