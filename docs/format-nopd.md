## NOPD (Nomor Objek Pajak Daerah)

### Format

```
AA.BB.CC.XXXX
```

Total **13 karakter** (10 digit + 3 separator titik), disimpan di `objek_pajak_daerah.kode_objek`.

| Segmen | Posisi | Panjang | Keterangan |
|--------|--------|---------|-----------|
| `AA`   | 1–2    | 2       | `kodePajak` — posisi ke-4 kode rekening pajak |
| `BB`   | 4–5    | 2       | `kodeSubPajak` — posisi ke-5 kode rekening pajak |
| `CC`   | 7–8    | 2       | `kodeRincian` — 2 digit terakhir posisi ke-6 kode rekening |
| `XXXX` | 10–13  | 4       | Nomor urut 4-digit, zero-padded, per prefix AA.BB.CC |

### Hubungan dengan Kode Rekening Pajak

Format kode rekening pajak: `4.1.01.AA.BB.CCCC`

| Level | Segment   | Contoh  | Keterangan |
|-------|-----------|---------|-----------|
| 1     | `4`       | `4`     | Kelompok Pendapatan |
| 2     | `1`       | `1`     | PAD (Pendapatan Asli Daerah) |
| 3     | `01`      | `01`    | Pajak Daerah |
| 4     | `AA`      | `19`    | Jenis pajak (PBJT) |
| 5     | `BB`      | `01`    | Sub-jenis (MK = Makanan & Minuman) |
| 6     | `CCCC`    | `0001`  | Rincian; `CC` dalam NOPD = `CCCC.slice(-2)` = `01` |

### Nilai Kode AA (kodePajak)

| AA | Jenis Pajak |
|----|------------|
| `09` | Pajak Reklame (REKL) |
| `12` | Pajak Air Tanah (AIR-TH) |
| `13` | Pajak Sarang Burung Walet (SBW) |
| `14` | Pajak MBLB (Mineral Bukan Logam & Batuan) |
| `18` | Opsen Pajak MBLB (OPS-MBLB) |
| `19` | Pajak Barang dan Jasa Tertentu (PBJT) |
| `20` | Opsen Pajak Kendaraan Bermotor (OPS-PKB) |
| `21` | Opsen BBN Kendaraan Bermotor (OPS-BBNKB) |

### Nilai Kode BB untuk PBJT (AA = 19)

| BB | Segmen PBJT |
|----|------------|
| `01` | MK — Makanan & Minuman |
| `02` | LS — Listrik / Tenaga Listrik |
| `03` | HT — Hotel / Penginapan |
| `04` | PK — Parkir |
| `05` | HB — Hiburan |

### Aturan Khusus: Jenis Generik (REKL & MBLB)

Untuk jenis pajak **Reklame** (`AA=09`) dan **MBLB** (`AA=14`), satu objek pajak bisa memiliki
lebih dari satu rekening pajak sekaligus. Karena itu NOPD-nya **tidak diikat pada satu rekening**:

```
BB = 00, CC = 00
```

Contoh: `09.00.00.0001` = Reklame ke-1

### Nomor Urut (XXXX)

Counter 4-digit, di-scope per kombinasi `AA.BB.CC`.  
Query mengambil `MAX(CAST(split_part(kode_objek, '.', 4) AS INTEGER))` dari `objek_pajak_daerah`
dengan filter `LIKE 'AA.BB.CC.%'` lalu menambahkan 1.

### Contoh NOPD

| NOPD           | Arti |
|----------------|------|
| `19.01.01.0003` | PBJT-MK / Restoran (rincian ke-01) / urut ke-3 |
| `19.03.05.0001` | PBJT-HT / Pondok Wisata (rincian ke-05) / urut ke-1 |
| `19.05.12.0002` | PBJT-HB / Diskotek/Karaoke (rincian ke-12) / urut ke-2 |
| `09.00.00.0005` | Reklame (generik) / urut ke-5 |
| `14.00.00.0001` | MBLB (generik) / urut ke-1 |
| `12.01.01.0001` | Air Tanah / rincian 01 / urut ke-1 |