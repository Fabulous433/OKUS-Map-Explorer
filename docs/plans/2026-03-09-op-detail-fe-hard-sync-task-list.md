# OP Detail FE Hard Sync — Task List

> **For Claude/Codex:** Use [$executing-plans](C:\Users\NB - MBA\.agents\skills\executing-plans\SKILL.md) to implement this plan in batches, with review checkpoints after each batch.

## Goal
Menyelaraskan form detail `Objek Pajak` di frontend dengan kebutuhan final sistem, sehingga:
- semua jenis detail OP tampil di FE,
- field yang tampil sesuai schema final bisnis,
- field legacy/alias lama dihapus,
- payload create/edit/import/export konsisten,
- validasi FE dan backend tidak drift.

## Decision Lock
1. FE detail OP harus hard-sync ke field final bisnis.
2. `PBJT Makanan dan Minuman` memakai:
   - `jenisUsaha`
   - `klasifikasi` khusus `Restoran`
   - `kapasitasTempat`
   - `jumlahKaryawan`
   - `rata2Pengunjung`
   - `jamBuka`
   - `jamTutup`
   - `hargaTermurah`
   - `hargaTermahal`
3. `PBJT Jasa Perhotelan` memakai:
   - `jenisUsaha`
   - `jumlahKamar`
   - `klasifikasi`
   - `fasilitas` sebagai `text[]`
   - `rata2PengunjungHarian`
   - `hargaTermurah`
   - `hargaTermahal`
4. `PBJT Hiburan` memakai:
   - `jenisHiburan`
   - `kapasitas`
   - `jamOperasional`
   - `jumlahKaryawan`
5. `PBJT Parkir` memakai:
   - `jenisUsaha`
   - `jenisLokasi`
   - `kapasitasKendaraan`
   - `tarifParkir`
   - `rata2Pengunjung`
6. `PBJT Tenaga Listrik` memakai:
   - `jenisTenagaListrik`
   - `dayaListrik`
   - `kapasitas`
7. Opsi `jenisUsaha`/`jenisHiburan` PBJT mengikuti source of truth JSON resmi, dengan aturan:
   - makanan-minuman: `Restoran | Jasa Boga/Katering`
   - perhotelan: daftar jenis usaha resmi
   - parkir: `Parkir Umum | Parkir Swasta`
   - tenaga listrik: `Konsumsi PLN | Produksi Sendiri | Industri/Migas`
   - hiburan: daftar resmi + `Tontonan Bioskop`, `Permainan Ketangkasan`, `Lainnya`
8. `PBJT Hiburan` pilihan `Lainnya` tidak menambah kolom baru; FE memetakan input bebas ke `jenisHiburan`.
9. `Pajak Reklame` memakai:
   - `jenisReklame`
   - `judulReklame`
   - `ukuranPanjang`
   - `ukuranLebar`
   - `ukuranTinggi`
   - `masaBerlaku`
   - `statusReklame`
   - `namaBiroJasa`
10. `Pajak Air Tanah` memakai:
   - `jenisAirTanah`
   - `kriteriaAirTanah`
   - `kelompokUsaha`
   - `rata2UkuranPemakaian`
11. `Pajak Sarang Burung Walet` memakai:
   - `jenisBurungWalet`
   - `panenPerTahun`
   - `rata2BeratPanen`
12. `Pajak MBLB` tetap tanpa panel detail khusus di fase ini.
13. Field legacy berikut harus dihapus dari FE dan contract utama:
   - `jamOperasi`
   - `fasilitasTambahan`
   - `kapasitasPenonton`
   - `frekuensi`
   - `ukuranReklame`
   - `lokasiPenempatan`

## Relevant Files
- [shared/schema.ts](D:/Code/OKUS-Map-Explorer/shared/schema.ts) - Tabel detail pajak, Zod schema, dan tipe shared contract yang harus disinkronkan.
- [server/storage.ts](D:/Code/OKUS-Map-Explorer/server/storage.ts) - Mapper read/write detail OP, hydrate detail, dan serializer list/detail.
- [server/routes.ts](D:/Code/OKUS-Map-Explorer/server/routes.ts) - Endpoint create/update/import/export OP yang membaca payload detail.
- [client/src/pages/backoffice/objek-pajak.tsx](D:/Code/OKUS-Map-Explorer/client/src/pages/backoffice/objek-pajak.tsx) - Form OP, panel detail per jenis pajak, normalizer edit/create, warning/error display.
- [client/src/lib/queryClient.ts](D:/Code/OKUS-Map-Explorer/client/src/lib/queryClient.ts) - Normalisasi error bila ada perubahan payload validasi.
- [tests/integration/final-contract.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/final-contract.integration.ts) - Regression contract OP create/update/read.
- [tests/integration/op-detail-validation.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/op-detail-validation.integration.ts) - Validasi field detail per jenis pajak.
- [tests/integration/op-csv-roundtrip.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/op-csv-roundtrip.integration.ts) - Roundtrip import/export field detail.
- [tests/integration/governance-quality.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/governance-quality.integration.ts) - Cek efek samping ke quality/report bila shape detail berubah.
- [docs/api-spec.md](D:/Code/OKUS-Map-Explorer/docs/api-spec.md) - Dokumentasi contract field detail OP.
- [docs/changelog.md](D:/Code/OKUS-Map-Explorer/docs/changelog.md) - Catatan perubahan user-facing.

