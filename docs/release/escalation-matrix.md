# Escalation Matrix (Release & Incident)

## Tujuan
Memastikan jalur eskalasi jelas saat release bermasalah atau incident terjadi.

## Level Eskalasi

### Level 1 — Operasional
- Trigger: warning awal, job gagal sekali, anomali minor.
- Owner: on-duty engineer.
- SLA respon: <= 15 menit.

### Level 2 — Engineering Lead
- Trigger: smoke fail, rollback diperlukan, error spike berkelanjutan.
- Owner: engineering lead.
- SLA respon: <= 10 menit setelah eskalasi Level 1.

### Level 3 — Product/Management
- Trigger: downtime signifikan, risiko data loss, NO-GO release.
- Owner: product owner + release manager.
- SLA respon: immediate.

## Contact Slot Template
- On-duty engineer:
- Engineering lead:
- Product owner:
- Release manager:

## Komunikasi
- Channel utama:
- Channel cadangan:
- Format update status:
  - waktu,
  - status,
  - dampak,
  - next action,
  - owner.
