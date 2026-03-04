# Entity Relationship Diagram (ERD)

## Diagram

```
┌──────────────────────────────────────┐
│           wajib_pajak                │
├──────────────────────────────────────┤
│ id          SERIAL       PK         │
│ npwpd       VARCHAR(30)  NOT NULL   │
│ nama        TEXT         NOT NULL   │
│ nama_usaha  TEXT         NULLABLE   │
│ alamat      TEXT         NOT NULL   │
│ kelurahan   TEXT         NULLABLE   │
│ kecamatan   TEXT         NULLABLE   │
│ telepon     VARCHAR(20)  NULLABLE   │
│ email       VARCHAR(255) NULLABLE   │
│ jenis_pajak TEXT         NOT NULL   │
│ latitude    DECIMAL(10,7) NULLABLE  │
│ longitude   DECIMAL(10,7) NULLABLE  │
│ status      VARCHAR(20)  DEFAULT    │
│             'active'               │
│ created_at  TIMESTAMP    DEFAULT    │
│             NOW()                  │
└──────────────────────────────────────┘
           │
           │ 1:N (wp_id → id)
           ▼
┌──────────────────────────────────────┐
│           objek_pajak                │
├──────────────────────────────────────┤
│ id            SERIAL       PK       │
│ nopd          VARCHAR(30)  NOT NULL │
│ wp_id         INTEGER      FK →     │
│               wajib_pajak.id       │
│ jenis_pajak   TEXT         NOT NULL │
│ nama_objek    TEXT         NOT NULL │
│ alamat        TEXT         NOT NULL │
│ kelurahan     TEXT         NULLABLE │
│ kecamatan     TEXT         NULLABLE │
│ omset_bulanan DECIMAL(15,2) NULLABLE│
│ tarif_persen  DECIMAL(5,2) NULLABLE │
│ pajak_bulanan DECIMAL(15,2) NULLABLE│
│ rating        DECIMAL(3,1) NULLABLE │
│ review_count  INTEGER      NULLABLE │
│ detail_pajak  JSONB        NULLABLE │
│ latitude      DECIMAL(10,7) NULLABLE│
│ longitude     DECIMAL(10,7) NULLABLE│
│ status        VARCHAR(20)  DEFAULT  │
│               'active'             │
│ created_at    TIMESTAMP    DEFAULT  │
│               NOW()                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│             users                    │
├──────────────────────────────────────┤
│ id        VARCHAR  PK DEFAULT       │
│           gen_random_uuid()         │
│ username  TEXT     NOT NULL UNIQUE  │
│ password  TEXT     NOT NULL         │
└──────────────────────────────────────┘
```

## Relasi
| Dari | Ke | Tipe | FK Column | Keterangan |
|------|----|------|-----------|------------|
| objek_pajak | wajib_pajak | N:1 | wp_id → wajib_pajak.id | Satu WP memiliki banyak OP |

## Kolom JSONB: `detail_pajak`

Kolom `detail_pajak` menyimpan data spesifik per jenis pajak dalam format JSON. Struktur berbeda tergantung `jenis_pajak`:

### DetailPBJTMakanan
```json
{ "jenisUsaha": "string", "kapasitasTempat": 0, "jamOperasi": "string" }
```

### DetailPBJTHotel
```json
{ "jumlahKamar": 0, "klasifikasi": "string", "fasilitasTambahan": "string" }
```

### DetailPajakReklame
```json
{ "jenisReklame": "string", "ukuranPanjang": 0, "ukuranLebar": 0, "lokasiPenempatan": "string", "masaBerlaku": "string" }
```

### DetailPBJTParkir
```json
{ "jenisLokasi": "string", "kapasitasKendaraan": 0, "tarifParkir": "string" }
```

### DetailPBJTHiburan
```json
{ "jenisHiburan": "string", "kapasitasPenonton": 0, "frekuensi": "string" }
```

## Catatan
- `detail_pajak = NULL` berarti OP belum di-update detail-nya (digunakan dashboard untuk tracking progress)
- `status` default `"active"`, bisa diubah untuk soft-delete
- `users` tabel tersedia tapi belum digunakan untuk autentikasi backoffice (future)
