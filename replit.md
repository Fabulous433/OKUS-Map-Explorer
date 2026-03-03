# OKU Selatan Interactive Map & Pajak Daerah Application

## Overview
A web-based interactive map application for the OKU Selatan (Ogan Komering Ulu Selatan) region of Indonesia. Displays local landmarks from Wikipedia and enables recording/tracking of WP (Wajib Pajak/Taxpayers) and OP (Objek Pajak/Tax Objects) data focused on Pajak Daerah (regional taxes).

## Architecture
- **Frontend**: React + Vite with Leaflet maps (react-leaflet v4)
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with neo-brutalist design (thick borders, sharp corners, bold colors)

## Key Features
- Interactive map centered on Muaradua, OKU Selatan with pan/zoom controls
- Multi-layer base map switcher (OpenStreetMap, ESRI Satellite, CartoDB Positron)
- Wikipedia API integration for landmark data based on visible map bounds
- WP (Wajib Pajak) CRUD management with Pajak Daerah categories
- OP (Objek Pajak) full CRUD (create, read, update, delete) with click-to-navigate to map location
- Edit capability for existing Objek Pajak records via edit dialog
- Map-based location picker for setting OP coordinates (embedded mini-map in form dialog)
- Type-specific detail forms based on jenisPajak selection (PBJT Makanan, Hotel, Reklame, Parkir)
- Dashboard page with summary stats, bar charts per jenis pajak, per kecamatan, top 5 pajak/rating
- Layer toggling for Wiki landmarks, WP, and OP markers
- Side panels for quick data viewing from the map
- Pajak Daerah types: PBJT Makanan/Minuman, PBJT Perhotelan, Pajak Reklame, PBJT Parkir, etc.
- Business data with ratings and review counts
- URL-based focus navigation (/?lat=X&lng=Y&zoom=Z)

## Design System
- **Colors**: Black (#000), Acid Yellow (#FFFF00), Harsh Orange (#FF6B00), White (#FFF)
- **Fonts**: Space Grotesk (sans), Archivo Black (serif/headings), IBM Plex Mono (mono)
- **Style**: Neo-brutalist with 3-4px borders, 0px border-radius, high contrast
- **Jenis Pajak Colors**: Orange (Makanan), Blue (Perhotelan), Purple (Reklame), Green (Parkir)

## Project Structure
```
client/src/
  pages/
    map-page.tsx          # Main interactive map with base map switcher, Wikipedia landmarks, fly-to support
    wajib-pajak-page.tsx  # WP data management with jenisPajak and namaUsaha
    objek-pajak-page.tsx  # OP data management with edit, map picker, type-specific forms
    dashboard-page.tsx    # Dashboard with stats, charts per jenis pajak & kecamatan, top 5 lists
  App.tsx                 # Router setup (/, /wajib-pajak, /objek-pajak, /dashboard)
server/
  routes.ts              # API endpoints (GET, POST, PATCH, DELETE)
  storage.ts             # Database storage layer (PostgreSQL) with updateObjekPajak
  seed.ts                # Seed data with real Muaradua/Batu Belang Jaya businesses
shared/
  schema.ts              # Drizzle schema + types + JENIS_PAJAK_OPTIONS + detail types
```

## Database Schema
- **wajib_pajak**: npwpd, nama, namaUsaha, jenisPajak, alamat, kelurahan, kecamatan, telepon, email, lat/lng, status
- **objek_pajak**: nopd, wpId, jenisPajak, namaObjek, alamat, omsetBulanan, tarifPersen, pajakBulanan, rating, reviewCount, detailPajak (jsonb), lat/lng, status

## API Endpoints
- `GET /api/landmarks?north=&south=&east=&west=` - Wikipedia landmarks by bounds
- `GET /api/wajib-pajak` - List all WP
- `POST /api/wajib-pajak` - Create WP
- `DELETE /api/wajib-pajak/:id` - Delete WP
- `GET /api/objek-pajak` - List all OP
- `GET /api/objek-pajak/:id` - Get single OP
- `POST /api/objek-pajak` - Create OP
- `PATCH /api/objek-pajak/:id` - Update OP
- `DELETE /api/objek-pajak/:id` - Delete OP

## Dependencies
- leaflet, react-leaflet@4 - Map rendering
- drizzle-orm, pg - Database
- @tanstack/react-query - Data fetching
- wouter - Routing
