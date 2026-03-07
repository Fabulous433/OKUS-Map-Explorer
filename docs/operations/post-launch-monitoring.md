# Post-Launch Monitoring Guide (Week 1-2 Production)

## Tujuan
Memastikan stabilisasi produksi pasca go-live dengan monitoring terstruktur.

## Monitoring Harian
- Availability service.
- p95 latency endpoint utama.
- Error rate API.
- Slow query frequency.
- Job export harian/mingguan.

## Daily Checklist
- [ ] Tidak ada incident P0/P1 aktif.
- [ ] Backup job sukses.
- [ ] Scheduled export sukses.
- [ ] Dashboard summary endpoint sehat.
- [ ] Tidak ada lonjakan error auth/rate-limit abnormal.

## Daily Report Template
- Tanggal:
- Availability:
- p95 list/dashboard:
- Incident summary:
- Action today:

## Trigger Eskalasi
- Availability < target harian.
- p95 > 2x baseline selama > 30 menit.
- Error rate critical path meningkat berulang.
