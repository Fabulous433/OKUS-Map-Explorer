import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Building2, MapPin, Trash2, Search, Edit, Crosshair, Tag, Music, DollarSign, Percent, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ObjekPajak, WajibPajakWithBadanUsaha } from "@shared/schema";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";
import BackofficeLayout from "./layout";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const opFormSchema = z.object({
  nopd: z.string().trim().min(1, "NOPD wajib diisi"),
  wpId: z.coerce.number().nullable().optional(),
  jenisPajak: z.string().min(1, "Jenis Pajak wajib diisi"),
  namaObjek: z.string().trim().min(1, "Nama Objek wajib diisi"),
  alamat: z.string().trim().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  omsetBulanan: z.string().nullable().optional(),
  tarifPersen: z.string().nullable().optional(),
  pajakBulanan: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  reviewCount: z.coerce.number().nullable().optional(),
  detailPajak: z.record(z.union([z.string(), z.number(), z.null()])).nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

type OPFormValues = z.infer<typeof opFormSchema>;
type OPDetailValue = string | number | null;
type OPDetailRecord = Record<string, OPDetailValue>;

function getDetailRecord(form: UseFormReturn<OPFormValues>): OPDetailRecord {
  const detail = form.watch("detailPajak");
  if (!detail || typeof detail !== "object") {
    return {};
  }

  return detail as OPDetailRecord;
}

function setDetailValue(
  form: UseFormReturn<OPFormValues>,
  detail: OPDetailRecord,
  key: string,
  value: OPDetailValue,
) {
  form.setValue("detailPajak", { ...detail, [key]: value });
}

function normalizeOptional(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOpPayload(data: OPFormValues): OPFormValues {
  return {
    ...data,
    nopd: data.nopd.trim(),
    namaObjek: data.namaObjek.trim(),
    alamat: data.alamat.trim(),
    kelurahan: normalizeOptional(data.kelurahan),
    kecamatan: normalizeOptional(data.kecamatan),
    omsetBulanan: normalizeOptional(data.omsetBulanan),
    tarifPersen: normalizeOptional(data.tarifPersen),
    pajakBulanan: normalizeOptional(data.pajakBulanan),
    rating: normalizeOptional(data.rating),
    latitude: normalizeOptional(data.latitude),
    longitude: normalizeOptional(data.longitude),
  };
}

function invalidateObjekPajakQueries() {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [first] = query.queryKey;
      return typeof first === "string" && first.startsWith("/api/objek-pajak");
    },
  });
}

function jenisPajakColor(jenis: string) {
  if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
  if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
  if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
  if (jenis.includes("Parkir")) return "bg-green-600 text-white";
  if (jenis.includes("Hiburan") || jenis.includes("Kesenian")) return "bg-pink-600 text-white";
  return "bg-gray-600 text-white";
}

function DetailFieldsPBJTMakanan({ form }: { form: UseFormReturn<OPFormValues> }) {
  const detail = getDetailRecord(form);
  const update = (key: string, value: OPDetailValue) => {
    setDetailValue(form, detail, key, value);
  };
  return (
    <div className="border-[2px] border-[#FF6B00] p-3 space-y-3 bg-orange-50">
      <div className="font-mono text-xs font-bold text-[#FF6B00] flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PBJT MAKANAN & MINUMAN
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS USAHA</label>
          <Select onValueChange={(v) => update("jenisUsaha", v)} value={String(detail.jenisUsaha ?? "")}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-usaha">
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
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
          className="rounded-none border-[2px] border-black font-mono text-sm"
          data-testid="input-jam-operasi"
        />
      </div>
    </div>
  );
}

