# Mobile Backoffice Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merapikan pengalaman mobile/tablet backoffice agar alur Dashboard, Wajib Pajak, Objek Pajak, Master Data, dan Peta tetap usable dan konsisten tanpa mengorbankan desktop layout.

**Architecture:** Refactor mobile dilakukan setelah workflow attachment tersedia, sehingga struktur card, bottom navigation, dan drawer mobile langsung mengakomodasi attachment panel dan dialog yang sudah final. Pendekatan yang dipakai adalah responsive cutover di layer React/Tailwind dengan komponen mobile terpisah untuk navigation, record cards, dan map drawer, sementara desktop tetap mempertahankan layout neo-brutalist existing.

**Tech Stack:** React 18, Tailwind CSS, existing shadcn/ui primitives, Vaul drawer, TanStack Query, Framer Motion micro-interactions.

---

## Delivery Order
1. Navigation and shell mobile
2. Mobile card layouts for list pages
3. Map page mobile drawer/FAB
4. Dashboard and master data polish
5. Manual viewport smoke + docs

## Execution Status
- [x] Task 1: Freeze Mobile Acceptance Checklist
- [x] Task 2: Build Mobile Shell and Bottom Navigation
- [x] Task 3: Refactor Mobile Wajib Pajak List
- [x] Task 4: Refactor Mobile Objek Pajak List
- [x] Task 5: Refactor Mobile Map Experience
- [x] Task 6: Dashboard and Master Data Mobile Polish
- [x] Task 7: Final Verification and Documentation

## Assumptions Locked
- Desktop layout existing dipertahankan; perubahan fokus di `< lg` dan `< md`.
- Master Data tetap rekening-only; kecamatan/kelurahan tidak dikembalikan ke UI.
- Mobile refactor harus mempertimbangkan panel attachment WP/OP dari fase sebelumnya.
- Tidak menambah auth flow baru; hanya layout dan interaction changes.

### Task 1: Freeze Mobile Acceptance Checklist

**Files:**
- Create: `docs/uat/mobile-backoffice-smoke-checklist.md`
- Modify: `docs/redesign-mobile-ver.md`

**Step 1: Write the mobile acceptance checklist**

Buat `docs/uat/mobile-backoffice-smoke-checklist.md` dengan device targets:
- `390x844` phone portrait
- `768x1024` tablet portrait
- `1024x768` tablet landscape

Checklist minimal:
- login page usable
- bottom navigation muncul di mobile
- list WP/OP tampil sebagai card di mobile
- dialog form masih usable dengan scroll
- map search/legend usable di drawer mobile
- attachment panel tetap bisa dibuka di mobile

**Step 2: Align redesign draft with actual file paths**

Ubah `docs/redesign-mobile-ver.md` agar memakai path aktual repo:
- `client/src/pages/backoffice/layout.tsx`
- `client/src/pages/backoffice/wajib-pajak.tsx`
- `client/src/pages/backoffice/objek-pajak.tsx`
- `client/src/pages/map-page.tsx`
- `client/src/pages/backoffice/dashboard.tsx`
- `client/src/index.css`

**Step 3: Commit**

```bash
git add docs/uat/mobile-backoffice-smoke-checklist.md docs/redesign-mobile-ver.md
git commit -m "docs: lock mobile refactor acceptance"
```

### Task 2: Build Mobile Shell and Bottom Navigation

**Files:**
- Create: `client/src/components/backoffice/mobile-bottom-nav.tsx`
- Modify: `client/src/pages/backoffice/layout.tsx`
- Modify: `client/src/index.css`

**Step 1: Record current shell behavior**

Run:
- `npm run check`
- `npm run build`
Expected: PASS baseline before layout changes.

**Step 2: Implement mobile bottom nav**

Di `client/src/components/backoffice/mobile-bottom-nav.tsx` buat nav fixed-bottom untuk:
- Dashboard
- Wajib Pajak
- Objek Pajak
- Peta

Di `client/src/pages/backoffice/layout.tsx`:
- sembunyikan sidebar di mobile
- tampilkan compact top bar mobile
- tambahkan bottom padding pada content area
- pertahankan sidebar di desktop

**Step 3: Add mobile shadow tuning**

Di `client/src/index.css` tambahkan media query mobile untuk:
- shadow lebih tipis
- transition halus pada nav item aktif/hover/tap

**Step 4: Run verification**

Run:
- `npm run check`
- `npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add client/src/components/backoffice/mobile-bottom-nav.tsx client/src/pages/backoffice/layout.tsx client/src/index.css
git commit -m "feat: add mobile backoffice shell"
```

### Task 3: Refactor Mobile Wajib Pajak List

**Files:**
- Create: `client/src/components/backoffice/mobile-wp-card.tsx`
- Modify: `client/src/pages/backoffice/wajib-pajak.tsx`
- Modify: `client/src/hooks/use-mobile.tsx`

**Step 1: Implement mobile card component**

Card menampilkan:
- display name
- NPWPD
- peran
- status aktif
- kontak ringkas
- action buttons utama

**Step 2: Switch table to card layout under mobile breakpoint**

Di `client/src/pages/backoffice/wajib-pajak.tsx`:
- `< md`: render card list
- `md+`: pertahankan tabel
- header tombol tambah jadi full-width di mobile

