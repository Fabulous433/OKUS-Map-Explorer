
# Redesign Mobile/Tablet UI

## Tujuan
- Membuat backoffice tetap usable pada phone dan tablet tanpa merusak layout desktop.
- Menyesuaikan refactor mobile dengan workflow attachment WP/OP yang sudah final.

## Arah Perubahan

### 1. Shell backoffice mobile
- File utama: `client/src/pages/backoffice/layout.tsx`
- Mobile (`< lg`): sidebar disembunyikan, diganti compact header dan bottom navigation.
- Desktop (`lg+`): sidebar dan struktur existing dipertahankan.

### 2. List Wajib Pajak dan Objek Pajak
- File utama: `client/src/pages/backoffice/wajib-pajak.tsx`
- File utama: `client/src/pages/backoffice/objek-pajak.tsx`
- Mobile (`< md`): tabel diganti card list yang lebih mudah discroll.
- Tablet/Desktop (`md+`): tabel existing dipertahankan.
- Dialog edit/create harus tetap aman untuk attachment panel dan modal duplikasi.

### 3. Peta mobile
- File utama: `client/src/pages/map-page.tsx`
- Mobile: search, filter, dan legend dipindahkan ke drawer/bottom sheet.
- Desktop: panel existing dipertahankan.

### 4. Dashboard dan Master Data
- File utama: `client/src/pages/backoffice/dashboard.tsx`
- File utama: `client/src/pages/backoffice/master-data.tsx`
- Fokus pada spacing, hierarchy, dan rekening-only flow di mobile.

### 5. Global style
- File utama: `client/src/index.css`
- Tambah tuning shadow, spacing, dan transition untuk elemen mobile.

## File Target Aktual
| File | Fokus |
|---|---|
| `client/src/pages/backoffice/layout.tsx` | Shell mobile, compact header, bottom navigation |
| `client/src/pages/backoffice/wajib-pajak.tsx` | Card layout WP mobile |
| `client/src/pages/backoffice/objek-pajak.tsx` | Card layout OP mobile |
| `client/src/pages/backoffice/objek-pajak-form-dialog.tsx` | Dialog OP tetap usable di mobile |
| `client/src/pages/map-page.tsx` | Drawer/FAB search mobile |
| `client/src/pages/backoffice/dashboard.tsx` | Dashboard spacing mobile |
| `client/src/pages/backoffice/master-data.tsx` | Rekening-only mobile polish |
| `client/src/index.css` | Shadow, spacing, dan transition mobile |

## Acceptance Ringkas
- Bottom navigation tampil jelas di phone portrait.
- WP/OP list berubah menjadi card di mobile.
- Dialog form masih nyaman discroll di viewport rendah.
- Attachment panel tetap usable di mobile.
- Peta mobile punya drawer/FAB yang tidak mengganggu pan/zoom.

