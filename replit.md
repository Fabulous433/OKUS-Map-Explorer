# OKU Selatan - Peta Pajak Daerah & Backoffice

## Overview
Web-based interactive map application for OKU Selatan (Ogan Komering Ulu Selatan), Indonesia. Two main areas:
1. **Front-end Publik** (`/`) — Read-only interactive map with WP/OP markers, search, colored by jenis pajak
2. **Backoffice** (`/backoffice/*`) — Dashboard (progress tracking per jenis pajak), WP/OP CRUD management, CSV import/export

## Architecture
- **Frontend**: React + Vite with Leaflet maps (react-leaflet v4)
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with neo-brutalist design (thick borders, sharp corners, bold colors)

## Key Features
- Interactive map centered on Muaradua, OKU Selatan with pan/zoom controls
- Multi-layer base map switcher (OpenStreetMap, Google Satellite, ESRI Satellite, CartoDB Positron)
- WP/OP search on map — results filter markers, WP click shows all related OPs, clustered OP display
- Jenis-pajak-specific colored markers with short labels (MKN, HTL, RKL, PKR, HBR, etc.)
- Legend panel showing color-to-jenis mapping
- Backoffice dashboard: progress tracking per jenis pajak (total vs sudah update vs belum)
- Full WP/OP CRUD in backoffice with edit support and table view
- Map-based location picker for setting OP coordinates
- Type-specific detail forms (PBJT Makanan, Hotel, Reklame, Parkir, Hiburan)
- CSV import/export for both WP and OP data
- URL-based focus navigation (/?lat=X&lng=Y&zoom=Z)

## Design System
- **Colors**: Black (#000), Acid Yellow (#FFFF00), Harsh Orange (#FF6B00), White (#FFF)
- **Fonts**: Space Grotesk (sans), Archivo Black (serif/headings), IBM Plex Mono (mono)
- **Style**: Neo-brutalist with 3-4px borders, 0px border-radius, high contrast
- **Jenis Pajak Colors**: Orange=#FF6B00 (Makanan), Blue=#2563EB (Perhotelan), Purple=#9333EA (Reklame), Green=#16A34A (Parkir), Pink=#DB2777 (Hiburan), Cyan=#0891B2 (Air Tanah), Gray=#6B7280 (others)

## Project Structure
```
client/src/
  pages/
    map-page.tsx                    # Public read-only map with search, colored markers, legend
    backoffice/
      layout.tsx                    # Shared backoffice layout with sidebar navigation
      dashboard.tsx                 # Progress tracking dashboard per jenis pajak
      wajib-pajak.tsx               # WP CRUD management with table, edit, import/export
      objek-pajak.tsx               # OP CRUD management with table, edit, map picker, detail forms, import/export
  App.tsx                           # Router (/, /backoffice, /backoffice/wajib-pajak, /backoffice/objek-pajak)
server/
  routes.ts                        # API endpoints + CSV import/export
  storage.ts                       # Database storage layer with updateWajibPajak + updateObjekPajak
  seed.ts                          # Seed data with real Muaradua businesses
shared/
  schema.ts                        # Drizzle schema + types + JENIS_PAJAK_OPTIONS + detail types
```

## Database Schema
- **wajib_pajak**: npwpd, nama, namaUsaha, jenisPajak, alamat, kelurahan, kecamatan, telepon, email, lat/lng, status
- **objek_pajak**: nopd, wpId, jenisPajak, namaObjek, alamat, omsetBulanan, tarifPersen, pajakBulanan, rating, reviewCount, detailPajak (jsonb), lat/lng, status

## API Endpoints
- `GET /api/wajib-pajak` - List all WP
- `POST /api/wajib-pajak` - Create WP
- `PATCH /api/wajib-pajak/:id` - Update WP
- `DELETE /api/wajib-pajak/:id` - Delete WP
- `GET /api/wajib-pajak/export` - Export WP to CSV
- `POST /api/wajib-pajak/import` - Import WP from CSV (multipart file upload)
- `GET /api/objek-pajak` - List all OP
- `GET /api/objek-pajak/:id` - Get single OP
- `POST /api/objek-pajak` - Create OP
- `PATCH /api/objek-pajak/:id` - Update OP
- `DELETE /api/objek-pajak/:id` - Delete OP
- `GET /api/objek-pajak/export` - Export OP to CSV
- `POST /api/objek-pajak/import` - Import OP from CSV (multipart file upload)

## Dependencies
- leaflet, react-leaflet@4 - Map rendering
- drizzle-orm, pg - Database
- @tanstack/react-query - Data fetching
- wouter - Routing
- csv-parse, csv-stringify - CSV processing
- multer - File upload handling
