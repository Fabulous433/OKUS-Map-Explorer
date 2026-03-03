# OKU Selatan Interactive Map & Tax Data Application

## Overview
A web-based interactive map application for the OKU Selatan (Ogan Komering Ulu Selatan) region of Indonesia. Displays local landmarks from Wikipedia and enables recording/tracking of WP (Wajib Pajak/Taxpayers) and OP (Objek Pajak/Tax Objects) data.

## Architecture
- **Frontend**: React + Vite with Leaflet maps (react-leaflet v4)
- **Backend**: Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with neo-brutalist design (thick borders, sharp corners, bold colors)

## Key Features
- Interactive map centered on OKU Selatan with pan/zoom controls
- Wikipedia API integration for landmark data based on visible map bounds
- WP (Wajib Pajak) CRUD management
- OP (Objek Pajak) CRUD management
- Layer toggling for Wiki landmarks, WP, and OP markers
- Side panels for quick data viewing from the map

## Design System
- **Colors**: Black (#000), Acid Yellow (#FFFF00), Harsh Orange (#FF6B00), White (#FFF)
- **Fonts**: Space Grotesk (sans), Archivo Black (serif/headings), IBM Plex Mono (mono)
- **Style**: Neo-brutalist with 3-4px borders, 0px border-radius, high contrast

## Project Structure
```
client/src/
  pages/
    map-page.tsx        # Main interactive map with Wikipedia landmarks
    wajib-pajak-page.tsx # WP data management
    objek-pajak-page.tsx # OP data management
  App.tsx               # Router setup
server/
  routes.ts             # API endpoints
  storage.ts            # Database storage layer (PostgreSQL)
  seed.ts               # Seed data for WP and OP
shared/
  schema.ts             # Drizzle schema + types
```

## API Endpoints
- `GET /api/landmarks?north=&south=&east=&west=` - Wikipedia landmarks by bounds
- `GET /api/wajib-pajak` - List all WP
- `POST /api/wajib-pajak` - Create WP
- `DELETE /api/wajib-pajak/:id` - Delete WP
- `GET /api/objek-pajak` - List all OP
- `POST /api/objek-pajak` - Create OP
- `DELETE /api/objek-pajak/:id` - Delete OP

## Dependencies
- leaflet, react-leaflet@4 - Map rendering
- drizzle-orm, pg - Database
- @tanstack/react-query - Data fetching
- wouter - Routing
