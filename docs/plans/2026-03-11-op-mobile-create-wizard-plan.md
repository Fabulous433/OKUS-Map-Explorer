# Mobile OP Create Wizard + Numeric Layout Plan

> For Claude/Codex: gunakan [$writing-plans](C:/Users/NB - MBA/.agents/skills/writing-plans/SKILL.md) sebelum implementasi, lalu eksekusi dengan [$executing-plans](C:/Users/NB - MBA/.agents/skills/executing-plans/SKILL.md) secara bertahap.

## Goal
- Memperbaiki keterbacaan field nominal mobile pada form OP.
- Mengubah flow create OP mobile dari single long form menjadi wizard bertahap yang lebih masuk akal untuk operator lapangan.
- Menghapus kebutuhan "simpan dulu baru upload lampiran" untuk create OP.

## Problem Summary
1. Field `omsetBulanan`, `tarifPersen`, dan `pajakBulanan` saat ini ditampilkan 3 kolom sejajar di mobile, sehingga nilai terpotong dan sulit dibaca.
2. Flow create OP saat ini memaksa user menyimpan record dulu sebelum dapat mengunggah foto/dokumen.
3. Form create OP mobile terlalu panjang, sehingga beban kognitif tinggi dan navigasi tidak efisien.

## Decision Lock
1. Perubahan wizard difokuskan untuk **create OP mobile-first**.
2. Flow edit OP existing tetap memakai dialog/form existing untuk fase ini.
3. Desktop create OP tetap boleh mempertahankan form existing pada fase awal, selama mobile wizard berjalan baik.
4. Attachment upload pada wizard bersifat **draft-local** sampai step terakhir `Periksa & Simpan`.
5. Record OP baru hanya dibuat di backend pada final submit, bukan di step awal.
6. Layout nominal mobile diubah menjadi satu field per baris.

## Target UX Flow
### Step 1: Pilih Rekening Pajak
- User memilih `rekPajakId`.
- Setelah rekening dipilih, wizard menentukan jenis detail pajak yang harus tampil.
- CTA:
  - `Lanjut ke Detail`

### Step 2: Detail Usaha
- Menampilkan field detail sesuai rekening/jenis pajak.
- CTA:
  - `Kembali`
  - `Lanjut ke Data OP`

### Step 3: Data OP
- Field inti OP:
  - `nopd`
  - `namaOp`
  - `wpId`
  - `alamatOp`
  - `kecamatanId`
  - `kelurahanId`
  - `omsetBulanan`
  - `tarifPersen`
  - `pajakBulanan`
  - `status`
- CTA:
  - `Kembali ke Detail`
  - `Lanjut ke Lokasi`

### Step 4: Lokasi
- Map picker + latitude/longitude.
- CTA:
  - `Kembali ke Data OP`
  - `Lanjut ke Lampiran`

### Step 5: Lampiran
- Upload draft untuk:
  - foto usaha
  - foto lokasi
  - izin usaha
  - dokumen lain
- CTA:
  - `Kembali ke Lokasi`
  - `Periksa & Simpan`

### Step 6: Review Ringkas
- Tampilkan ringkasan rekening, detail usaha, data OP, lokasi, dan lampiran.
- CTA:
  - `Kembali ke Lampiran`
  - `Simpan OP`

## Architecture
- Wizard state disimpan penuh di React state lokal / react-hook-form context.
- Attachment disimpan sebagai pending files di client state sampai submit final.
- Final submit sequence:
  1. Create OP.
  2. Ambil `op.id` hasil create.
  3. Upload semua attachment pending ke endpoint attachment OP.
  4. Tampilkan hasil akhir dan reset wizard.
- Jika upload attachment sebagian gagal, create OP tidak di-rollback; tampilkan ringkasan file mana yang gagal diunggah.

## Scope
### Included
- Layout nominal mobile jadi satu kolom.
- Mobile create OP wizard full flow.
- Pending attachment draft pada create OP mobile.
- Step navigation + progress indicator.
- Review screen final.
- Docs dan smoke checklist update.

### Excluded
- Edit OP existing menjadi wizard.
- Desktop create OP redesign penuh.
- Offline save/resume draft.
- Background upload/retry queue lanjutan.

