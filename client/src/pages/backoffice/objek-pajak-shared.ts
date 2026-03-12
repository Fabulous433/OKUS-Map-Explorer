import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import type { ApiFieldError } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { MasterRekeningPajak } from "@shared/schema";
import {
  PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS,
  PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS,
  PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS,
  PBJT_PARKIR_JENIS_LOKASI_OPTIONS,
  PBJT_PARKIR_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS,
  PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS,
  PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS,
} from "@shared/pbjt-options";

export const opFormSchema = z.object({
  nopd: z.string().trim().optional(),
  wpId: z.coerce.number().int().positive("Wajib Pajak wajib dipilih"),
  rekPajakId: z.coerce.number().int().positive("Rekening pajak wajib dipilih"),
  namaOp: z.string().trim().min(1, "Nama Objek wajib diisi"),
  npwpOp: z.string().trim().max(32).nullable().optional(),
  alamatOp: z.string().trim().min(1, "Alamat wajib diisi"),
  kecamatanId: z.string().trim().min(1, "Kecamatan wajib dipilih"),
  kelurahanId: z.string().trim().min(1, "Kelurahan wajib dipilih"),
  omsetBulanan: z.string().nullable().optional(),
  tarifPersen: z.string().nullable().optional(),
  pajakBulanan: z.string().nullable().optional(),
  detailPajak: z.record(z.union([z.string(), z.number(), z.array(z.string()), z.null()])).nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

export type OPFormValues = z.infer<typeof opFormSchema>;
export type OPDetailValue = string | number | string[] | null;
export type OPDetailRecord = Record<string, OPDetailValue>;
export type ObjekPajakDetailEntry = {
  label: string;
  value: string;
};
export type QualityWarning = {
  level: string;
  code: string;
  message: string;
  relatedIds: Array<string | number>;
};

export const INITIAL_CURSOR = 2147483647;
export const HOTEL_FACILITY_OPTIONS = [
  "Kolam Renang",
  "Restoran",
  "Ruang Rapat",
  "Wifi",
  "Parkir",
  "Spa",
  "Laundry",
  "Sarapan",
] as const;
export const HIBURAN_LAINNYA_VALUE = "Lainnya";

export function isRestoranJenisUsaha(value: unknown): value is "Restoran" {
  return value === "Restoran";
}

export function requiresHotelKlasifikasi(value: unknown) {
  return PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS.includes(
    value as (typeof PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS)[number],
  );
}

export function isKnownJenisHiburan(value: unknown) {
  return PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS.includes(
    value as (typeof PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS)[number],
  );
}

export function toKnownSelectValue<TOptions extends readonly string[]>(options: TOptions, value: unknown) {
  return typeof value === "string" && options.includes(value as TOptions[number]) ? value : "";
}

export function applyApiFieldErrors(
  form: UseFormReturn<OPFormValues>,
  fieldErrors: ApiFieldError[],
) {
  for (const item of fieldErrors) {
    if (!item.field || !item.message) continue;
    form.setError(item.field as any, { type: "server", message: item.message });
  }
}

export function getDetailRecord(form: UseFormReturn<OPFormValues>): OPDetailRecord {
  const detail = form.watch("detailPajak");
  if (!detail || typeof detail !== "object") {
    return {};
  }

  return detail as OPDetailRecord;
}

export function setDetailValue(
  form: UseFormReturn<OPFormValues>,
  detail: OPDetailRecord,
  key: string,
  value: OPDetailValue,
) {
  form.setValue("detailPajak", { ...detail, [key]: value });
}

export function setDetailArrayValue(
  form: UseFormReturn<OPFormValues>,
  detail: OPDetailRecord,
  key: string,
  value: string,
  checked: boolean,
) {
  const current = Array.isArray(detail[key]) ? [...detail[key]] : [];
  const next = checked ? [...current, value] : current.filter((item) => item !== value);
  form.setValue("detailPajak", { ...detail, [key]: next });
}

export function normalizeOptional(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMoneyDigits(value: unknown) {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(Math.trunc(value));
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const trailingZeroDecimals = raw.match(/^(.*?)[.,]00$/);
  if (trailingZeroDecimals) {
    return trailingZeroDecimals[1].replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  }

  return raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
}

export function formatMoneyInput(value: unknown) {
  const digits = normalizeMoneyDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export function setMoneyDetailValue(
  form: UseFormReturn<OPFormValues>,
  detail: OPDetailRecord,
  key: string,
  value: string,
) {
  const digits = normalizeMoneyDigits(value);
  setDetailValue(form, detail, key, digits ? digits : null);
}

export function normalizeOpPayload(
  data: OPFormValues,
  rekeningList: MasterRekeningPajak[],
) {
  const rekening = rekeningList.find((item) => item.id === data.rekPajakId);
  if (!rekening) {
    throw new Error("Rekening pajak tidak ditemukan");
  }

  const jenisPajak = rekening.jenisPajak;
  const detailRaw = (data.detailPajak ?? {}) as OPDetailRecord;
  const detail: Record<string, unknown> = {};

  if (jenisPajak.includes("Makanan")) {
    detail.jenisUsaha = detailRaw.jenisUsaha;
    detail.klasifikasi = isRestoranJenisUsaha(detailRaw.jenisUsaha) ? detailRaw.klasifikasi : undefined;
    detail.kapasitasTempat = detailRaw.kapasitasTempat;
    detail.jumlahKaryawan = detailRaw.jumlahKaryawan;
    detail.rata2Pengunjung = detailRaw.rata2Pengunjung;
    detail.jamBuka = detailRaw.jamBuka;
    detail.jamTutup = detailRaw.jamTutup;
    detail.hargaTermurah = detailRaw.hargaTermurah;
    detail.hargaTermahal = detailRaw.hargaTermahal;
  } else if (jenisPajak.includes("Perhotelan")) {
    detail.jenisUsaha = detailRaw.jenisUsaha;
    detail.jumlahKamar = detailRaw.jumlahKamar;
    detail.klasifikasi = requiresHotelKlasifikasi(detailRaw.jenisUsaha) ? detailRaw.klasifikasi : undefined;
    detail.fasilitas = Array.isArray(detailRaw.fasilitas) ? detailRaw.fasilitas : undefined;
    detail.rata2PengunjungHarian = detailRaw.rata2PengunjungHarian;
    detail.hargaTermurah = detailRaw.hargaTermurah;
    detail.hargaTermahal = detailRaw.hargaTermahal;
  } else if (jenisPajak.includes("Parkir")) {
    detail.jenisUsaha = detailRaw.jenisUsaha;
    detail.jenisLokasi = detailRaw.jenisLokasi;
    detail.kapasitasKendaraan = detailRaw.kapasitasKendaraan;
    detail.tarifParkir = detailRaw.tarifParkir;
    detail.rata2Pengunjung = detailRaw.rata2Pengunjung;
  } else if (jenisPajak.includes("Hiburan") || jenisPajak.includes("Kesenian")) {
    detail.jenisHiburan =
      detailRaw.jenisHiburan === HIBURAN_LAINNYA_VALUE
        ? normalizeOptional(String(detailRaw.jenisHiburanLainnya ?? "")) ?? detailRaw.jenisHiburan
        : detailRaw.jenisHiburan;
    detail.kapasitas = detailRaw.kapasitas;
    detail.jamOperasional = detailRaw.jamOperasional;
    detail.jumlahKaryawan = detailRaw.jumlahKaryawan;
  } else if (jenisPajak.includes("Tenaga Listrik")) {
    detail.jenisTenagaListrik = detailRaw.jenisTenagaListrik;
    detail.dayaListrik = detailRaw.dayaListrik;
    detail.kapasitas = detailRaw.kapasitas;
  } else if (jenisPajak.includes("Reklame")) {
    detail.jenisReklame = detailRaw.jenisReklame;
    detail.ukuranPanjang = detailRaw.ukuranPanjang;
    detail.ukuranLebar = detailRaw.ukuranLebar;
    detail.ukuranTinggi = detailRaw.ukuranTinggi;
    detail.judulReklame = detailRaw.judulReklame;
    detail.masaBerlaku = detailRaw.masaBerlaku;
    detail.statusReklame = detailRaw.statusReklame ?? "baru";
    detail.namaBiroJasa = detailRaw.namaBiroJasa;
  } else if (jenisPajak.includes("Air Tanah")) {
    detail.jenisAirTanah = detailRaw.jenisAirTanah;
    detail.rata2UkuranPemakaian = detailRaw.rata2UkuranPemakaian;
    detail.kriteriaAirTanah = detailRaw.kriteriaAirTanah;
    detail.kelompokUsaha = detailRaw.kelompokUsaha;
  } else if (jenisPajak.includes("Walet")) {
    detail.jenisBurungWalet = detailRaw.jenisBurungWalet;
    detail.panenPerTahun = detailRaw.panenPerTahun;
    detail.rata2BeratPanen = detailRaw.rata2BeratPanen;
  }

  const cleanDetail = Object.fromEntries(
    Object.entries(detail).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );

  return {
    nopd: data.nopd?.trim() ? data.nopd.trim() : undefined,
    wpId: data.wpId,
    rekPajakId: data.rekPajakId,
    namaOp: data.namaOp.trim(),
    npwpOp: normalizeOptional(data.npwpOp),
    alamatOp: data.alamatOp.trim(),
    kecamatanId: data.kecamatanId,
    kelurahanId: data.kelurahanId,
    omsetBulanan: normalizeOptional(data.omsetBulanan),
    tarifPersen: normalizeOptional(data.tarifPersen),
    pajakBulanan: normalizeOptional(data.pajakBulanan),
    latitude: normalizeOptional(data.latitude),
    longitude: normalizeOptional(data.longitude),
    status: data.status,
    detailPajak: Object.keys(cleanDetail).length > 0 ? cleanDetail : null,
  };
}

export type NormalizedOpPayload = ReturnType<typeof normalizeOpPayload>;

export function invalidateObjekPajakQueries() {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [first] = query.queryKey;
      return typeof first === "string" && first.startsWith("/api/objek-pajak");
    },
  });
}

export function jenisPajakColor(jenis: string) {
  if (jenis.includes("Makanan")) return "bg-primary text-white";
  if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
  if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
  if (jenis.includes("Parkir")) return "bg-green-600 text-white";
  if (jenis.includes("Hiburan") || jenis.includes("Kesenian")) return "bg-pink-600 text-white";
  return "bg-gray-600 text-white";
}

export function shortLabel(jenis: string) {
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
}

function hasRenderableValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function formatNumberDisplay(value: unknown, options?: Intl.NumberFormatOptions) {
  if (!hasRenderableValue(value)) return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      ...options,
    }).format(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
        ...options,
      }).format(parsed);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function formatCurrencyDisplay(value: unknown) {
  if (!hasRenderableValue(value)) return "";

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  }).format(parsed)}`;
}

function pushDetailEntry(entries: ObjekPajakDetailEntry[], label: string, value: unknown) {
  if (!hasRenderableValue(value)) return;
  entries.push({
    label,
    value: Array.isArray(value) ? value.join(", ") : String(value),
  });
}

export function getObjekPajakDetailEntries(
  jenisPajak: string,
  detailPajak: Record<string, unknown> | null | undefined,
): ObjekPajakDetailEntry[] {
  if (!detailPajak || typeof detailPajak !== "object") {
    return [];
  }

  const detail = detailPajak as OPDetailRecord;
  const entries: ObjekPajakDetailEntry[] = [];

  if (jenisPajak.includes("Makanan")) {
    pushDetailEntry(entries, "Jenis Usaha", detail.jenisUsaha);
    if (isRestoranJenisUsaha(detail.jenisUsaha)) {
      pushDetailEntry(entries, "Klasifikasi", detail.klasifikasi);
    }
    pushDetailEntry(entries, "Kapasitas Tempat", formatNumberDisplay(detail.kapasitasTempat));
    pushDetailEntry(entries, "Jumlah Karyawan", formatNumberDisplay(detail.jumlahKaryawan));
    pushDetailEntry(entries, "Rata-rata Pengunjung", formatNumberDisplay(detail.rata2Pengunjung));
    pushDetailEntry(entries, "Jam Buka", detail.jamBuka);
    pushDetailEntry(entries, "Jam Tutup", detail.jamTutup);
    pushDetailEntry(entries, "Harga Termurah", formatCurrencyDisplay(detail.hargaTermurah));
    pushDetailEntry(entries, "Harga Termahal", formatCurrencyDisplay(detail.hargaTermahal));
    return entries;
  }

  if (jenisPajak.includes("Perhotelan")) {
    pushDetailEntry(entries, "Jenis Usaha", detail.jenisUsaha);
    pushDetailEntry(entries, "Jumlah Kamar", formatNumberDisplay(detail.jumlahKamar));
    if (requiresHotelKlasifikasi(detail.jenisUsaha)) {
      pushDetailEntry(entries, "Klasifikasi", detail.klasifikasi);
    }
    pushDetailEntry(entries, "Fasilitas", detail.fasilitas);
    pushDetailEntry(entries, "Rata-rata Pengunjung/Hari", formatNumberDisplay(detail.rata2PengunjungHarian));
    pushDetailEntry(entries, "Harga Termurah", formatCurrencyDisplay(detail.hargaTermurah));
    pushDetailEntry(entries, "Harga Termahal", formatCurrencyDisplay(detail.hargaTermahal));
    return entries;
  }

  if (jenisPajak.includes("Parkir")) {
    pushDetailEntry(entries, "Jenis Usaha", detail.jenisUsaha);
    pushDetailEntry(entries, "Jenis Lokasi", detail.jenisLokasi);
    pushDetailEntry(entries, "Kapasitas Kendaraan", formatNumberDisplay(detail.kapasitasKendaraan));
    pushDetailEntry(entries, "Tarif Parkir", formatCurrencyDisplay(detail.tarifParkir));
    pushDetailEntry(entries, "Rata-rata Pengunjung/Hari", formatNumberDisplay(detail.rata2Pengunjung));
    return entries;
  }

  if (jenisPajak.includes("Hiburan") || jenisPajak.includes("Kesenian")) {
    pushDetailEntry(entries, "Jenis Hiburan", detail.jenisHiburan);
    pushDetailEntry(entries, "Kapasitas", formatNumberDisplay(detail.kapasitas));
    pushDetailEntry(entries, "Jam Operasional", detail.jamOperasional);
    pushDetailEntry(entries, "Jumlah Karyawan", formatNumberDisplay(detail.jumlahKaryawan));
    return entries;
  }

  if (jenisPajak.includes("Tenaga Listrik")) {
    pushDetailEntry(entries, "Jenis Tenaga Listrik", detail.jenisTenagaListrik);
    pushDetailEntry(entries, "Daya Listrik", formatNumberDisplay(detail.dayaListrik));
    pushDetailEntry(entries, "Kapasitas", formatNumberDisplay(detail.kapasitas));
    return entries;
  }

  if (jenisPajak.includes("Reklame")) {
    const ukuran = [
      hasRenderableValue(detail.ukuranPanjang) ? `${formatNumberDisplay(detail.ukuranPanjang)} m` : null,
      hasRenderableValue(detail.ukuranLebar) ? `${formatNumberDisplay(detail.ukuranLebar)} m` : null,
      hasRenderableValue(detail.ukuranTinggi) ? `${formatNumberDisplay(detail.ukuranTinggi)} m` : null,
    ].filter(Boolean);

    pushDetailEntry(entries, "Jenis Reklame", detail.jenisReklame);
    pushDetailEntry(entries, "Judul Reklame", detail.judulReklame);
    pushDetailEntry(entries, "Masa Berlaku", detail.masaBerlaku);
    pushDetailEntry(entries, "Status Reklame", detail.statusReklame);
    pushDetailEntry(entries, "Ukuran Reklame", ukuran.join(" x "));
    pushDetailEntry(entries, "Nama Biro Jasa", detail.namaBiroJasa);
    return entries;
  }

  if (jenisPajak.includes("Air Tanah")) {
    pushDetailEntry(entries, "Jenis Air Tanah", detail.jenisAirTanah);
    pushDetailEntry(entries, "Rata-rata Ukuran Pemakaian", formatNumberDisplay(detail.rata2UkuranPemakaian));
    pushDetailEntry(entries, "Kriteria Air Tanah", detail.kriteriaAirTanah);
    pushDetailEntry(entries, "Kelompok Usaha", detail.kelompokUsaha);
    return entries;
  }

  if (jenisPajak.includes("Walet")) {
    pushDetailEntry(entries, "Jenis Burung Walet", detail.jenisBurungWalet);
    pushDetailEntry(entries, "Panen per Tahun", formatNumberDisplay(detail.panenPerTahun));
    pushDetailEntry(entries, "Rata-rata Berat Panen", formatNumberDisplay(detail.rata2BeratPanen));
    return entries;
  }

  return entries;
}

export {
  PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS,
  PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS,
  PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS,
  PBJT_PARKIR_JENIS_LOKASI_OPTIONS,
  PBJT_PARKIR_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS,
  PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS,
};