function DetailFieldsPBJTHotel({ form }: { form: UseFormReturn<OPFormValues> }) {
  const detail = getDetailRecord(form);
  const update = (key: string, value: OPDetailValue) => {
    setDetailValue(form, detail, key, value);
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
            data-testid="input-jumlah-kamar"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">KLASIFIKASI</label>
          <Select onValueChange={(v) => update("klasifikasi", v)} value={String(detail.klasifikasi ?? "")}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-klasifikasi">
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
          className="rounded-none border-[2px] border-black font-mono text-sm"
          data-testid="input-fasilitas"
        />
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
    <div className="border-[2px] border-purple-600 p-3 space-y-3 bg-purple-50">
      <div className="font-mono text-xs font-bold text-purple-600 flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PAJAK REKLAME
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS REKLAME</label>
          <Select onValueChange={(v) => update("jenisReklame", v)} value={String(detail.jenisReklame ?? "")}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-reklame">
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
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
              className="rounded-none border-[2px] border-black font-mono text-sm"
              data-testid="input-ukuran-panjang"
            />
            <Input
              type="number"
              value={detail.ukuranLebar || ""}
              onChange={(e) => update("ukuranLebar", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="L"
              className="rounded-none border-[2px] border-black font-mono text-sm"
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
            data-testid="input-lokasi-penempatan"
          />
        </div>
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
    <div className="border-[2px] border-green-600 p-3 space-y-3 bg-green-50">
      <div className="font-mono text-xs font-bold text-green-600 flex items-center gap-1">
        <Tag className="w-3 h-3" /> DETAIL PBJT JASA PARKIR
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS LOKASI</label>
          <Select onValueChange={(v) => update("jenisLokasi", v)} value={String(detail.jenisLokasi ?? "")}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-lokasi">
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
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
          className="rounded-none border-[2px] border-black font-mono text-sm"
          data-testid="input-tarif-parkir"
        />
      </div>
    </div>
  );
}

function DetailFieldsPBJTHiburan({ form }: { form: UseFormReturn<OPFormValues> }) {
  const detail = getDetailRecord(form);
  const update = (key: string, value: OPDetailValue) => {
    setDetailValue(form, detail, key, value);
  };
  return (
    <div className="border-[2px] border-pink-600 p-3 space-y-3 bg-pink-50">
      <div className="font-mono text-xs font-bold text-pink-600 flex items-center gap-1">
        <Music className="w-3 h-3" /> DETAIL PBJT KESENIAN & HIBURAN
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[10px] font-bold text-black block mb-1">JENIS HIBURAN</label>
          <Select onValueChange={(v) => update("jenisHiburan", v)} value={String(detail.jenisHiburan ?? "")}>
            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-hiburan">
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
            className="rounded-none border-[2px] border-black font-mono text-sm"
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
          className="rounded-none border-[2px] border-black font-mono text-sm"
          data-testid="input-frekuensi"
        />
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
  return null;
}

const PICKER_LAYERS = {
  osm: {
    name: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OSM",
    maxZoom: 19,
  },
  google: {
    name: "Google",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: "&copy; Google",
    maxZoom: 20,
  },
  esri: {
    name: "ESRI",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    maxZoom: 18,
  },
};

type PickerLayerKey = keyof typeof PICKER_LAYERS;

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
  const [activeLayer, setActiveLayer] = useState<PickerLayerKey>("osm");
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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

    const layer = L.tileLayer(PICKER_LAYERS.osm.url, {
      attribution: PICKER_LAYERS.osm.attribution,
      maxZoom: PICKER_LAYERS.osm.maxZoom,
    }).addTo(map);

    tileLayerRef.current = layer;
    mapInstanceRef.current = map;

    let currentMarker: L.Marker | null = null;
    if (lat && lng) {
      currentMarker = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
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

  const switchLayer = (key: PickerLayerKey) => {
    setActiveLayer(key);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = PICKER_LAYERS[key];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(Object.keys(PICKER_LAYERS) as PickerLayerKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-black transition-colors ${
              activeLayer === key
                ? "bg-black text-[#FFFF00]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
            onClick={() => switchLayer(key)}
            data-testid={`picker-layer-${key}`}
          >
            {PICKER_LAYERS[key].name}
          </button>
        ))}
      </div>
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

function OPFormDialog({
  mode,
  editOp,
  wpList,
  isOpen,
  onOpenChange,
}: {
  mode: "create" | "edit";
  editOp?: ObjekPajak | null;
  wpList: WajibPajakWithBadanUsaha[];
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
      const res = await apiRequest("POST", "/api/objek-pajak", normalizeOpPayload(data));
      return res.json();
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
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
      const res = await apiRequest("PATCH", `/api/objek-pajak/${editOp!.id}`, normalizeOpPayload(data));
      return res.json();
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
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
                          {wp.displayName} - {wp.npwpd || "-"}
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
                  className="rounded-none border-[2px] border-black bg-[#FFFF00] text-black font-mono text-xs no-default-hover-elevate no-default-active-elevate"
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

export default function BackofficeObjekPajak() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOp, setEditOp] = useState<ObjekPajak | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseParams = new URLSearchParams();
  if (statusFilter !== "all") {
    baseParams.set("status", statusFilter);
  }
  if (kecamatanFilter.trim()) {
    baseParams.set("kecamatan", kecamatanFilter.trim());
  }

  const baseQueryKey = baseParams.toString()
    ? `/api/objek-pajak?${baseParams.toString()}`
    : "/api/objek-pajak";

  const listParams = new URLSearchParams(baseParams);
  if (activeTab !== "all") {
    listParams.set("jenisPajak", activeTab);
  }

  const objekPajakQueryKey = listParams.toString()
    ? `/api/objek-pajak?${listParams.toString()}`
    : "/api/objek-pajak";

  const { data: opList = [], isLoading } = useQuery<ObjekPajak[]>({
    queryKey: [objekPajakQueryKey],
  });

  const { data: countBaseList = [] } = useQuery<ObjekPajak[]>({
    queryKey: [baseQueryKey],
  });

  const { data: wpList = [] } = useQuery<WajibPajakWithBadanUsaha[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const { toast } = useToast();

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/objek-pajak/import", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
      } else {
        toast({
          title: "Import Selesai",
          description: `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data`,
        });
        if (result.errors?.length > 0) {
          console.log("Import errors:", result.errors);
        }
        invalidateObjekPajakQueries();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objek-pajak/${id}`);
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
      toast({ title: "Berhasil", description: "Objek Pajak berhasil dihapus" });
    },
  });

  const wpMap = new Map(wpList.map((wp) => [wp.id, wp]));

  const filtered = opList.filter((op) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      op.namaObjek.toLowerCase().includes(q) ||
      op.nopd.toLowerCase().includes(q) ||
      op.jenisPajak.toLowerCase().includes(q) ||
      op.alamat.toLowerCase().includes(q) ||
      (op.kecamatan && op.kecamatan.toLowerCase().includes(q));
    return matchesSearch;
  });

  const jenisCounts = JENIS_PAJAK_OPTIONS.reduce((acc, jp) => {
    acc[jp] = countBaseList.filter((op) => op.jenisPajak === jp).length;
    return acc;
  }, {} as Record<string, number>);

  const shortLabel = (jenis: string) => {
    if (jenis.includes("Makanan")) return "MKN";
    if (jenis.includes("Perhotelan")) return "HTL";
    if (jenis.includes("Parkir")) return "PKR";
    if (jenis.includes("Kesenian") || jenis.includes("Hiburan")) return "HBR";
    if (jenis.includes("Listrik")) return "LST";
    if (jenis.includes("Reklame")) return "RKL";
    if (jenis.includes("Air")) return "AIR";
    if (jenis.includes("Walet")) return "WLT";
    if (jenis.includes("MBLB")) return "MBLB";
    return jenis.substring(0, 3).toUpperCase();
  };
  return (
    <BackofficeLayout>
      <div className="p-6" data-testid="backoffice-op-page">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
          data-testid="input-import-op-file"
        />
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-black w-10 h-10 flex items-center justify-center border-[2px] border-[#FFFF00]">
              <Building2 className="w-5 h-5 text-[#FFFF00]" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black text-black leading-none" data-testid="text-page-title">
                OBJEK PAJAK
              </h1>
              <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
                Kelola Data Objek Pajak Daerah
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => window.open("/api/objek-pajak/export", "_blank")}
              data-testid="button-export-op"
            >
              <Download className="w-4 h-4 mr-1" />
              EXPORT CSV
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-op"
            >
              <Upload className="w-4 h-4 mr-1" />
              IMPORT CSV
            </Button>
            <Button
              className="rounded-none border-[3px] border-[#FFFF00] bg-black text-[#FFFF00] font-mono font-bold no-default-hover-elevate no-default-active-elevate"
              onClick={() => setIsCreateOpen(true)}
              data-testid="button-add-op"
            >
              <Plus className="w-4 h-4 mr-2" />
              TAMBAH OP
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama objek, NOPD, jenis pajak, alamat..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-op"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-black text-[#FFFF00] font-mono text-xs no-default-hover-elevate no-default-active-elevate">
            {filtered.length} OP
          </Badge>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] rounded-none border-[2px] border-black font-mono text-xs" data-testid="select-filter-status-op">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={kecamatanFilter}
            onChange={(e) => setKecamatanFilter(e.target.value)}
            placeholder="Filter kecamatan"
            className="w-[220px] rounded-none border-[2px] border-black font-mono text-xs"
            data-testid="input-filter-kecamatan-op"
          />
          {(statusFilter !== "all" || kecamatanFilter.trim().length > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-[2px] border-black font-mono text-xs"
              onClick={() => {
                setStatusFilter("all");
                setKecamatanFilter("");
              }}
              data-testid="button-reset-filter-op"
            >
              RESET FILTER
            </Button>
          )}
        </div>
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1 flex-wrap">
          <button
            className={`font-mono text-[10px] font-bold px-3 py-1.5 border-[2px] border-black transition-colors whitespace-nowrap ${
              activeTab === "all"
                ? "bg-black text-[#FFFF00]"
                : "bg-white text-black"
            }`}
            onClick={() => setActiveTab("all")}
            data-testid="tab-all"
          >
            SEMUA ({countBaseList.length})
          </button>
          {JENIS_PAJAK_OPTIONS.map((jp) => (
            <button
              key={jp}
              className={`font-mono text-[10px] font-bold px-3 py-1.5 border-[2px] border-black transition-colors whitespace-nowrap ${
                activeTab === jp
                  ? "bg-black text-[#FFFF00]"
                  : "bg-white text-black"
              }`}
              onClick={() => setActiveTab(jp)}
              data-testid={`tab-${shortLabel(jp).toLowerCase()}`}
            >
              {shortLabel(jp)} ({jenisCounts[jp] || 0})
            </button>
          ))}
        </div>

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
          <div className="border-[3px] border-black overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-black border-b-[2px] border-[#FFFF00]">
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">NOPD</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">NAMA OBJEK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">JENIS PAJAK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">WAJIB PAJAK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">ALAMAT</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">PAJAK/BLN</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">DETAIL</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((op) => {
                  const wp = op.wpId ? wpMap.get(op.wpId) : null;
                  const hasDetail = op.detailPajak !== null && op.detailPajak !== undefined && Object.keys(op.detailPajak as object || {}).length > 0;
                  return (
                    <TableRow
                      key={op.id}
                      className="border-b-[1px] border-gray-200 hover:bg-gray-50"
                      data-testid={`row-op-${op.id}`}
                    >
                      <TableCell className="font-mono text-xs text-black" data-testid={`text-nopd-${op.id}`}>
                        {op.nopd}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-black max-w-[200px] truncate" data-testid={`text-nama-objek-${op.id}`}>
                        {op.namaObjek}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${jenisPajakColor(op.jenisPajak)}`}
                          data-testid={`badge-jenis-${op.id}`}
                        >
                          {shortLabel(op.jenisPajak)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 max-w-[150px] truncate" data-testid={`text-wp-${op.id}`}>
                        {wp ? wp.displayName : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 max-w-[200px] truncate">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{op.alamat}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-black whitespace-nowrap">
                        {op.pajakBulanan ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${
                            op.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                          }`}
                          data-testid={`badge-status-${op.id}`}
                        >
                          {op.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasDetail ? (
                          <Badge className="rounded-none border-[2px] border-green-600 bg-green-100 text-green-800 font-mono text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-detail-ok-${op.id}`}>
                            LENGKAP
                          </Badge>
                        ) : (
                          <Badge className="rounded-none border-[2px] border-orange-500 bg-orange-100 text-orange-700 font-mono text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-detail-pending-${op.id}`}>
                            BELUM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none border-[2px] border-black no-default-hover-elevate no-default-active-elevate"
                            onClick={() => setEditOp(op)}
                            data-testid={`button-edit-op-${op.id}`}
                          >
                            <Edit className="w-3.5 h-3.5 text-black" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none no-default-hover-elevate no-default-active-elevate"
                            onClick={() => deleteMutation.mutate(op.id)}
                            data-testid={`button-delete-op-${op.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </BackofficeLayout>
  );
}


