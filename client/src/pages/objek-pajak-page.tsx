import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Building2, MapPin, Trash2, Search, Star, Navigation, DollarSign, Percent, Tag, Edit, X, Crosshair, Music } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ObjekPajak, WajibPajak } from "@shared/schema";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const opFormSchema = z.object({
  nopd: z.string().min(1, "NOPD wajib diisi"),
  wpId: z.coerce.number().nullable().optional(),
  jenisPajak: z.string().min(1, "Jenis Pajak wajib diisi"),
  namaObjek: z.string().min(1, "Nama Objek wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  omsetBulanan: z.string().nullable().optional(),
  tarifPersen: z.string().nullable().optional(),
  pajakBulanan: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  reviewCount: z.coerce.number().nullable().optional(),
  detailPajak: z.any().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

type OPFormValues = z.infer<typeof opFormSchema>;

function DetailFieldsPBJTMakanan({ form }: { form: any }) {
  const detail = form.watch("detailPajak") || {};
  const update = (key: string, value: any) => {
    form.setValue("detailPajak", { ...detail, [key]: value });
  };
  return (
    <div className="border-[2px] border-[#FF6B00] p-3 space-y-3 bg-orange-50">
      <div className="font-mono text-xs font-bold text-[#FF6B00] flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PBJT MAKANAN & MINUMAN
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS USAHA</label>
          <Select onValueChange={(v) => update("jenisUsaha", v)} value={detail.jenisUsaha || ""}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm h-9" data-testid="select-jenis-usaha">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="Rumah Makan">Rumah Makan</SelectItem>
              <SelectItem value="Restoran">Restoran</SelectItem>
              <SelectItem value="Warung">Warung</SelectItem>
              <SelectItem value="Cafe">Cafe</SelectItem>
              <SelectItem value="Katering">Katering</SelectItem>
              <SelectItem value="Kedai Kopi">Kedai Kopi</SelectItem>
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
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-kapasitas-tempat"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] font-bold text-black block mb-1">JAM OPERASI</label>
        <Input
          value={detail.jamOperasi || ""}
          onChange={(e) => update("jamOperasi", e.target.value)}
          placeholder="08:00 - 22:00"
          className="rounded-none border-[2px] border-black font-mono text-sm h-9"
          data-testid="input-jam-operasi"
        />
      </div>
    </div>
  );
}

function DetailFieldsPBJTHotel({ form }: { form: any }) {
  const detail = form.watch("detailPajak") || {};
  const update = (key: string, value: any) => {
    form.setValue("detailPajak", { ...detail, [key]: value });
  };
  return (
    <div className="border-[2px] border-blue-600 p-3 space-y-3 bg-blue-50">
      <div className="font-mono text-xs font-bold text-blue-600 flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PBJT JASA PERHOTELAN
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JUMLAH KAMAR</label>
          <Input
            type="number"
            value={detail.jumlahKamar || ""}
            onChange={(e) => update("jumlahKamar", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Jumlah kamar"
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-jumlah-kamar"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">KLASIFIKASI</label>
          <Select onValueChange={(v) => update("klasifikasi", v)} value={detail.klasifikasi || ""}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm h-9" data-testid="select-klasifikasi">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="Melati">Melati</SelectItem>
              <SelectItem value="Bintang 1">Bintang 1</SelectItem>
              <SelectItem value="Bintang 2">Bintang 2</SelectItem>
              <SelectItem value="Bintang 3">Bintang 3</SelectItem>
              <SelectItem value="Penginapan">Penginapan</SelectItem>
              <SelectItem value="Homestay">Homestay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] font-bold text-black block mb-1">FASILITAS TAMBAHAN</label>
        <Input
          value={detail.fasilitasTambahan || ""}
          onChange={(e) => update("fasilitasTambahan", e.target.value)}
          placeholder="Kolam renang, restoran, dll"
          className="rounded-none border-[2px] border-black font-mono text-sm h-9"
          data-testid="input-fasilitas"
        />
      </div>
    </div>
  );
}

function DetailFieldsPajakReklame({ form }: { form: any }) {
  const detail = form.watch("detailPajak") || {};
  const update = (key: string, value: any) => {
    form.setValue("detailPajak", { ...detail, [key]: value });
  };
  return (
    <div className="border-[2px] border-purple-600 p-3 space-y-3 bg-purple-50">
      <div className="font-mono text-xs font-bold text-purple-600 flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PAJAK REKLAME
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS REKLAME</label>
          <Select onValueChange={(v) => update("jenisReklame", v)} value={detail.jenisReklame || ""}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm h-9" data-testid="select-jenis-reklame">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
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
          <label className="font-mono text-[10px] font-bold text-black block mb-1">MASA BERLAKU</label>
          <Input
            value={detail.masaBerlaku || ""}
            onChange={(e) => update("masaBerlaku", e.target.value)}
            placeholder="1 tahun, 6 bulan"
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-masa-berlaku"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">UKURAN P x L (m)</label>
          <div className="flex gap-1">
            <Input
              type="number"
              value={detail.ukuranPanjang || ""}
              onChange={(e) => update("ukuranPanjang", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="P"
              className="rounded-none border-[2px] border-black font-mono text-sm h-9"
              data-testid="input-ukuran-panjang"
            />
            <Input
              type="number"
              value={detail.ukuranLebar || ""}
              onChange={(e) => update("ukuranLebar", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="L"
              className="rounded-none border-[2px] border-black font-mono text-sm h-9"
              data-testid="input-ukuran-lebar"
            />
          </div>
        </div>
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">LOKASI PENEMPATAN</label>
          <Input
            value={detail.lokasiPenempatan || ""}
            onChange={(e) => update("lokasiPenempatan", e.target.value)}
            placeholder="Tepi jalan, atap gedung"
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-lokasi-penempatan"
          />
        </div>
      </div>
    </div>
  );
}

function DetailFieldsPBJTParkir({ form }: { form: any }) {
  const detail = form.watch("detailPajak") || {};
  const update = (key: string, value: any) => {
    form.setValue("detailPajak", { ...detail, [key]: value });
  };
  return (
    <div className="border-[2px] border-green-600 p-3 space-y-3 bg-green-50">
      <div className="font-mono text-xs font-bold text-green-600 flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PBJT JASA PARKIR
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS LOKASI</label>
          <Select onValueChange={(v) => update("jenisLokasi", v)} value={detail.jenisLokasi || ""}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm h-9" data-testid="select-jenis-lokasi">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="Pasar">Pasar</SelectItem>
              <SelectItem value="Mall">Mall</SelectItem>
              <SelectItem value="Hotel">Hotel</SelectItem>
              <SelectItem value="Tempat Wisata">Tempat Wisata</SelectItem>
              <SelectItem value="Lahan Terbuka">Lahan Terbuka</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS KENDARAAN</label>
          <Input
            type="number"
            value={detail.kapasitasKendaraan || ""}
            onChange={(e) => update("kapasitasKendaraan", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Jumlah kendaraan"
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-kapasitas-kendaraan"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] font-bold text-black block mb-1">TARIF PARKIR</label>
        <Input
          value={detail.tarifParkir || ""}
          onChange={(e) => update("tarifParkir", e.target.value)}
          placeholder="Motor: 2000, Mobil: 5000"
          className="rounded-none border-[2px] border-black font-mono text-sm h-9"
          data-testid="input-tarif-parkir"
        />
      </div>
    </div>
  );
}

function DetailFieldsPBJTHiburan({ form }: { form: any }) {
  const detail = form.watch("detailPajak") || {};
  const update = (key: string, value: any) => {
    form.setValue("detailPajak", { ...detail, [key]: value });
  };
  return (
    <div className="border-[2px] border-pink-600 p-3 space-y-3 bg-pink-50">
      <div className="font-mono text-xs font-bold text-pink-600 flex items-center gap-1">
        <Music className="w-3 h-3" /> DETAIL PBJT KESENIAN & HIBURAN
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS HIBURAN</label>
          <Select onValueChange={(v) => update("jenisHiburan", v)} value={detail.jenisHiburan || ""}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm h-9" data-testid="select-jenis-hiburan">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="Bioskop">Bioskop</SelectItem>
              <SelectItem value="Karaoke">Karaoke</SelectItem>
              <SelectItem value="Biliar">Biliar</SelectItem>
              <SelectItem value="Pertunjukan">Pertunjukan</SelectItem>
              <SelectItem value="Taman Rekreasi">Taman Rekreasi</SelectItem>
              <SelectItem value="Permainan">Permainan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">KAPASITAS PENONTON</label>
          <Input
            type="number"
            value={detail.kapasitasPenonton || ""}
            onChange={(e) => update("kapasitasPenonton", e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Jumlah orang"
            className="rounded-none border-[2px] border-black font-mono text-sm h-9"
            data-testid="input-kapasitas-penonton"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] font-bold text-black block mb-1">FREKUENSI</label>
        <Input
          value={detail.frekuensi || ""}
          onChange={(e) => update("frekuensi", e.target.value)}
          placeholder="Harian, Mingguan, Bulanan"
          className="rounded-none border-[2px] border-black font-mono text-sm h-9"
          data-testid="input-frekuensi"
        />
      </div>
    </div>
  );
}

function DetailFieldsByJenis({ jenisPajak, form }: { jenisPajak: string; form: any }) {
  if (jenisPajak.includes("Makanan")) return <DetailFieldsPBJTMakanan form={form} />;
  if (jenisPajak.includes("Perhotelan")) return <DetailFieldsPBJTHotel form={form} />;
  if (jenisPajak.includes("Reklame")) return <DetailFieldsPajakReklame form={form} />;
  if (jenisPajak.includes("Parkir")) return <DetailFieldsPBJTParkir form={form} />;
  if (jenisPajak.includes("Hiburan") || jenisPajak.includes("Kesenian")) return <DetailFieldsPBJTHiburan form={form} />;
  return null;
}

function OPFormDialog({
  mode,
  editOp,
  wpList,
  isOpen,
  onOpenChange,
}: {
  mode: "create" | "edit";
  editOp?: ObjekPajak | null;
  wpList: WajibPajak[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [showMapPicker, setShowMapPicker] = useState(false);

  const form = useForm<OPFormValues>({
    resolver: zodResolver(opFormSchema),
    defaultValues: {
      nopd: "",
      wpId: null,
      jenisPajak: "",
      namaObjek: "",
      alamat: "",
      kelurahan: "",
      kecamatan: "",
      omsetBulanan: "",
      tarifPersen: "",
      pajakBulanan: "",
      rating: "",
      reviewCount: null,
      detailPajak: null,
      latitude: "",
      longitude: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (mode === "edit" && editOp) {
      form.reset({
        nopd: editOp.nopd,
        wpId: editOp.wpId,
        jenisPajak: editOp.jenisPajak,
        namaObjek: editOp.namaObjek,
        alamat: editOp.alamat,
        kelurahan: editOp.kelurahan || "",
        kecamatan: editOp.kecamatan || "",
        omsetBulanan: editOp.omsetBulanan || "",
        tarifPersen: editOp.tarifPersen || "",
        pajakBulanan: editOp.pajakBulanan || "",
        rating: editOp.rating || "",
        reviewCount: editOp.reviewCount,
        detailPajak: editOp.detailPajak || null,
        latitude: editOp.latitude || "",
        longitude: editOp.longitude || "",
        status: editOp.status,
      });
    } else if (mode === "create") {
      form.reset();
    }
  }, [mode, editOp, form]);

  const createMutation = useMutation({
    mutationFn: async (data: OPFormValues) => {
      const res = await apiRequest("POST", "/api/objek-pajak", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });
      onOpenChange(false);
      form.reset();
      toast({ title: "Berhasil", description: "Objek Pajak berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OPFormValues) => {
      const res = await apiRequest("PATCH", `/api/objek-pajak/${editOp!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });
      onOpenChange(false);
      toast({ title: "Berhasil", description: "Objek Pajak berhasil diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const jenisPajak = form.watch("jenisPajak");

  const handleSubmit = (data: OPFormValues) => {
    if (mode === "edit") {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 border-b-[3px] border-[#FFFF00] bg-black">
          <DialogTitle className="font-serif text-xl font-black text-[#FFFF00]">
            {mode === "edit" ? "EDIT OBJEK PAJAK" : "TAMBAH OBJEK PAJAK"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-4 space-y-4"
          >
            <FormField
              control={form.control}
              name="jenisPajak"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">JENIS PAJAK DAERAH</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("detailPajak", null); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-pajak-op">
                        <SelectValue placeholder="Pilih Jenis Pajak" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      {JENIS_PAJAK_OPTIONS.map((jp) => (
                        <SelectItem key={jp} value={jp}>{jp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {jenisPajak && <DetailFieldsByJenis jenisPajak={jenisPajak} form={form} />}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nopd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">NOPD</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nopd" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namaObjek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">NAMA OBJEK</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nama RM, Hotel, dll" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nama-objek" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="wpId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">WAJIB PAJAK</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-wp">
                        <SelectValue placeholder="Pilih Wajib Pajak (opsional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      {wpList.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id.toString()}>
                          {wp.nama} - {wp.npwpd}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alamat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">ALAMAT</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-alamat-op" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kelurahan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">KELURAHAN</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kelurahan-op" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kecamatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">KECAMATAN</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kecamatan-op" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="omsetBulanan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">OMSET/BLN (Rp)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-omset" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tarifPersen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">TARIF (%)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-tarif" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pajakBulanan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">PAJAK/BLN (Rp)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-pajak-bulanan" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-black">LOKASI KOORDINAT</span>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none border-[2px] border-black bg-[#FFFF00] text-black font-mono text-xs h-7 no-default-hover-elevate no-default-active-elevate"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  data-testid="button-toggle-map-picker"
                >
                  <Crosshair className="w-3 h-3 mr-1" />
                  {showMapPicker ? "SEMBUNYIKAN PETA" : "PILIH DI PETA"}
                </Button>
              </div>
              {showMapPicker && (
                <MapPickerEmbed
                  lat={form.getValues("latitude") || ""}
                  lng={form.getValues("longitude") || ""}
                  onSelect={(lat, lng) => {
                    form.setValue("latitude", lat.toFixed(7));
                    form.setValue("longitude", lng.toFixed(7));
                  }}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[10px] font-bold text-black">LATITUDE</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-latitude-op" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[10px] font-bold text-black">LONGITUDE</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-longitude-op" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">STATUS</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-status-op">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-none border-[3px] border-[#FFFF00] bg-black text-[#FFFF00] font-mono font-bold h-11 no-default-hover-elevate no-default-active-elevate"
              data-testid="button-submit-op"
            >
              {isPending ? "MENYIMPAN..." : mode === "edit" ? "PERBARUI OBJEK PAJAK" : "SIMPAN OBJEK PAJAK"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MapPickerEmbed({
  lat,
  lng,
  onSelect,
}: {
  lat: string;
  lng: string;
  onSelect: (lat: number, lng: number) => void;
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
  );
  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if ((node as any)._leafletMap) return;

    const initLat = lat ? parseFloat(lat) : -4.5250;
    const initLng = lng ? parseFloat(lng) : 104.0270;
    const map = L.map(node, {
      center: [initLat, initLng],
      zoom: lat ? 17 : 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
    }).addTo(map);

    let currentMarker: any = null;
    if (lat && lng) {
      currentMarker = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map);
    }

    map.on("click", (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (currentMarker) {
        currentMarker.setLatLng([clickLat, clickLng]);
      } else {
        currentMarker = L.marker([clickLat, clickLng]).addTo(map);
      }
      setMarker({ lat: clickLat, lng: clickLng });
      onSelect(clickLat, clickLng);
    });

    (node as any)._leafletMap = map;

    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[200px] border-[2px] border-black"
        data-testid="map-picker"
      />
      {marker && (
        <div className="font-mono text-[10px] text-gray-500 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Klik peta untuk menandai lokasi: {marker.lat.toFixed(7)}, {marker.lng.toFixed(7)}
        </div>
      )}
      {!marker && (
        <div className="font-mono text-[10px] text-gray-400 flex items-center gap-1">
          <Crosshair className="w-3 h-3" />
          Klik pada peta untuk menandai lokasi objek pajak
        </div>
      )}
    </div>
  );
}

export default function ObjekPajakPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOp, setEditOp] = useState<ObjekPajak | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: opList = [], isLoading } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const { data: wpList = [] } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objek-pajak/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });
      toast({ title: "Berhasil", description: "Objek Pajak berhasil dihapus" });
    },
  });

  const filtered = searchQuery
    ? opList.filter(
        (op) =>
          op.namaObjek.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op.nopd.includes(searchQuery) ||
          op.jenisPajak.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op.alamat.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : opList;

  const navigateToMap = (lat: string, lng: string) => {
    setLocation(`/?lat=${lat}&lng=${lng}&zoom=17`);
  };

  const jenisPajakColor = (jenis: string) => {
    if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
    if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
    if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
    if (jenis.includes("Parkir")) return "bg-green-600 text-white";
    return "bg-gray-600 text-white";
  };

  return (
    <div className="min-h-screen bg-white" data-testid="op-page">
      <header className="border-b-[4px] border-[#FFFF00] bg-black p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-none w-10 h-10 bg-[#FFFF00] border-[3px] border-[#FFFF00] text-black no-default-hover-elevate no-default-active-elevate"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-[#FFFF00] w-10 h-10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-black text-[#FFFF00] leading-none" data-testid="text-page-title">
                  OBJEK PAJAK DAERAH
                </h1>
                <p className="font-mono text-[10px] text-white/60 tracking-widest uppercase">
                  Data OP Pajak Daerah OKU Selatan
                </p>
              </div>
            </div>
          </div>
          <Button
            className="rounded-none border-[3px] border-[#FFFF00] bg-[#FFFF00] text-black font-mono font-bold no-default-hover-elevate no-default-active-elevate"
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-add-op"
          >
            <Plus className="w-4 h-4 mr-2" />
            TAMBAH OP
          </Button>
        </div>
      </header>

      <OPFormDialog
        mode="create"
        wpList={wpList}
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <OPFormDialog
        mode="edit"
        editOp={editOp}
        wpList={wpList}
        isOpen={!!editOp}
        onOpenChange={(open) => { if (!open) setEditOp(null); }}
      />

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama objek, NOPD, jenis pajak..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-op"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-black text-[#FFFF00] font-mono text-xs">
            {filtered.length} OP
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-op">
            <div className="bg-black border-[4px] border-[#FFFF00] p-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[#FFFF00] border-t-transparent animate-spin" />
              <span className="font-mono text-sm font-bold text-[#FFFF00]">MEMUAT DATA...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-[4px] border-dashed border-black" data-testid="empty-op">
            <div className="bg-black w-20 h-20 flex items-center justify-center border-[4px] border-[#FFFF00] mb-4">
              <Building2 className="w-10 h-10 text-[#FFFF00]" />
            </div>
            <p className="font-serif text-xl font-black text-black">BELUM ADA DATA</p>
            <p className="font-mono text-xs text-gray-500 mt-1">Klik tombol TAMBAH OP untuk memulai</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((op) => (
              <div
                key={op.id}
                className="border-[3px] border-black bg-white p-4 space-y-3 relative group cursor-pointer hover:border-[#FFFF00] hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                data-testid={`card-op-${op.id}`}
                onClick={() => {
                  if (op.latitude && op.longitude) {
                    navigateToMap(op.latitude, op.longitude);
                  }
                }}
              >
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-none bg-white border-[2px] border-black opacity-0 group-hover:opacity-100 transition-opacity no-default-hover-elevate no-default-active-elevate"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditOp(op);
                    }}
                    data-testid={`button-edit-op-${op.id}`}
                  >
                    <Edit className="w-3.5 h-3.5 text-black" />
                  </Button>
                  {op.latitude && op.longitude && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-none bg-[#FFFF00] border-[2px] border-black no-default-hover-elevate no-default-active-elevate"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToMap(op.latitude!, op.longitude!);
                      }}
                      data-testid={`button-locate-op-${op.id}`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-black" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-none opacity-0 group-hover:opacity-100 transition-opacity no-default-hover-elevate no-default-active-elevate"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(op.id);
                    }}
                    data-testid={`button-delete-op-${op.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-black w-10 h-10 flex items-center justify-center flex-shrink-0 border-[2px] border-[#FFFF00]">
                    <Building2 className="w-5 h-5 text-[#FFFF00]" />
                  </div>
                  <div className="min-w-0 pr-20">
                    <h3 className="font-serif font-black text-base text-black truncate" data-testid={`text-op-nama-${op.id}`}>
                      {op.namaObjek}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">{op.nopd}</p>
                  </div>
                </div>
                {op.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#FFFF00] border-[2px] border-black px-2 py-0.5">
                      <Star className="w-3 h-3 text-black fill-black" />
                      <span className="font-mono text-xs font-bold text-black">{Number(op.rating).toFixed(1)}</span>
                    </div>
                    {op.reviewCount && (
                      <span className="font-mono text-xs text-gray-500">({op.reviewCount} ulasan)</span>
                    )}
                  </div>
                )}
                <div className="font-mono text-xs text-gray-600 space-y-1">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-black" />
                    <span>{op.alamat}</span>
                  </div>
                  {op.omsetBulanan && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0 text-black" />
                      <span>Omset: Rp {Number(op.omsetBulanan).toLocaleString("id-ID")}/bln</span>
                    </div>
                  )}
                  {op.pajakBulanan && (
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 flex-shrink-0 text-black" />
                      <span className="font-bold">Pajak: Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}/bln</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${jenisPajakColor(op.jenisPajak)}`}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {op.jenisPajak}
                  </Badge>
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${
                      op.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {op.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
