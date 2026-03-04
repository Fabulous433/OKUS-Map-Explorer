# Tech Stack, Conventions & Patterns

## Stack

| Layer | Teknologi | Versi | Keterangan |
|-------|-----------|-------|------------|
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Language** | TypeScript | 5.x | Strict mode |
| **Frontend Framework** | React | 18.x | SPA |
| **Build Tool** | Vite | 5.x | Dev server + bundler |
| **Routing** | wouter | 3.x | Lightweight client router |
| **Server State** | TanStack Query | v5 | Caching, refetch, mutations |
| **Map** | Leaflet + react-leaflet | 1.9.4 + 4.2.1 | Peta interaktif |
| **Backend** | Express.js | 4.x | REST API |
| **ORM** | Drizzle ORM | 0.38+ | Type-safe SQL |
| **Database** | PostgreSQL | 16 | Replit managed |
| **Validation** | Zod + drizzle-zod | 3.x | Schema-based validation |
| **CSS** | Tailwind CSS | 3.x | Utility-first |
| **UI Components** | shadcn/ui (Radix) | - | Headless primitives |
| **CSV** | csv-parse + csv-stringify | - | CSV processing |
| **File Upload** | multer | 1.x | Multipart handling |
| **Icons** | Lucide React | - | Icon library |

## Conventions

### File & Folder Structure
```
/
├── client/src/           # Frontend source
│   ├── pages/            # Route-level components
│   │   ├── map-page.tsx  # Halaman peta publik
│   │   └── backoffice/   # Halaman backoffice
│   ├── components/ui/    # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities (queryClient, utils)
├── server/               # Backend source
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations (IStorage)
│   ├── seed.ts           # Seed data
│   ├── vite.ts           # Vite dev middleware (jangan diubah)
│   └── index.ts          # Server entry point
├── shared/               # Shared between FE & BE
│   └── schema.ts         # Drizzle schema + types
├── docs/                 # Dokumentasi project
└── _ai-context/          # AI session context
```

### Naming Conventions
- **Files**: kebab-case (`map-page.tsx`, `wajib-pajak.tsx`)
- **Components**: PascalCase (`MapPage`, `BackofficeDashboard`)
- **Variables/Functions**: camelCase (`getAllWajibPajak`, `jenisPajak`)
- **Database columns**: snake_case (`wajib_pajak`, `nama_objek`)
- **API paths**: kebab-case (`/api/wajib-pajak`, `/api/objek-pajak`)
- **CSS**: Tailwind utility classes, neo-brutalist design tokens

### Patterns

#### Data Fetching (Frontend)
```tsx
const { data, isLoading } = useQuery<WajibPajak[]>({
  queryKey: ["/api/wajib-pajak"],
});
```
- Query key = API path (default fetcher sudah dikonfigurasi)
- Mutations menggunakan `apiRequest` dari `@/lib/queryClient`
- Invalidate cache setelah mutasi: `queryClient.invalidateQueries({ queryKey: [...] })`

#### Storage Pattern (Backend)
```ts
interface IStorage {
  getAllWajibPajak(): Promise<WajibPajak[]>;
  createWajibPajak(wp: InsertWajibPajak): Promise<WajibPajak>;
  // ...
}
```
- Routes memanggil `storage.method()`, tidak pernah langsung query DB
- Types dari `shared/schema.ts`

#### Validation
- Input validation via Zod schema dari `drizzle-zod`
- `createInsertSchema` otomatis generate schema dari Drizzle table
- `.partial()` untuk PATCH endpoints

### Design Tokens
```css
--background: 0 0% 100%;        /* White */
--foreground: 0 0% 0%;          /* Black */
--primary: 32 100% 50%;         /* Orange #FF6B00 */
--accent: 60 100% 50%;          /* Yellow #FFFF00 */
```
- Font sans: Space Grotesk
- Font heading: Archivo Black
- Font mono: IBM Plex Mono
- Border: 3-4px solid black
- Border radius: 0px
- Style: Neo-brutalist

### Jenis Pajak Color Map
| Jenis | Kode | Warna | Hex |
|-------|------|-------|-----|
| PBJT Makanan dan Minuman | MKN | Orange | #FF6B00 |
| PBJT Jasa Perhotelan | HTL | Blue | #2563EB |
| Pajak Reklame | RKL | Purple | #9333EA |
| PBJT Jasa Parkir | PKR | Green | #16A34A |
| PBJT Jasa Kesenian dan Hiburan | HBR | Pink | #DB2777 |
| PBJT Tenaga Listrik | LST | Orange2 | #EA580C |
| Pajak Air Tanah | AIR | Cyan | #0891B2 |
| Pajak Sarang Burung Walet | WLT | Gray | #6B7280 |
| Pajak MBLB | MBL | Dark Gray | #4B5563 |

### Commands
| Command | Fungsi |
|---------|--------|
| `npm run dev` | Start dev server (Express + Vite) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push Drizzle schema ke database |
| `npm run check` | TypeScript type checking |
