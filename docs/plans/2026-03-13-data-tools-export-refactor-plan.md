# Data Tools Export Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merapikan export CSV `Wajib Pajak` dan `Objek Pajak` agar lebih operasional, tetap terdokumentasi, dan tidak merusak jalur import yang sudah ada.

**Architecture:** Pertahankan satu template export/import universal untuk roundtrip sistem, lalu tambahkan mode export operasional yang lebih ringkas. Untuk `Wajib Pajak`, export digeser ke struktur subjek tunggal berbasis `peran_wp` dengan import backward-compatible. Untuk `Objek Pajak`, export dipecah ke mode per-jenis pajak dengan kolom detail yang hanya relevan untuk jenis tersebut, sementara template universal tetap hidup sebagai baseline import.

**Tech Stack:** Express, Drizzle ORM, csv-stringify, csv-parse, React, TanStack Query, TypeScript.

---

## Scope

- Refactor export WP menjadi format compact dengan kolom subjek tunggal.
- Tambahkan kompatibilitas import WP untuk header compact baru dan header lama.
- Tambahkan indikator `lampiran` untuk export WP dan OP.
- Tambahkan mode export OP:
  - template import universal
  - operasional per jenis pajak
- Update UI `Data Tools` agar operator bisa memilih mode export yang sesuai.
- Update test integration, API spec, task log, dan changelog.

## Constraints

- Export template OP tetap harus importable.
- Perubahan export WP tidak boleh memutus CSV lama yang masih mungkin dipakai operator.
- Query lampiran harus berbasis agregasi, bukan loop `N+1`.
- Semua perubahan user-facing dan kontrak harus dicatat di docs.

## Files To Touch

- Modify: `D:\Code\OKUS-Map-Explorer\server\routes.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\backoffice\data-tools.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\tests\integration\op-csv-roundtrip.integration.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\wp-csv-contract.integration.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\api-spec.md`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`
- Create: `D:\Code\OKUS-Map-Explorer\tasks\tasks-data-tools-export-refactor.md`

## Acceptance Criteria

- Export WP menghasilkan kolom subjek tunggal dan kolom `lampiran`.
- Import WP menerima header compact baru dan header lama.
- Export OP default tetap usable sebagai template import.
- Export OP per-jenis hanya memuat detail yang relevan untuk jenis tersebut.
- Export WP/OP menandai lampiran dengan nilai `ADA` jika record punya attachment.
- UI `Data Tools` memperlihatkan pilihan export yang tidak ambigu untuk operator.
- Integration test dan build/typecheck lulus.