## Notes
- Jalur implementasi default: branch fitur dibuat dari `codex/staging`.
- Ini adalah perubahan contract untuk detail OP, terutama:
  - `fasilitas` hotel dari text tunggal menjadi `text[]`
  - reklame dari `ukuranReklame` tunggal menjadi 3 kolom ukuran
- Implementasi harus diperlakukan sebagai hard cutover, bukan kompatibilitas setengah jalan.

## Instructions for Completing Tasks
**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang sub-task sebelum command verifikasi batch dijalankan dan hasilnya dibaca.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Checkout dari branch dasar `codex/staging`
  - [x] 0.2 Buat branch fitur, contoh: `codex/op-detail-hard-sync`
  - [x] 0.3 Pastikan worktree bersih sebelum implementasi dimulai

- [x] 1.0 Audit and lock final detail contract across schema, FE, and API
  - [x] 1.1 Petakan per jenis pajak: field final bisnis vs field schema vs field FE saat ini
  - [x] 1.2 Tandai semua alias/legacy field yang harus dihapus dari contract utama
  - [x] 1.3 Verifikasi bahwa `MBLB` tetap tanpa panel detail khusus
  - [x] 1.4 Update dokumen contract internal bila ada penyesuaian nama field final sebelum implementasi code

- [x] 2.0 Refactor shared schema and backend detail contracts
  - [x] 2.1 Ubah schema perhotelan agar `fasilitas` menjadi `text[]`
  - [x] 2.2 Ubah schema reklame dari `ukuranReklame` tunggal menjadi `ukuranPanjang`, `ukuranLebar`, `ukuranTinggi`
  - [x] 2.3 Update Zod detail schema untuk semua jenis agar sesuai keputusan final
  - [x] 2.4 Hapus alias/legacy field yang tidak lagi menjadi source of truth
  - [x] 2.5 Pastikan type shared untuk read/write payload tidak drift dengan schema baru

- [x] 3.0 Refactor backend read/write mapping for final detail payload
  - [x] 3.1 Update mapper create/update OP agar menerima detail final semua jenis pajak
  - [x] 3.2 Update hydrator detail OP saat read/edit agar FE menerima field final yang sama
  - [x] 3.3 Pastikan hanya satu shape detail yang aktif per jenis pajak
  - [x] 3.4 Rapikan serializer agar tidak lagi mengirim alias lama ke FE
  - [x] 3.5 Review dampak ke import/export OP dan siapkan mapping final

- [x] 4.0 Complete and replace FE detail panels for existing rendered jenis pajak
  - [x] 4.1 Lengkapi panel `PBJT Makanan dan Minuman` dengan seluruh field final
  - [x] 4.2 Ganti input `jamOperasi` menjadi `jamBuka` dan `jamTutup`
  - [x] 4.3 Lengkapi panel `PBJT Jasa Perhotelan` dan ubah `fasilitas` menjadi multi-select
  - [x] 4.4 Lengkapi panel `PBJT Hiburan` dan hapus `kapasitasPenonton` serta `frekuensi`
  - [x] 4.5 Lengkapi panel `PBJT Parkir` dengan `rata2Pengunjung`
  - [x] 4.6 Refactor panel `Pajak Reklame` agar memakai 3 kolom ukuran dan field final lain

- [x] 5.0 Add missing FE panels for unrendered jenis pajak
  - [x] 5.1 Tambahkan panel `PBJT Tenaga Listrik`
  - [x] 5.2 Tambahkan panel `Pajak Air Tanah`
  - [x] 5.3 Tambahkan panel `Pajak Sarang Burung Walet`
  - [x] 5.4 Pastikan `DetailFieldsByJenis` merender semua jenis pajak final yang memang punya detail
  - [x] 5.5 Pastikan ganti rekening pajak mereset detail lama yang tidak relevan

- [x] 6.0 Remove legacy FE field aliases and normalize form payload
  - [x] 6.1 Hapus alias `jamOperasi`, `fasilitasTambahan`, `kapasitasPenonton`, `frekuensi`
  - [x] 6.2 Hapus alias reklame `ukuranReklame` dan `lokasiPenempatan`
  - [x] 6.3 Rapikan normalizer `editOp.detailPajak` agar hanya memetakan field final
  - [x] 6.4 Rapikan `normalizeOpPayload` agar submit hanya mengirim field final
  - [x] 6.5 Pastikan error field tetap terikat ke input yang benar setelah refactor

