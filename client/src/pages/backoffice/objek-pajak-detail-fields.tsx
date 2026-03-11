import type { UseFormReturn } from "react-hook-form";
import { Building2, DollarSign, Music, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 formatMoneyInput,
 getDetailRecord,
 HIBURAN_LAINNYA_VALUE,
 HOTEL_FACILITY_OPTIONS,
 isKnownJenisHiburan,
 isRestoranJenisUsaha,
 OPDetailValue,
 OPFormValues,
 PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS,
 PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS,
 PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS,
 PBJT_PARKIR_JENIS_LOKASI_OPTIONS,
 PBJT_PARKIR_JENIS_USAHA_OPTIONS,
 PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS,
 PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS,
 PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS,
 requiresHotelKlasifikasi,
 setDetailArrayValue,
 setDetailValue,
 setMoneyDetailValue,
 toKnownSelectValue,
} from "./objek-pajak-shared";
function DetailFieldsPBJTMakanan({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const isRestoran = isRestoranJenisUsaha(detail.jenisUsaha);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-[#FF6B00] p-3 space-y-3 bg-orange-50">
 <div className="font-mono text-xs font-bold text-primary flex items-center gap-1">
 <Tag className="w-3 h-3" /> DETAIL PBJT MAKANAN & MINUMAN
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS USAHA</label>
 <Select
 onValueChange={(v) => {
 update("jenisUsaha", v);
 if (v !== "Restoran") {
 update("klasifikasi", null);
 }
 }}
 value={toKnownSelectValue(PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS, detail.jenisUsaha)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-usaha">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS TEMPAT</label>
 <Input
 type="number"
 value={detail.kapasitasTempat || ""}
 onChange={(e) => update("kapasitasTempat", e.target.value ? parseInt(e.target.value) : null)}
 placeholder="Jumlah kursi"
 className="font-mono text-sm"
 data-testid="input-kapasitas-tempat"
 />
 </div>
 </div>
 {isRestoran ? (
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KLASIFIKASI</label>
 <Select
 onValueChange={(v) => update("klasifikasi", v)}
 value={toKnownSelectValue(PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS, detail.klasifikasi)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-klasifikasi-makanan">
 <SelectValue placeholder="Pilih klasifikasi restoran" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 ) : null}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JUMLAH KARYAWAN</label>
 <Input
 type="number"
 value={detail.jumlahKaryawan || ""}
 onChange={(e) => update("jumlahKaryawan", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-jumlah-karyawan-makanan"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">RATA-RATA PENGUNJUNG</label>
 <Input
 type="number"
 value={detail.rata2Pengunjung || ""}
 onChange={(e) => update("rata2Pengunjung", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-rata2-pengunjung-makanan"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JAM BUKA</label>
 <Input
 type="time"
 value={String(detail.jamBuka ?? "")}
 onChange={(e) => update("jamBuka", e.target.value || null)}
 className="font-mono text-sm"
 data-testid="input-jam-buka"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JAM TUTUP</label>
 <Input
 type="time"
 value={String(detail.jamTutup ?? "")}
 onChange={(e) => update("jamTutup", e.target.value || null)}
 className="font-mono text-sm"
 data-testid="input-jam-tutup"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">HARGA TERMURAH</label>
 <Input
 inputMode="numeric"
 value={formatMoneyInput(detail.hargaTermurah)}
 onChange={(e) => setMoneyDetailValue(form, detail, "hargaTermurah", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-harga-termurah-makanan"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">HARGA TERMAHAL</label>
 <Input
 inputMode="numeric"
 value={formatMoneyInput(detail.hargaTermahal)}
 onChange={(e) => setMoneyDetailValue(form, detail, "hargaTermahal", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-harga-termahal-makanan"
 />
 </div>
 </div>
 </div>
 );
}

function DetailFieldsPBJTHotel({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const showKlasifikasi = requiresHotelKlasifikasi(detail.jenisUsaha);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-blue-600 p-3 space-y-3 bg-blue-50">
 <div className="font-mono text-xs font-bold text-blue-600 flex items-center gap-1">
 <Tag className="w-3 h-3" /> DETAIL PBJT JASA PERHOTELAN
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS USAHA</label>
 <Select
 onValueChange={(v) => {
 update("jenisUsaha", v);
 if (!requiresHotelKlasifikasi(v)) {
 update("klasifikasi", null);
 }
 }}
 value={toKnownSelectValue(PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS, detail.jenisUsaha)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-usaha-hotel">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JUMLAH KAMAR</label>
 <Input
 type="number"
 value={detail.jumlahKamar || ""}
 onChange={(e) => update("jumlahKamar", e.target.value ? parseInt(e.target.value, 10) : null)}
 placeholder="Jumlah kamar"
 className="font-mono text-sm"
 data-testid="input-jumlah-kamar"
 />
 </div>
 {showKlasifikasi ? (
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KLASIFIKASI</label>
 <Select
 onValueChange={(v) => update("klasifikasi", v)}
 value={toKnownSelectValue(PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS, detail.klasifikasi)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-klasifikasi">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 ) : null}
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">RATA-RATA PENGUNJUNG/HARI</label>
 <Input
 type="number"
 value={detail.rata2PengunjungHarian || ""}
 onChange={(e) => update("rata2PengunjungHarian", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-rata2-pengunjung-harian-hotel"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">HARGA TERMURAH</label>
 <Input
 inputMode="numeric"
 value={formatMoneyInput(detail.hargaTermurah)}
 onChange={(e) => setMoneyDetailValue(form, detail, "hargaTermurah", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-harga-termurah-hotel"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">HARGA TERMAHAL</label>
 <Input
 inputMode="numeric"
 value={formatMoneyInput(detail.hargaTermahal)}
 onChange={(e) => setMoneyDetailValue(form, detail, "hargaTermahal", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-harga-termahal-hotel"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="font-mono text-[10px] font-bold text-black block">FASILITAS</label>
 <div className="grid grid-cols-2 gap-2 bg-white p-2">
 {HOTEL_FACILITY_OPTIONS.map((option) => {
 const selected = Array.isArray(detail.fasilitas) ? detail.fasilitas.includes(option) : false;
 return (
 <label key={option} className="flex items-center gap-2 font-mono text-[11px] text-black">
 <Checkbox
 checked={selected}
 onCheckedChange={(checked) => setDetailArrayValue(form, detail, "fasilitas", option, checked === true)}
 data-testid={`checkbox-fasilitas-${option.toLowerCase().replace(/\s+/g, "-")}`}
 />
 <span>{option}</span>
 </label>
 );
 })}
 </div>
 </div>
 </div>
 );
}

function DetailFieldsPajakReklame({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-purple-600 p-3 space-y-3 bg-purple-50">
 <div className="font-mono text-xs font-bold text-purple-600 flex items-center gap-1">
 <Tag className="w-3 h-3" /> DETAIL PAJAK REKLAME
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS REKLAME</label>
 <Select onValueChange={(v) => update("jenisReklame", v)} value={String(detail.jenisReklame ?? "")}>
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-reklame">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="Billboard">Billboard</SelectItem>
 <SelectItem value="Neon Box">Neon Box</SelectItem>
 <SelectItem value="Spanduk">Spanduk</SelectItem>
 <SelectItem value="Baliho">Baliho</SelectItem>
 <SelectItem value="Videotron">Videotron</SelectItem>
 <SelectItem value="Papan Nama">Papan Nama</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JUDUL REKLAME</label>
 <Input
 value={String(detail.judulReklame ?? "")}
 onChange={(e) => update("judulReklame", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-judul-reklame"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">MASA BERLAKU</label>
 <Input
 value={detail.masaBerlaku || ""}
 onChange={(e) => update("masaBerlaku", e.target.value)}
 placeholder="1 tahun, 6 bulan"
 className="font-mono text-sm"
 data-testid="input-masa-berlaku"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">STATUS REKLAME</label>
 <Select onValueChange={(v) => update("statusReklame", v)} value={String(detail.statusReklame ?? "baru")}>
 <SelectTrigger className="font-mono text-sm" data-testid="select-status-reklame">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="baru">Baru</SelectItem>
 <SelectItem value="perpanjangan">Perpanjangan</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">PANJANG (m)</label>
 <Input
 type="number"
 value={detail.ukuranPanjang || ""}
 onChange={(e) => update("ukuranPanjang", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-ukuran-panjang"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">LEBAR (m)</label>
 <Input
 type="number"
 value={detail.ukuranLebar || ""}
 onChange={(e) => update("ukuranLebar", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-ukuran-lebar"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">TINGGI (m)</label>
 <Input
 type="number"
 value={detail.ukuranTinggi || ""}
 onChange={(e) => update("ukuranTinggi", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-ukuran-tinggi"
 />
 </div>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">NAMA BIRO JASA</label>
 <Input
 value={String(detail.namaBiroJasa ?? "")}
 onChange={(e) => update("namaBiroJasa", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-nama-biro-jasa"
 />
 </div>
 </div>
 );
}

function DetailFieldsPBJTParkir({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-green-600 p-3 space-y-3 bg-green-50">
 <div className="font-mono text-xs font-bold text-green-600 flex items-center gap-1">
 <Tag className="w-3 h-3" /> DETAIL PBJT JASA PARKIR
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS USAHA</label>
 <Select
 onValueChange={(v) => update("jenisUsaha", v)}
 value={toKnownSelectValue(PBJT_PARKIR_JENIS_USAHA_OPTIONS, detail.jenisUsaha)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-usaha-parkir">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_PARKIR_JENIS_USAHA_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS LOKASI</label>
 <Select
 onValueChange={(v) => update("jenisLokasi", v)}
 value={toKnownSelectValue(PBJT_PARKIR_JENIS_LOKASI_OPTIONS, detail.jenisLokasi)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-lokasi">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_PARKIR_JENIS_LOKASI_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS KENDARAAN</label>
 <Input
 type="number"
 value={detail.kapasitasKendaraan || ""}
 onChange={(e) => update("kapasitasKendaraan", e.target.value ? parseInt(e.target.value) : null)}
 placeholder="Jumlah kendaraan"
 className="font-mono text-sm"
 data-testid="input-kapasitas-kendaraan"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">TARIF PARKIR</label>
 <Input
 inputMode="numeric"
 value={formatMoneyInput(detail.tarifParkir)}
 onChange={(e) => setMoneyDetailValue(form, detail, "tarifParkir", e.target.value)}
 placeholder="Motor: 2000, Mobil: 5000"
 className="font-mono text-sm"
 data-testid="input-tarif-parkir"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">RATA-RATA PENGUNJUNG</label>
 <Input
 type="number"
 value={detail.rata2Pengunjung || ""}
 onChange={(e) => update("rata2Pengunjung", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-rata2-pengunjung-parkir"
 />
 </div>
 </div>
 </div>
 );
}

function DetailFieldsPBJTHiburan({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const isCustomJenisHiburan =
 typeof detail.jenisHiburan === "string" &&
 detail.jenisHiburan.length > 0 &&
 !isKnownJenisHiburan(detail.jenisHiburan);
 const selectedJenisHiburan = isCustomJenisHiburan
 ? HIBURAN_LAINNYA_VALUE
 : String(detail.jenisHiburan ?? "");
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-pink-600 p-3 space-y-3 bg-pink-50">
 <div className="font-mono text-xs font-bold text-pink-600 flex items-center gap-1">
 <Music className="w-3 h-3" /> DETAIL PBJT KESENIAN & HIBURAN
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS HIBURAN</label>
 <Select
 onValueChange={(v) => {
 update("jenisHiburan", v);
 if (v !== HIBURAN_LAINNYA_VALUE) {
 update("jenisHiburanLainnya", null);
 } else if (isCustomJenisHiburan) {
 update("jenisHiburanLainnya", String(detail.jenisHiburan));
 }
 }}
 value={selectedJenisHiburan}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-hiburan">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS</label>
 <Input
 type="number"
 value={detail.kapasitas || ""}
 onChange={(e) => update("kapasitas", e.target.value ? parseInt(e.target.value, 10) : null)}
 placeholder="Jumlah orang"
 className="font-mono text-sm"
 data-testid="input-kapasitas-hiburan"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JAM OPERASIONAL</label>
 <Input
 value={String(detail.jamOperasional ?? "")}
 onChange={(e) => update("jamOperasional", e.target.value)}
 placeholder="08:00 - 23:00"
 className="font-mono text-sm"
 data-testid="input-jam-operasional-hiburan"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JUMLAH KARYAWAN</label>
 <Input
 type="number"
 value={detail.jumlahKaryawan || ""}
 onChange={(e) => update("jumlahKaryawan", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-jumlah-karyawan-hiburan"
 />
 </div>
 </div>
 {selectedJenisHiburan === HIBURAN_LAINNYA_VALUE ? (
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS HIBURAN LAINNYA</label>
 <Input
 value={String(detail.jenisHiburanLainnya ?? (isCustomJenisHiburan ? detail.jenisHiburan : ""))}
 onChange={(e) => update("jenisHiburanLainnya", e.target.value)}
 placeholder="Isi jenis hiburan lainnya"
 className="font-mono text-sm"
 data-testid="input-jenis-hiburan-lainnya"
 />
 </div>
 ) : null}
 </div>
 );
}

function DetailFieldsPBJTTenagaListrik({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-yellow-600 p-3 space-y-3 bg-yellow-50">
 <div className="font-mono text-xs font-bold text-yellow-700 flex items-center gap-1">
 <DollarSign className="w-3 h-3" /> DETAIL PBJT TENAGA LISTRIK
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS TENAGA LISTRIK</label>
 <Select
 onValueChange={(v) => update("jenisTenagaListrik", v)}
 value={toKnownSelectValue(PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS, detail.jenisTenagaListrik)}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-tenaga-listrik">
 <SelectValue placeholder="Pilih" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS.map((option) => (
 <SelectItem key={option} value={option}>{option}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">DAYA LISTRIK</label>
 <Input
 type="number"
 value={detail.dayaListrik || ""}
 onChange={(e) => update("dayaListrik", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-daya-listrik"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS</label>
 <Input
 type="number"
 value={detail.kapasitas || ""}
 onChange={(e) => update("kapasitas", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-kapasitas-listrik"
 />
 </div>
 </div>
 </div>
 );
}

function DetailFieldsPajakAirTanah({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-cyan-700 p-3 space-y-3 bg-cyan-50">
 <div className="font-mono text-xs font-bold text-cyan-800 flex items-center gap-1">
 <Building2 className="w-3 h-3" /> DETAIL PAJAK AIR TANAH
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS AIR TANAH</label>
 <Input
 value={String(detail.jenisAirTanah ?? "")}
 onChange={(e) => update("jenisAirTanah", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-jenis-air-tanah"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">RATA-RATA UKURAN PEMAKAIAN</label>
 <Input
 type="number"
 value={detail.rata2UkuranPemakaian || ""}
 onChange={(e) => update("rata2UkuranPemakaian", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-rata2-ukuran-pemakaian"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KRITERIA AIR TANAH</label>
 <Input
 value={String(detail.kriteriaAirTanah ?? "")}
 onChange={(e) => update("kriteriaAirTanah", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-kriteria-air-tanah"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">KELOMPOK USAHA</label>
 <Input
 value={String(detail.kelompokUsaha ?? "")}
 onChange={(e) => update("kelompokUsaha", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-kelompok-usaha"
 />
 </div>
 </div>
 </div>
 );
}

function DetailFieldsPajakWalet({ form }: { form: UseFormReturn<OPFormValues> }) {
 const detail = getDetailRecord(form);
 const update = (key: string, value: OPDetailValue) => {
 setDetailValue(form, detail, key, value);
 };
 return (
 <div className="border border-amber-800 p-3 space-y-3 bg-amber-50">
 <div className="font-mono text-xs font-bold text-amber-900 flex items-center gap-1">
 <Tag className="w-3 h-3" /> DETAIL PAJAK SARANG BURUNG WALET
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS BURUNG WALET</label>
 <Input
 value={String(detail.jenisBurungWalet ?? "")}
 onChange={(e) => update("jenisBurungWalet", e.target.value)}
 className="font-mono text-sm"
 data-testid="input-jenis-burung-walet"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">PANEN PER TAHUN</label>
 <Input
 type="number"
 value={detail.panenPerTahun || ""}
 onChange={(e) => update("panenPerTahun", e.target.value ? parseInt(e.target.value, 10) : null)}
 className="font-mono text-sm"
 data-testid="input-panen-per-tahun"
 />
 </div>
 <div>
 <label className="font-mono text-[10px] font-bold text-black block mb-1">RATA-RATA BERAT PANEN</label>
 <Input
 type="number"
 value={detail.rata2BeratPanen || ""}
 onChange={(e) => update("rata2BeratPanen", e.target.value ? parseFloat(e.target.value) : null)}
 className="font-mono text-sm"
 data-testid="input-rata2-berat-panen"
 />
 </div>
 </div>
 </div>
 );
}

function DetailFieldsByJenis({ jenisPajak, form }: { jenisPajak: string; form: UseFormReturn<OPFormValues> }) {
 if (jenisPajak.includes("Makanan")) return <DetailFieldsPBJTMakanan form={form} />;
 if (jenisPajak.includes("Perhotelan")) return <DetailFieldsPBJTHotel form={form} />;
 if (jenisPajak.includes("Reklame")) return <DetailFieldsPajakReklame form={form} />;
 if (jenisPajak.includes("Parkir")) return <DetailFieldsPBJTParkir form={form} />;
 if (jenisPajak.includes("Hiburan") || jenisPajak.includes("Kesenian")) return <DetailFieldsPBJTHiburan form={form} />;
 if (jenisPajak.includes("Tenaga Listrik")) return <DetailFieldsPBJTTenagaListrik form={form} />;
 if (jenisPajak.includes("Air Tanah")) return <DetailFieldsPajakAirTanah form={form} />;
 if (jenisPajak.includes("Walet")) return <DetailFieldsPajakWalet form={form} />;
 return null;
}

export { DetailFieldsByJenis };

