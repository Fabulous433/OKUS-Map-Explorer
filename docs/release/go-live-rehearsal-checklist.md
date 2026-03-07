# Go-Live Rehearsal Checklist

## Tujuan
Mensimulasikan hari-H go-live secara end-to-end sebelum production release.

## Pra-Rehearsal
- [ ] Release candidate ditandai.
- [ ] Tim on-duty dan escalation contact tersedia.
- [ ] Backup pre-release tersedia.
- [ ] Window rehearsal disetujui.

## Skenario Rehearsal
- [ ] Deploy candidate ke staging.
- [ ] Jalankan smoke checklist.
- [ ] Simulasi incident ringan (contoh: query error spike).
- [ ] Eksekusi rollback sesuai checklist.
- [ ] Verifikasi sistem kembali normal.

Command baseline:
```bash
npm run ops:smoke
npm run ops:backup:daily
tsx script/ops-restore-drill.ts --file backups/daily/<backup-file>.sql.gz --cleanup
```

## Metrik yang Dicatat
- Durasi deploy.
- Durasi deteksi incident.
- Durasi rollback.
- Durasi recovery ke kondisi normal.

## Exit
- [ ] Semua langkah rehearsal selesai.
- [ ] Temuan dan action item terdokumentasi.
- [ ] Status rehearsal: READY / NOT READY.