- [x] 7.0 Update import, export, docs, and user-facing contract references
  - [x] 7.1 Update import CSV OP agar field detail final baru dikenali
  - [x] 7.2 Update export CSV OP agar mengeluarkan kolom detail final baru
  - [x] 7.3 Update [docs/api-spec.md](D:/Code/OKUS-Map-Explorer/docs/api-spec.md) untuk payload detail OP final
  - [x] 7.4 Tambahkan catatan perubahan user-facing di [docs/changelog.md](D:/Code/OKUS-Map-Explorer/docs/changelog.md)

- [x] 8.0 Add and update automated tests for full detail alignment
  - [x] 8.1 Tambahkan regression test Makan Minum dengan semua field final
  - [x] 8.2 Tambahkan regression test Perhotelan dengan `fasilitas[]`
  - [x] 8.3 Tambahkan regression test Hiburan sesuai field final
  - [x] 8.4 Tambahkan regression test Parkir dengan `rata2Pengunjung`
  - [x] 8.5 Tambahkan regression test Reklame dengan `ukuranPanjang`, `ukuranLebar`, `ukuranTinggi`
  - [x] 8.6 Tambahkan regression test Tenaga Listrik
  - [x] 8.7 Tambahkan regression test Air Tanah
  - [x] 8.8 Tambahkan regression test Walet
  - [x] 8.9 Tambahkan regression test bahwa alias field lama tidak lagi dipakai contract utama

- [ ] 9.0 Run local verification and prepare for staging promotion
  - [x] 9.1 Jalankan `npm run check`
  - [x] 9.2 Jalankan `npm run build`
  - [x] 9.3 Jalankan integration tests terdampak:
    - `npm run test:integration:final-contract`
    - `npm run test:integration:detail-validation`
    - `npm run test:integration:csv-roundtrip`
    - `npm run test:integration:governance-quality`
  - [x] 9.4 Jalankan `npm run test:integration` bila perubahan sudah stabil
  - [ ] 9.5 Uji manual local minimal:
    - edit/create Makan Minum
    - edit/create Perhotelan
    - edit/create Hiburan
    - edit/create Parkir
    - edit/create Tenaga Listrik
    - edit/create Reklame
    - edit/create Air Tanah
    - edit/create Walet
  - [x] 9.6 Siapkan ringkasan hasil verifikasi sebelum push ke `codex/staging`

Verification summary:
- `npm run check` PASS
- `npm run build` PASS
- `npm run test:integration:detail-validation` PASS
- `npm run test:integration:csv-roundtrip` PASS
- `npm run test:integration:final-contract` PASS
- `npm run test:integration` PASS full suite
- `npm run test:integration:governance-quality` mengalami `tsx/esbuild spawn EPERM` saat dijalankan standalone di environment lokal ini, tetapi PASS saat dijalankan melalui full suite `npm run test:integration`

## Batch Execution Recommendation

### Batch 1
- `0.0` Create feature branch
- `1.0` Audit and lock final detail contract
- `2.0` Refactor shared schema and backend detail contracts

Checkpoint:
- Review perubahan schema detail hotel dan reklame
- Review contract field final sebelum FE disentuh

### Batch 2
- `3.0` Refactor backend read/write mapping
- `4.0` Complete and replace existing FE detail panels

Checkpoint:
- Review payload create/edit/detail OP
- Review panel FE untuk jenis yang sudah ada

### Batch 3
- `5.0` Add missing FE panels
- `6.0` Remove legacy aliases and normalize form payload
- `7.0` Update import/export/docs

Checkpoint:
- Review panel baru dan penghapusan field legacy
- Review import/export contract

### Batch 4
- `8.0` Add/update automated tests
- `9.0` Run local verification and prepare staging promotion

Checkpoint:
- Review hasil test lokal
- Review readiness sebelum push ke `codex/staging`

## Acceptance Criteria
1. Semua jenis detail OP yang disepakati tampil di FE.
2. Tidak ada lagi panel FE yang memakai field legacy sebagai source of truth.
3. `Perhotelan.fasilitas` disimpan dan dibaca ulang sebagai `text[]`.
4. `Reklame` memakai 3 kolom ukuran final, bukan ukuran tunggal.
5. `Makan Minum` memakai `jamBuka` dan `jamTutup`, bukan `jamOperasi`.
6. `Tenaga Listrik`, `Air Tanah`, dan `Walet` punya panel detail FE yang berfungsi.
7. Import/export/detail API mengikuti field final baru.
8. Integration test dan verifikasi lokal lulus sebelum dipromosikan ke staging.

