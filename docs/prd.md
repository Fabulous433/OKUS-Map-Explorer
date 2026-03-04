# Product Requirements Document (PRD)

## Nama Produk
**Peta Pajak Daerah OKU Selatan**

## Ringkasan
Aplikasi web interaktif untuk memvisualisasikan dan mengelola data Pajak Daerah di Kabupaten Ogan Komering Ulu Selatan (OKU Selatan), Sumatera Selatan, Indonesia. Terbagi menjadi dua area utama: peta publik untuk visualisasi dan backoffice untuk pengelolaan data.

## Target Pengguna
1. **Publik / Masyarakat** — Melihat sebaran objek pajak daerah di peta, mencari WP/OP
2. **Petugas Pajak / Admin** — Mengelola data WP & OP, memantau progress pendataan, import/export data

## Area Aplikasi

### 1. Front-end Publik (`/`)
Peta interaktif read-only yang menampilkan:
- Marker WP dan OP dengan warna berbeda per jenis pajak
- Pencarian WP/OP — klik WP menampilkan semua OP terkait
- Cluster marker untuk OP di lokasi yang sama
- Legenda warna jenis pajak
- Switcher base map (OSM, Google Satellite, ESRI, CartoDB)
- Statistik jumlah WP dan OP

### 2. Backoffice (`/backoffice/*`)
Panel administrasi untuk pengelolaan data:
- **Dashboard** (`/backoffice`) — Progress tracking pendataan per jenis pajak (total OP vs sudah update vs belum update `detailPajak`)
- **Wajib Pajak** (`/backoffice/wajib-pajak`) — CRUD lengkap WP, tabel data, import/export CSV
- **Objek Pajak** (`/backoffice/objek-pajak`) — CRUD lengkap OP, map picker lokasi, form detail per jenis pajak, import/export CSV

## Jenis Pajak Daerah yang Didukung
| Kode | Nama Lengkap |
|------|-------------|
| MKN | PBJT Makanan dan Minuman |
| HTL | PBJT Jasa Perhotelan |
| PKR | PBJT Jasa Parkir |
| HBR | PBJT Jasa Kesenian dan Hiburan |
| LST | PBJT Tenaga Listrik |
| RKL | Pajak Reklame |
| AIR | Pajak Air Tanah |
| WLT | Pajak Sarang Burung Walet |
| MBL | Pajak MBLB |

## Fitur Detail per Jenis Pajak (`detailPajak`)
- **Makanan/Minuman**: jenisUsaha, kapasitasTempat, jamOperasi
- **Perhotelan**: jumlahKamar, klasifikasi, fasilitasTambahan
- **Reklame**: jenisReklame, ukuranPanjang, ukuranLebar, lokasiPenempatan, masaBerlaku
- **Parkir**: jenisLokasi, kapasitasKendaraan, tarifParkir
- **Hiburan**: jenisHiburan, kapasitasPenonton, frekuensi

## Functional Requirements
1. Peta harus menampilkan seluruh WP dan OP dengan marker berwarna sesuai jenis pajak
2. Pencarian harus mendukung nama, NPWPD/NOPD, alamat, dan jenis pajak
3. Klik WP di pencarian menampilkan semua OP milik WP tersebut di peta
4. Dashboard menunjukkan progress pendataan: berapa OP yang sudah diisi `detailPajak` vs belum
5. CRUD WP & OP lengkap (Create, Read, Update, Delete)
6. Import CSV harus memvalidasi data dan melaporkan hasil (X berhasil, Y gagal)
7. Export CSV mengunduh seluruh data dalam format yang bisa di-import kembali

## Non-Functional Requirements
- Responsif di desktop (prioritas utama)
- Load time peta < 3 detik untuk data seed
- Seed data menggunakan lokasi nyata di area Muaradua, OKU Selatan
