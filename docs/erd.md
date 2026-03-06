# Entity Relationship Diagram (ERD)

## Diagram

```
┌──────────────────────────────────────────────┐
│                 wajib_pajak                  │
├──────────────────────────────────────────────┤
│ id                    SERIAL PK              │
│ jenis_wp              VARCHAR(20) NOT NULL   │
│ peran_wp              VARCHAR(20) NOT NULL   │
│ npwpd                 VARCHAR(30) NULL       │
│ status_aktif          VARCHAR(20) DEFAULT    │
│ nama_wp               TEXT NULL              │
│ nik_ktp_wp            VARCHAR(32) NULL       │
│ alamat_wp             TEXT NULL              │
│ kecamatan_wp          TEXT NULL              │
│ kelurahan_wp          TEXT NULL              │
│ telepon_wa_wp         VARCHAR(20) NULL       │
│ email_wp              VARCHAR(255) NULL      │
│ nama_pengelola        TEXT NULL              │
│ nik_pengelola         VARCHAR(32) NULL       │
│ alamat_pengelola      TEXT NULL              │
│ kecamatan_pengelola   TEXT NULL              │
│ kelurahan_pengelola   TEXT NULL              │
│ telepon_wa_pengelola  VARCHAR(20) NULL       │
│ created_at            TIMESTAMP DEFAULT NOW()│
│ updated_at            TIMESTAMP DEFAULT NOW()│
└──────────────────────────────────────────────┘
            │ 1:1 (wp_id = id)
            ▼
┌──────────────────────────────────────────────┐
│               wp_badan_usaha                 │
├──────────────────────────────────────────────┤
│ wp_id                 INTEGER PK/FK          │
│ nama_badan_usaha      TEXT NULL              │
│ npwp_badan_usaha      VARCHAR(32) NULL       │
│ alamat_badan_usaha    TEXT NULL              │
│ kecamatan_badan_usaha TEXT NULL              │
│ kelurahan_badan_usaha TEXT NULL              │
│ telepon_badan_usaha   VARCHAR(20) NULL       │
│ email_badan_usaha     VARCHAR(255) NULL      │
│ created_at            TIMESTAMP DEFAULT NOW()│
│ updated_at            TIMESTAMP DEFAULT NOW()│
└──────────────────────────────────────────────┘
            │
            │ 1:N (wp_id → id)
            ▼
┌──────────────────────────────────────┐
│           objek_pajak                │
├──────────────────────────────────────┤
│ id            SERIAL       PK       │
│ nopd          VARCHAR(30)  NOT NULL │
│ wp_id         INTEGER      FK       │
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
│ created_at    TIMESTAMP    DEFAULT  │
└──────────────────────────────────────┘
```

## Relasi
| Dari | Ke | Tipe | FK | Keterangan |
| --- | --- | --- | --- | --- |
| `wp_badan_usaha` | `wajib_pajak` | 1:1 | `wp_id -> wajib_pajak.id` | Profil badan usaha per WP |
| `objek_pajak` | `wajib_pajak` | N:1 | `wp_id -> wajib_pajak.id` | Satu WP dapat memiliki banyak OP |

## Constraint Khusus
- `npwpd` di `wajib_pajak` memakai partial unique index saat nilai tidak null.
- `npwpd` hanya boleh diisi saat update data WP.
- Validasi conditional `pemilik/pengelola` dan `badan_usaha` dilakukan di layer Zod + service.
