# Mobile Backoffice Smoke Checklist

## Target Viewport
- `390x844` phone portrait
- `768x1024` tablet portrait
- `1024x768` tablet landscape

## Login
- [ ] Halaman login usable tanpa overflow horizontal
- [ ] Input username/password tetap terbaca penuh
- [ ] Tombol login mudah dijangkau di phone portrait

## Shell dan Navigasi
- [ ] Sidebar desktop tersembunyi di mobile
- [ ] Bottom navigation muncul di mobile
- [ ] Header mobile ringkas tetap menunjukkan konteks halaman aktif
- [ ] Konten utama tidak tertutup bottom navigation

## Wajib Pajak
- [ ] List tampil sebagai card pada viewport phone
- [ ] Search dan filter tetap usable
- [ ] Tombol tambah tampil jelas di mobile
- [ ] Dialog create/edit bisa discroll penuh
- [ ] Modal duplikasi tetap usable di phone
- [ ] Panel attachment WP bisa dibuka dan dioperasikan

## Objek Pajak
- [ ] List tampil sebagai card pada viewport phone
- [ ] Search, filter, dan pagination tetap usable
- [ ] Dialog create/edit aman pada tinggi viewport mobile
- [ ] Detail pajak tidak overflow horizontal
- [ ] Panel attachment OP tetap usable di mobile

## Peta
- [ ] Search/filter mobile bisa dibuka dari drawer atau trigger mobile
- [ ] Legend tetap terbaca di mobile
- [ ] Peta tetap bisa pan dan zoom tanpa elemen UI saling menutupi
- [ ] Drawer mobile tidak memicu spam request viewport

## Dashboard dan Master Data
- [ ] Card dashboard tetap rapi di phone portrait
- [ ] Halaman Master Data rekening-only tetap usable di mobile
- [ ] Form rekening tidak overflow horizontal

## Final Check
- [ ] Tidak ada text yang terpotong di phone portrait
- [ ] Tidak ada tombol utama yang tertutup keyboard/bottom nav
- [ ] Transisi drawer/nav/card terasa halus tanpa lag mencolok