## Files Likely Affected
- `client/src/pages/backoffice/objek-pajak.tsx`
- `client/src/pages/backoffice/objek-pajak-form-dialog.tsx`
- `client/src/pages/backoffice/objek-pajak-detail-fields.tsx`
- `client/src/pages/backoffice/objek-pajak-shared.ts`
- `client/src/pages/backoffice/objek-pajak-map-picker.tsx`
- `client/src/components/attachments/attachment-panel.tsx`
- `client/src/components/attachments/attachment-upload-dialog.tsx`
- `client/src/lib/queryClient.ts`
- `docs/redesign-mobile-ver.md`
- `docs/uat/mobile-backoffice-smoke-checklist.md`
- `docs/changelog.md`

## Delivery Order
1. Numeric layout mobile quick fix.
2. Wizard shell + step state.
3. Detail/Data OP step split.
4. Lokasi + Lampiran draft step.
5. Final submit orchestration.
6. Smoke checklist + docs sync.

## Execution Status
- [ ] Task 1: Mobile Numeric Layout Fix
- [ ] Task 2: OP Wizard Shell and Step State
- [ ] Task 3: Split Detail and Data OP Steps
- [ ] Task 4: Add Lokasi and Lampiran Draft Steps
- [ ] Task 5: Final Review and Submit Orchestration
- [ ] Task 6: Verification and Documentation

## Task 1: Mobile Numeric Layout Fix
### Files
- Modify: `client/src/pages/backoffice/objek-pajak-form-dialog.tsx`
- Modify: `client/src/pages/backoffice/objek-pajak-detail-fields.tsx`

### Work
- Ubah layout mobile field `omsetBulanan`, `tarifPersen`, `pajakBulanan` menjadi stacked.
- Kecilkan horizontal padding input mobile agar lebih efisien.
- Pastikan desktop/tablet tidak regress.

### Acceptance
- Pada viewport phone, tiga field nominal tampil satu per baris.
- Nilai angka tidak terpotong.

## Task 2: OP Wizard Shell and Step State
### Files
- Modify/Create around `objek-pajak-form-dialog.tsx`
- Possible create: `client/src/pages/backoffice/objek-pajak-create-wizard.tsx`

### Work
- Buat state step wizard.
- Tambah progress header / stepper mobile.
- Wizard aktif hanya pada create flow mobile.
- Edit flow tetap pakai form existing.

### Acceptance
- User dapat berpindah step tanpa kehilangan state.
- Close dialog meng-clear draft state dengan konfirmasi jika ada perubahan.

## Task 3: Split Detail and Data OP Steps
### Work
- Pindahkan pemilihan rekening ke step pertama.
- Step kedua render detail fields by jenis pajak.
- Step ketiga render data OP inti.
- Validasi per-step, bukan langsung semua step.

### Acceptance
- User tidak bisa lanjut jika field wajib step aktif belum valid.
- Detail fields menyesuaikan rekening terpilih.

## Task 4: Add Lokasi and Lampiran Draft Steps
### Work
- Integrasikan map picker ke step lokasi.
- Tambah pending attachment draft list untuk create flow.
- User bisa tambah/hapus file sebelum final submit.

### Acceptance
- Lampiran draft bisa terlihat sebelum submit final.
- Tombol upload tidak lagi menunggu OP dibuat dulu.

## Task 5: Final Review and Submit Orchestration
### Work
- Tampilkan review ringkas semua step.
- Final submit create OP lalu upload attachment pending.
- Tangani partial attachment failure dengan pesan umum yang jelas.

### Acceptance
- Create OP baru + attachment berjalan dalam satu flow.
- Jika attachment gagal sebagian, user tahu file mana yang gagal.

## Task 6: Verification and Documentation
### Work
- Update `docs/redesign-mobile-ver.md`
- Update `docs/uat/mobile-backoffice-smoke-checklist.md`
- Update `docs/changelog.md`
- Jalankan:
  - `npm run check`
  - `npm run build`

### Manual Smoke Minimum
- Create OP mobile untuk 2 jenis pajak berbeda.
- Navigasi semua step `kembali/lanjut`.
- Upload minimal 1 foto usaha dan 1 foto lokasi.
- Final submit sukses.
- Cancel/close wizard tidak meninggalkan state liar.

## Risks
1. Wizard create dan edit berjalan berdampingan di file yang sama bisa bikin kompleksitas tinggi.
2. Pending attachment draft perlu pembatasan ukuran/jumlah agar tidak membebani memory mobile.
3. Validasi per-step harus hati-hati supaya tidak double-error dengan validasi final.

## Recommendation
- Kerjakan Task 1 dulu sebagai quick win kecil.
- Setelah itu baru Task 2-5 sebagai paket wizard create OP mobile.
