# Architecture & System Design

## Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │  Peta Publik  │  │   Backoffice (Dashboard,   │  │
│  │  (Leaflet)    │  │   CRUD WP/OP, CSV)         │  │
│  └──────┬───────┘  └──────────┬──────────────────┘  │
│         │                     │                     │
│         └──────────┬──────────┘                     │
│                    │ HTTP (fetch)                    │
└────────────────────┼────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────┐
│           Express.js Server (port 5000)             │
│                    │                                │
│  ┌─────────────────▼──────────────────┐             │
│  │         REST API Routes            │             │
│  │   /api/wajib-pajak/*              │             │
│  │   /api/objek-pajak/*              │             │
│  └─────────────────┬──────────────────┘             │
│                    │                                │
│  ┌─────────────────▼──────────────────┐             │
│  │    Storage Layer (IStorage)        │             │
│  │    DatabaseStorage (Drizzle ORM)   │             │
│  └─────────────────┬──────────────────┘             │
│                    │                                │
│  ┌─────────────────▼──────────────────┐             │
│  │    Vite Dev Server (middleware)    │             │
│  │    Serves frontend in dev mode     │             │
│  └────────────────────────────────────┘             │
└─────────────────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   PostgreSQL DB     │
          │   (Replit managed)  │
          └─────────────────────┘
```

## Pola Arsitektur

### Monolith dengan Shared Types
- Backend dan frontend dalam satu repository
- Shared types di `shared/schema.ts` menjamin konsistensi tipe data
- Drizzle ORM schema sebagai single source of truth untuk tipe TypeScript dan database

### Storage Pattern
- Interface `IStorage` mendefinisikan semua operasi data
- `DatabaseStorage` mengimplementasikan interface tersebut dengan PostgreSQL via Drizzle
- Routes hanya memanggil method storage, tidak langsung query database

### Frontend Architecture
- Single Page Application (SPA) dengan client-side routing (wouter)
- TanStack Query untuk server state management (caching, refetch)
- Leaflet (react-leaflet v4) untuk rendering peta

## Architecture Decision Records (ADR)

### ADR-001: react-leaflet v4 (bukan v5)
- **Konteks**: react-leaflet v5 membutuhkan React 19, project menggunakan React 18
- **Keputusan**: Gunakan react-leaflet v4.2.1
- **Konsekuensi**: Kompatibel dengan React 18, API stabil

### ADR-002: JSONB untuk detail_pajak
- **Konteks**: Setiap jenis pajak memiliki field detail yang berbeda
- **Keputusan**: Gunakan kolom JSONB daripada tabel terpisah per jenis pajak
- **Konsekuensi**: Fleksibel, mudah di-extend, tapi tidak ada validasi di level database — validasi dilakukan di aplikasi

### ADR-003: Tanpa autentikasi backoffice
- **Konteks**: Fase awal, fokus pada fungsi inti
- **Keputusan**: Backoffice terbuka tanpa login (tabel `users` sudah disiapkan untuk future use)
- **Konsekuensi**: Harus ditambahkan sebelum production deployment

### ADR-004: CSV import/export di memory
- **Konteks**: File CSV diproses langsung di memory (multer memoryStorage)
- **Keputusan**: Limit 5MB, parse synchronous
- **Konsekuensi**: Cukup untuk ratusan-ribuan record; untuk dataset sangat besar perlu streaming

### ADR-005: Neo-brutalist design
- **Konteks**: Identitas visual yang unik dan mudah dikenali
- **Keputusan**: Gaya neo-brutalist dengan border tebal, sudut tajam, warna kontras tinggi
- **Konsekuensi**: UI sangat distinctive, mungkin perlu penyesuaian untuk aksesibilitas

## Security Guidelines
- Environment variables disimpan sebagai Replit Secrets (`DATABASE_URL`, `SESSION_SECRET`)
- Input validation menggunakan Zod schema di setiap endpoint
- File upload dibatasi 5MB via multer
- Tidak ada SQL injection risk — semua query via Drizzle ORM parameterized queries
- **TODO**: Tambahkan autentikasi sebelum deploy ke production