**Step 3: Verify WP page**

Run:
- `npm run check`
Expected: PASS.

Manual smoke:
- filter/search tetap jalan
- duplicate modal masih usable di mobile
- attachment panel WP masih bisa dibuka dari dialog

**Step 4: Commit**

```bash
git add client/src/components/backoffice/mobile-wp-card.tsx client/src/pages/backoffice/wajib-pajak.tsx client/src/hooks/use-mobile.tsx
git commit -m "feat: add mobile wajib pajak cards"
```

### Task 4: Refactor Mobile Objek Pajak List

**Files:**
- Create: `client/src/components/backoffice/mobile-op-card.tsx`
- Modify: `client/src/pages/backoffice/objek-pajak.tsx`
- Modify: `client/src/pages/backoffice/objek-pajak-form-dialog.tsx`

**Step 1: Implement OP mobile card**

Card menampilkan:
- NOPD
- nama objek
- badge jenis pajak
- wajib pajak
- status/verifikasi
- nilai pajak per bulan
- aksi edit/detail utama

**Step 2: Make OP dialog mobile-safe**

Di `client/src/pages/backoffice/objek-pajak-form-dialog.tsx`:
- pastikan dialog tinggi maksimum viewport mobile
- scroll internal aman
- attachment section dan detail pajak tidak overflow horizontal

**Step 3: Verify OP page**

Run:
- `npm run check`
Expected: PASS.

Manual smoke:
- create/edit OP di mobile
- detail pajak semua jenis tetap terbaca
- attachment panel OP tetap usable

**Step 4: Commit**

```bash
git add client/src/components/backoffice/mobile-op-card.tsx client/src/pages/backoffice/objek-pajak.tsx client/src/pages/backoffice/objek-pajak-form-dialog.tsx
git commit -m "feat: add mobile objek pajak cards"
```

### Task 5: Refactor Mobile Map Experience

**Files:**
- Create: `client/src/components/map/mobile-map-drawer.tsx`
- Modify: `client/src/pages/map-page.tsx`
- Modify: `client/src/components/ui/drawer.tsx`

**Step 1: Implement mobile drawer shell**

Drawer berisi:
- search input
- filter kecamatan
- filter rekening
- legend ringkas
- meta viewport (`totalInView`, `isCapped`)

**Step 2: Add FAB trigger and compact mobile header**

Di `client/src/pages/map-page.tsx`:
- mobile: search/filter pindah ke drawer bawah
- desktop: panel kiri tetap
- header mobile lebih compact
- FAB search/filter fixed di mobile

**Step 3: Verify map page**

Run:
- `npm run check`
- `npm run build`
Expected: PASS.

Manual smoke:
- drawer buka/tutup halus
- map tetap bisa pan/zoom
- viewport query tidak spam request saat drawer dibuka

**Step 4: Commit**

```bash
git add client/src/components/map/mobile-map-drawer.tsx client/src/pages/map-page.tsx client/src/components/ui/drawer.tsx
git commit -m "feat: optimize mobile map workflow"
```

### Task 6: Dashboard and Master Data Mobile Polish

**Files:**
- Modify: `client/src/pages/backoffice/dashboard.tsx`
- Modify: `client/src/pages/backoffice/master-data.tsx`
- Modify: `client/src/index.css`

**Step 1: Tighten dashboard spacing**

Kurangi padding dan heading size di mobile tanpa mengubah hierarchy desktop.

**Step 2: Make rekening-only master data mobile-safe**

Di `client/src/pages/backoffice/master-data.tsx`:
- form add/edit rekening stack vertikal di mobile
- table rekening jadi card/stack jika perlu pada `< md`

**Step 3: Verify pages**

Run:
- `npm run check`
Expected: PASS.

Manual smoke:
- dashboard summary cards rapi di phone
- master data rekening masih bisa dikelola dari mobile

**Step 4: Commit**

```bash
git add client/src/pages/backoffice/dashboard.tsx client/src/pages/backoffice/master-data.tsx client/src/index.css
git commit -m "feat: polish mobile dashboard and master data"
```

### Task 7: Final Verification and Documentation

**Files:**
- Modify: `docs/changelog.md`
- Modify: `docs/future-plan.md`
- Modify: `docs/local-development.md`

**Step 1: Document responsive behavior**

Tambahkan ringkasan perilaku mobile/tablet di docs agar QA tahu expected layout per breakpoint.

**Step 2: Run final verification**

Run:
- `npm run check`
- `npm run build`
Expected: PASS.

Manual smoke gunakan `docs/uat/mobile-backoffice-smoke-checklist.md` pada tiga viewport target.

**Step 3: Commit**

```bash
git add docs/changelog.md docs/future-plan.md docs/local-development.md
git commit -m "docs: record mobile backoffice refactor"
```

## Final Verification
- `npm run check`
- `npm run build`
- Manual viewport smoke via `docs/uat/mobile-backoffice-smoke-checklist.md`
- Staging validation pada phone + tablet viewport:
  - WP/OP list cards tampil benar
  - duplicate modal WP tetap usable
  - attachment panel WP/OP tetap usable
  - map drawer dan FAB tidak mengganggu viewport query
