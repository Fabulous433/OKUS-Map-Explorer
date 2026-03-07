# Priority vs Defer Matrix — Production Readiness

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memberi framework keputusan objektif untuk menentukan item mana yang harus dikerjakan sebelum production dan mana yang ditunda.

**Architecture:** Semua kandidat dinilai dengan scoring tetap 4 dimensi. Hasil skor langsung memetakan kategori `Must Do`, `Should Do`, atau `Backlog (Post-Production)` tanpa diskusi ulang ad-hoc.

**Tech Stack:** Dokumentasi kebijakan (`docs/*`), runbook operasional, integration test evidence.

---

## Scoring Dimensions
Gunakan skala 0-5 per dimensi:
- `Impact to Production Safety` (0-5)
- `Incident Risk Reduction` (0-5)
- `Effort` (0-5, dibalik saat scoring akhir)
- `Dependency Criticality` (0-5)

Formula:
- `Final Score = Safety + Risk Reduction + (5 - Effort) + Dependency`

Rule:
- `>= 14` -> **Must Do Before Production**
- `10-13` -> **Should Do**
- `< 10` -> **Post-Production Backlog**

## Initial Matrix (Decision Locked)

| Initiative | Safety | Risk Reduction | Effort | Dependency | Final Score | Decision |
|---|---:|---:|---:|---:|---:|---|
| Data lifecycle hardening (backup/restore/purge) | 5 | 5 | 2 | 5 | 18 | Must Do Before Production |
| UAT + release readiness (smoke/rollback/SLO gate) | 5 | 4 | 3 | 5 | 16 | Must Do Before Production |
| Reporting/export lanjutan (scheduled + format operasional) | 3 | 3 | 3 | 3 | 11 | Should Do |
| Deprecation offset pagination | 2 | 2 | 3 | 1 | 7 | Post-Production Backlog |

## Priority Lock
Urutan prioritas default:
1. `P0` Data lifecycle hardening
2. `P0` UAT + release readiness
3. `P1` Reporting/export lanjutan
4. `Backlog` Offset deprecation

## Defer Policy
Item defer sah jika:
- Skor < 10, atau
- Tidak memblokir safety/release gate production.

Item defer wajib:
- Dicatat pada `docs/future-plan.md` bagian backlog post-production.
- Memiliki trigger re-open jelas (misal: setelah 2 sprint production stabil).

## Review Cadence
- Matrix direview tiap akhir wave (2 minggu).
- Perubahan skor wajib menyertakan alasan dan evidence (incident, test result, load profile, dependency change).

## Decision Log Template
Gunakan format berikut saat ada perubahan prioritas:
- Date:
- Initiative:
- Old Score / New Score:
- Evidence:
- Decision:
- Owner Approval:
