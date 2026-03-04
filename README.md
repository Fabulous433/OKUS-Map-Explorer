# 🗺️ Peta Pajak Daerah — OKU Selatan

Aplikasi web interaktif untuk visualisasi dan pengelolaan data **Pajak Daerah** di Kabupaten Ogan Komering Ulu Selatan (OKU Selatan), Sumatera Selatan, Indonesia.

---

## Fitur Utama

### Peta Publik (`/`)
- Peta interaktif dengan marker berwarna per jenis pajak daerah
- Pencarian WP (Wajib Pajak) dan OP (Objek Pajak) — klik WP untuk melihat semua OP terkait
- Cluster marker untuk objek pajak di lokasi yang sama
- Legenda warna jenis pajak
- Switcher base map: OpenStreetMap, Google Satellite, ESRI, CartoDB
- Statistik total WP dan OP

### Backoffice (`/backoffice`)
- **Dashboard** — Progress tracking pendataan per jenis pajak (total vs sudah update vs belum)
- **Wajib Pajak** — CRUD lengkap, tabel data, pencarian, edit
- **Objek Pajak** — CRUD lengkap, map picker lokasi, form detail per jenis pajak, edit
- **Import/Export CSV** — Upload dan download data WP & OP dalam format CSV

### 9 Jenis Pajak Daerah
| Kode | Jenis Pajak | Warna Marker |
|------|------------|--------------|
| MKN | PBJT Makanan dan Minuman | 🟠 Orange |
| HTL | PBJT Jasa Perhotelan | 🔵 Blue |
| RKL | Pajak Reklame | 🟣 Purple |
| PKR | PBJT Jasa Parkir | 🟢 Green |
| HBR | PBJT Jasa Kesenian dan Hiburan | 🩷 Pink |
| LST | PBJT Tenaga Listrik | 🟠 Orange2 |
| AIR | Pajak Air Tanah | 🔵 Cyan |
| WLT | Pajak Sarang Burung Walet | ⚫ Gray |
| MBL | Pajak MBLB | ⚫ Dark Gray |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Map | Leaflet + react-leaflet v4 |
| Routing | wouter |
| State | TanStack Query v5 |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod + drizzle-zod |
| CSV | csv-parse, csv-stringify, multer |

**Design**: Neo-brutalist — border tebal, sudut tajam, warna kontras tinggi (hitam, kuning acid, orange).

---

## Quick Start

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Aplikasi berjalan di `http://localhost:5000`.

---

## Struktur Project

```
├── client/src/
│   ├── pages/
│   │   ├── map-page.tsx              # Peta publik
│   │   └── backoffice/
│   │       ├── layout.tsx            # Layout sidebar backoffice
│   │       ├── dashboard.tsx         # Dashboard progress pendataan
│   │       ├── wajib-pajak.tsx       # CRUD Wajib Pajak
│   │       └── objek-pajak.tsx       # CRUD Objek Pajak
│   ├── components/ui/               # shadcn/ui components
│   └── lib/                         # Utilities
├── server/
│   ├── routes.ts                    # 14 API endpoints
│   ├── storage.ts                   # Database operations
│   └── seed.ts                      # Seed data (Muaradua)
├── shared/
│   └── schema.ts                    # Drizzle schema + types
├── docs/                            # Dokumentasi teknis
│   ├── prd.md                       # Product requirements
│   ├── erd.md                       # Database schema
│   ├── architecture.md              # System design + ADR
│   ├── api-spec.md                  # API documentation
│   └── tech-stack.md                # Stack & conventions
└── _ai-context/                     # AI session context
    ├── design.md                    # Technical constitution
    ├── scope.md                     # Project charter
    ├── tracker.md                   # Task registry
    ├── todo.md                      # Current session
    └── handoff.md                   # Session handoff
```

---

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/wajib-pajak` | List semua WP |
| POST | `/api/wajib-pajak` | Tambah WP baru |
| PATCH | `/api/wajib-pajak/:id` | Update WP |
| DELETE | `/api/wajib-pajak/:id` | Hapus WP |
| GET | `/api/wajib-pajak/export` | Export WP ke CSV |
| POST | `/api/wajib-pajak/import` | Import WP dari CSV |
| GET | `/api/objek-pajak` | List semua OP |
| GET | `/api/objek-pajak/:id` | Detail satu OP |
| POST | `/api/objek-pajak` | Tambah OP baru |
| PATCH | `/api/objek-pajak/:id` | Update OP |
| DELETE | `/api/objek-pajak/:id` | Hapus OP |
| GET | `/api/objek-pajak/export` | Export OP ke CSV |
| POST | `/api/objek-pajak/import` | Import OP dari CSV |

Dokumentasi lengkap: [`docs/api-spec.md`](docs/api-spec.md)

---

## Screenshots

Aplikasi terpusat di area **Muaradua**, ibu kota Kabupaten OKU Selatan, dengan seed data berisi WP dan OP nyata di sekitar Kecamatan Muaradua dan Batu Belang Jaya.

---

## Lisensi

MIT
