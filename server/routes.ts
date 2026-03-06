import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  createWajibPajakSchema,
  insertObjekPajakSchema,
  STATUS_OPTIONS,
  updateWajibPajakPayloadSchema,
  validateDetailByJenis,
  wajibPajakResolvedSchema,
  type WajibPajakWithBadanUsaha,
  type WpBadanUsahaInput,
} from "@shared/schema";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

type CsvImportRow = Record<string, string | undefined>;

const WP_CSV_COLUMNS = [
  "jenis_wp",
  "peran_wp",
  "npwpd",
  "status_aktif",
  "nama_wp",
  "nik_ktp_wp",
  "alamat_wp",
  "kecamatan_wp",
  "kelurahan_wp",
  "telepon_wa_wp",
  "email_wp",
  "nama_pengelola",
  "nik_pengelola",
  "alamat_pengelola",
  "kecamatan_pengelola",
  "kelurahan_pengelola",
  "telepon_wa_pengelola",
  "nama_badan_usaha",
  "npwp_badan_usaha",
  "alamat_badan_usaha",
  "kecamatan_badan_usaha",
  "kelurahan_badan_usaha",
  "telepon_badan_usaha",
  "email_badan_usaha",
] as const;

const OP_CSV_COLUMNS = [
  "nopd",
  "wp_id",
  "rek_pajak_id",
  "no_rek_pajak",
  "nama_rek_pajak",
  "nama_op",
  "npwp_op",
  "alamat_op",
  "kecamatan_id",
  "kecamatan_nama",
  "kelurahan_id",
  "kelurahan_nama",
  "omset_bulanan",
  "tarif_persen",
  "pajak_bulanan",
  "latitude",
  "longitude",
  "status",
  "detail_jenis_usaha",
  "detail_kapasitas_tempat",
  "detail_jumlah_karyawan",
  "detail_rata2_pengunjung",
  "detail_jam_buka",
  "detail_jam_tutup",
  "detail_harga_termurah",
  "detail_harga_termahal",
  "detail_jumlah_kamar",
  "detail_klasifikasi",
  "detail_fasilitas",
  "detail_rata2_pengunjung_harian",
  "detail_jenis_hiburan",
  "detail_kapasitas",
  "detail_jam_operasional",
  "detail_jenis_lokasi",
  "detail_kapasitas_kendaraan",
  "detail_tarif_parkir",
  "detail_jenis_tenaga_listrik",
  "detail_daya_listrik",
  "detail_jenis_reklame",
  "detail_ukuran_reklame",
  "detail_judul_reklame",
  "detail_masa_berlaku",
  "detail_status_reklame",
  "detail_nama_biro_jasa",
  "detail_jenis_air_tanah",
  "detail_rata2_ukuran_pemakaian",
  "detail_kriteria_air_tanah",
  "detail_kelompok_usaha",
  "detail_jenis_burung_walet",
  "detail_panen_per_tahun",
  "detail_rata2_berat_panen",
] as const;

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function normalizeStatus(value: unknown) {
  const cleaned = cleanText(value);
  if (!cleaned) return "active";
  return STATUS_OPTIONS.includes(cleaned as (typeof STATUS_OPTIONS)[number]) ? cleaned : "active";
}

function normalizeBadanUsaha(
  payload: Record<string, unknown>,
  partial = false,
): WpBadanUsahaInput | null | undefined {
  const hasBadanKeys =
    hasOwn(payload, "namaBadanUsaha") ||
    hasOwn(payload, "npwpBadanUsaha") ||
    hasOwn(payload, "alamatBadanUsaha") ||
    hasOwn(payload, "kecamatanBadanUsaha") ||
    hasOwn(payload, "kelurahanBadanUsaha") ||
    hasOwn(payload, "teleponBadanUsaha") ||
    hasOwn(payload, "emailBadanUsaha") ||
    hasOwn(payload, "badanUsaha");

  if (partial && !hasBadanKeys) return undefined;

  const rawNested = payload.badanUsaha && typeof payload.badanUsaha === "object"
    ? (payload.badanUsaha as Record<string, unknown>)
    : {};

  const source = {
    namaBadanUsaha: hasOwn(payload, "namaBadanUsaha") ? payload.namaBadanUsaha : rawNested.namaBadanUsaha,
    npwpBadanUsaha: hasOwn(payload, "npwpBadanUsaha") ? payload.npwpBadanUsaha : rawNested.npwpBadanUsaha,
    alamatBadanUsaha: hasOwn(payload, "alamatBadanUsaha") ? payload.alamatBadanUsaha : rawNested.alamatBadanUsaha,
    kecamatanBadanUsaha: hasOwn(payload, "kecamatanBadanUsaha") ? payload.kecamatanBadanUsaha : rawNested.kecamatanBadanUsaha,
    kelurahanBadanUsaha: hasOwn(payload, "kelurahanBadanUsaha") ? payload.kelurahanBadanUsaha : rawNested.kelurahanBadanUsaha,
    teleponBadanUsaha: hasOwn(payload, "teleponBadanUsaha") ? payload.teleponBadanUsaha : rawNested.teleponBadanUsaha,
    emailBadanUsaha: hasOwn(payload, "emailBadanUsaha") ? payload.emailBadanUsaha : rawNested.emailBadanUsaha,
  } as Record<string, unknown>;

  const normalized: WpBadanUsahaInput = {
    namaBadanUsaha: cleanText(source.namaBadanUsaha),
    npwpBadanUsaha: cleanText(source.npwpBadanUsaha),
    alamatBadanUsaha: cleanText(source.alamatBadanUsaha),
    kecamatanBadanUsaha: cleanText(source.kecamatanBadanUsaha),
    kelurahanBadanUsaha: cleanText(source.kelurahanBadanUsaha),
    teleponBadanUsaha: cleanText(source.teleponBadanUsaha),
    emailBadanUsaha: cleanText(source.emailBadanUsaha),
  };

  const hasAnyValue = Object.values(normalized).some((value) => value !== null && value !== undefined);
  if (!hasAnyValue) return null;
  return normalized;
}

function normalizeWpData(payload: Record<string, unknown>, partial = false) {
  const normalized: Record<string, unknown> = {};

  if (!partial || hasOwn(payload, "jenisWp")) normalized.jenisWp = cleanText(payload.jenisWp);
  if (!partial || hasOwn(payload, "peranWp")) normalized.peranWp = cleanText(payload.peranWp);
  if (!partial || hasOwn(payload, "npwpd")) normalized.npwpd = cleanText(payload.npwpd);
  if (!partial || hasOwn(payload, "statusAktif")) normalized.statusAktif = normalizeStatus(payload.statusAktif);

  if (!partial || hasOwn(payload, "namaWp")) normalized.namaWp = cleanText(payload.namaWp);
  if (!partial || hasOwn(payload, "nikKtpWp")) normalized.nikKtpWp = cleanText(payload.nikKtpWp);
  if (!partial || hasOwn(payload, "alamatWp")) normalized.alamatWp = cleanText(payload.alamatWp);
  if (!partial || hasOwn(payload, "kecamatanWp")) normalized.kecamatanWp = cleanText(payload.kecamatanWp);
  if (!partial || hasOwn(payload, "kelurahanWp")) normalized.kelurahanWp = cleanText(payload.kelurahanWp);
  if (!partial || hasOwn(payload, "teleponWaWp")) normalized.teleponWaWp = cleanText(payload.teleponWaWp);
  if (!partial || hasOwn(payload, "emailWp")) normalized.emailWp = cleanText(payload.emailWp);

  if (!partial || hasOwn(payload, "namaPengelola")) normalized.namaPengelola = cleanText(payload.namaPengelola);
  if (!partial || hasOwn(payload, "nikPengelola")) normalized.nikPengelola = cleanText(payload.nikPengelola);
  if (!partial || hasOwn(payload, "alamatPengelola")) normalized.alamatPengelola = cleanText(payload.alamatPengelola);
  if (!partial || hasOwn(payload, "kecamatanPengelola")) normalized.kecamatanPengelola = cleanText(payload.kecamatanPengelola);
  if (!partial || hasOwn(payload, "kelurahanPengelola")) normalized.kelurahanPengelola = cleanText(payload.kelurahanPengelola);
  if (!partial || hasOwn(payload, "teleponWaPengelola")) normalized.teleponWaPengelola = cleanText(payload.teleponWaPengelola);

  const badanUsaha = normalizeBadanUsaha(payload, partial);
  if (!partial || badanUsaha !== undefined) {
    normalized.badanUsaha = badanUsaha;
  }

  return normalized;
}

function toResolvedWpShape(data: WajibPajakWithBadanUsaha | Record<string, unknown>) {
  return {
    jenisWp: data.jenisWp,
    peranWp: data.peranWp,
    npwpd: data.npwpd ?? null,
    statusAktif: data.statusAktif,

    namaWp: data.namaWp ?? null,
    nikKtpWp: data.nikKtpWp ?? null,
    alamatWp: data.alamatWp ?? null,
    kecamatanWp: data.kecamatanWp ?? null,
    kelurahanWp: data.kelurahanWp ?? null,
    teleponWaWp: data.teleponWaWp ?? null,
    emailWp: data.emailWp ?? null,

    namaPengelola: data.namaPengelola ?? null,
    nikPengelola: data.nikPengelola ?? null,
    alamatPengelola: data.alamatPengelola ?? null,
    kecamatanPengelola: data.kecamatanPengelola ?? null,
    kelurahanPengelola: data.kelurahanPengelola ?? null,
    teleponWaPengelola: data.teleponWaPengelola ?? null,

    badanUsaha: (data as any).badanUsaha ?? null,
  };
}

function parseInteger(value: unknown) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNumber(value: unknown) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}

function normalizeOpData(payload: Record<string, unknown>, partial = false) {
  const normalized: Record<string, unknown> = {};

  if (!partial || hasOwn(payload, "nopd")) {
    normalized.nopd = cleanText(payload.nopd) ?? undefined;
  }
  if (!partial || hasOwn(payload, "wpId")) normalized.wpId = payload.wpId ?? null;
  if (!partial || hasOwn(payload, "rekPajakId")) normalized.rekPajakId = payload.rekPajakId ?? null;
  if (!partial || hasOwn(payload, "namaOp")) normalized.namaOp = cleanText(payload.namaOp) ?? "";
  if (!partial || hasOwn(payload, "npwpOp")) normalized.npwpOp = cleanText(payload.npwpOp);
  if (!partial || hasOwn(payload, "alamatOp")) normalized.alamatOp = cleanText(payload.alamatOp) ?? "";
  if (!partial || hasOwn(payload, "kecamatanId")) normalized.kecamatanId = cleanText(payload.kecamatanId) ?? "";
  if (!partial || hasOwn(payload, "kelurahanId")) normalized.kelurahanId = cleanText(payload.kelurahanId) ?? "";
  if (!partial || hasOwn(payload, "omsetBulanan")) normalized.omsetBulanan = cleanText(payload.omsetBulanan);
  if (!partial || hasOwn(payload, "tarifPersen")) normalized.tarifPersen = cleanText(payload.tarifPersen);
  if (!partial || hasOwn(payload, "pajakBulanan")) normalized.pajakBulanan = cleanText(payload.pajakBulanan);
  if (!partial || hasOwn(payload, "latitude")) normalized.latitude = cleanText(payload.latitude);
  if (!partial || hasOwn(payload, "longitude")) normalized.longitude = cleanText(payload.longitude);
  if (!partial || hasOwn(payload, "status")) normalized.status = normalizeStatus(payload.status);
  if (!partial || hasOwn(payload, "detailPajak")) normalized.detailPajak = payload.detailPajak ?? null;

  return normalized;
}

async function getJenisPajakFromRekId(rekPajakId: number) {
  const rekeningList = await storage.getAllMasterRekeningPajak();
  const rekening = rekeningList.find((item) => item.id === rekPajakId);
  if (!rekening) {
    throw new Error("Rekening pajak tidak ditemukan");
  }
  return rekening.jenisPajak;
}

function buildDetailFromCsvRow(row: CsvImportRow, jenisPajak: string) {
  if (jenisPajak === "PBJT Makanan dan Minuman") {
    return compactObject({
      jenisUsaha: cleanText(row.detail_jenis_usaha) ?? undefined,
      kapasitasTempat: parseNumber(row.detail_kapasitas_tempat) ?? undefined,
      jumlahKaryawan: parseNumber(row.detail_jumlah_karyawan) ?? undefined,
      rata2Pengunjung: parseNumber(row.detail_rata2_pengunjung) ?? undefined,
      jamBuka: cleanText(row.detail_jam_buka) ?? undefined,
      jamTutup: cleanText(row.detail_jam_tutup) ?? undefined,
      hargaTermurah: parseNumber(row.detail_harga_termurah) ?? undefined,
      hargaTermahal: parseNumber(row.detail_harga_termahal) ?? undefined,
    });
  }

  if (jenisPajak === "PBJT Jasa Perhotelan") {
    return compactObject({
      jenisUsaha: cleanText(row.detail_jenis_usaha) ?? undefined,
      jumlahKamar: parseNumber(row.detail_jumlah_kamar) ?? undefined,
      klasifikasi: cleanText(row.detail_klasifikasi) ?? undefined,
      fasilitas: cleanText(row.detail_fasilitas) ?? undefined,
      rata2PengunjungHarian: parseNumber(row.detail_rata2_pengunjung_harian) ?? undefined,
      hargaTermurah: parseNumber(row.detail_harga_termurah) ?? undefined,
      hargaTermahal: parseNumber(row.detail_harga_termahal) ?? undefined,
    });
  }

  if (jenisPajak === "PBJT Jasa Parkir") {
    return compactObject({
      jenisLokasi: cleanText(row.detail_jenis_lokasi) ?? undefined,
      kapasitasKendaraan: parseNumber(row.detail_kapasitas_kendaraan) ?? undefined,
      tarifParkir: parseNumber(row.detail_tarif_parkir) ?? undefined,
      rata2Pengunjung: parseNumber(row.detail_rata2_pengunjung) ?? undefined,
    });
  }

  if (jenisPajak === "PBJT Jasa Kesenian dan Hiburan") {
    return compactObject({
      jenisHiburan: cleanText(row.detail_jenis_hiburan) ?? undefined,
      kapasitas: parseNumber(row.detail_kapasitas) ?? undefined,
      jamOperasional: cleanText(row.detail_jam_operasional) ?? undefined,
      jumlahKaryawan: parseNumber(row.detail_jumlah_karyawan) ?? undefined,
    });
  }

  if (jenisPajak === "PBJT Tenaga Listrik") {
    return compactObject({
      jenisTenagaListrik: cleanText(row.detail_jenis_tenaga_listrik) ?? undefined,
      dayaListrik: parseNumber(row.detail_daya_listrik) ?? undefined,
      kapasitas: parseNumber(row.detail_kapasitas) ?? undefined,
    });
  }

  if (jenisPajak === "Pajak Reklame") {
    return compactObject({
      jenisReklame: cleanText(row.detail_jenis_reklame) ?? undefined,
      ukuranReklame: parseNumber(row.detail_ukuran_reklame) ?? undefined,
      judulReklame: cleanText(row.detail_judul_reklame) ?? undefined,
      masaBerlaku: cleanText(row.detail_masa_berlaku) ?? undefined,
      statusReklame: cleanText(row.detail_status_reklame) ?? undefined,
      namaBiroJasa: cleanText(row.detail_nama_biro_jasa) ?? undefined,
    });
  }

  if (jenisPajak === "Pajak Air Tanah") {
    return compactObject({
      jenisAirTanah: cleanText(row.detail_jenis_air_tanah) ?? undefined,
      rata2UkuranPemakaian: parseNumber(row.detail_rata2_ukuran_pemakaian) ?? undefined,
      kriteriaAirTanah: cleanText(row.detail_kriteria_air_tanah) ?? undefined,
      kelompokUsaha: cleanText(row.detail_kelompok_usaha) ?? undefined,
    });
  }

  if (jenisPajak === "Pajak Sarang Burung Walet") {
    return compactObject({
      jenisBurungWalet: cleanText(row.detail_jenis_burung_walet) ?? undefined,
      panenPerTahun: parseNumber(row.detail_panen_per_tahun) ?? undefined,
      rata2BeratPanen: parseNumber(row.detail_rata2_berat_panen) ?? undefined,
    });
  }

  return null;
}

function flattenDetailForCsv(detail: unknown) {
  const d = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : {};
  return {
    detail_jenis_usaha: d.jenisUsaha ?? "",
    detail_kapasitas_tempat: d.kapasitasTempat ?? "",
    detail_jumlah_karyawan: d.jumlahKaryawan ?? "",
    detail_rata2_pengunjung: d.rata2Pengunjung ?? "",
    detail_jam_buka: d.jamBuka ?? "",
    detail_jam_tutup: d.jamTutup ?? "",
    detail_harga_termurah: d.hargaTermurah ?? "",
    detail_harga_termahal: d.hargaTermahal ?? "",
    detail_jumlah_kamar: d.jumlahKamar ?? "",
    detail_klasifikasi: d.klasifikasi ?? "",
    detail_fasilitas: d.fasilitas ?? "",
    detail_rata2_pengunjung_harian: d.rata2PengunjungHarian ?? "",
    detail_jenis_hiburan: d.jenisHiburan ?? "",
    detail_kapasitas: d.kapasitas ?? "",
    detail_jam_operasional: d.jamOperasional ?? "",
    detail_jenis_lokasi: d.jenisLokasi ?? "",
    detail_kapasitas_kendaraan: d.kapasitasKendaraan ?? "",
    detail_tarif_parkir: d.tarifParkir ?? "",
    detail_jenis_tenaga_listrik: d.jenisTenagaListrik ?? "",
    detail_daya_listrik: d.dayaListrik ?? "",
    detail_jenis_reklame: d.jenisReklame ?? "",
    detail_ukuran_reklame: d.ukuranReklame ?? "",
    detail_judul_reklame: d.judulReklame ?? "",
    detail_masa_berlaku: d.masaBerlaku ?? "",
    detail_status_reklame: d.statusReklame ?? "",
    detail_nama_biro_jasa: d.namaBiroJasa ?? "",
    detail_jenis_air_tanah: d.jenisAirTanah ?? "",
    detail_rata2_ukuran_pemakaian: d.rata2UkuranPemakaian ?? "",
    detail_kriteria_air_tanah: d.kriteriaAirTanah ?? "",
    detail_kelompok_usaha: d.kelompokUsaha ?? "",
    detail_jenis_burung_walet: d.jenisBurungWalet ?? "",
    detail_panen_per_tahun: d.panenPerTahun ?? "",
    detail_rata2_berat_panen: d.rata2BeratPanen ?? "",
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/wajib-pajak", async (_req, res) => {
    const data = await storage.getAllWajibPajak();
    res.json(data);
  });

  app.post("/api/wajib-pajak", async (req, res) => {
    const normalized = normalizeWpData(req.body);
    const parsed = createWajibPajakSchema.safeParse(normalized);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const created = await storage.createWajibPajak(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/wajib-pajak/:id", async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await storage.getWajibPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Wajib Pajak tidak ditemukan" });
    }

    const normalized = normalizeWpData(req.body, true);
    const parsedPayload = updateWajibPajakPayloadSchema.safeParse(normalized);
    if (!parsedPayload.success) {
      return res.status(400).json({ message: parsedPayload.error.message });
    }

    const merged = {
      ...toResolvedWpShape(existing),
      ...parsedPayload.data,
      badanUsaha:
        parsedPayload.data.badanUsaha !== undefined
          ? parsedPayload.data.badanUsaha
          : existing.badanUsaha,
    };

    if (merged.jenisWp === "orang_pribadi") {
      merged.badanUsaha = null;
    }

    const parsedMerged = wajibPajakResolvedSchema.safeParse(merged);
    if (!parsedMerged.success) {
      return res.status(400).json({ message: parsedMerged.error.message });
    }

    const payloadToUpdate = {
      ...parsedPayload.data,
      badanUsaha:
        parsedPayload.data.badanUsaha !== undefined
          ? parsedPayload.data.badanUsaha
          : merged.jenisWp === "orang_pribadi"
            ? null
            : undefined,
    };

    const updated = await storage.updateWajibPajak(id, payloadToUpdate);
    res.json(updated);
  });

  app.delete("/api/wajib-pajak/:id", async (req, res) => {
    await storage.deleteWajibPajak(Number.parseInt(req.params.id, 10));
    res.status(204).send();
  });

  app.get("/api/wajib-pajak/export", async (_req, res) => {
    const data = await storage.getAllWajibPajak();
    const rows = data.map((wp) => ({
      jenis_wp: wp.jenisWp,
      peran_wp: wp.peranWp,
      npwpd: wp.npwpd || "",
      status_aktif: wp.statusAktif,

      nama_wp: wp.namaWp || "",
      nik_ktp_wp: wp.nikKtpWp || "",
      alamat_wp: wp.alamatWp || "",
      kecamatan_wp: wp.kecamatanWp || "",
      kelurahan_wp: wp.kelurahanWp || "",
      telepon_wa_wp: wp.teleponWaWp || "",
      email_wp: wp.emailWp || "",

      nama_pengelola: wp.namaPengelola || "",
      nik_pengelola: wp.nikPengelola || "",
      alamat_pengelola: wp.alamatPengelola || "",
      kecamatan_pengelola: wp.kecamatanPengelola || "",
      kelurahan_pengelola: wp.kelurahanPengelola || "",
      telepon_wa_pengelola: wp.teleponWaPengelola || "",

      nama_badan_usaha: wp.badanUsaha?.namaBadanUsaha || "",
      npwp_badan_usaha: wp.badanUsaha?.npwpBadanUsaha || "",
      alamat_badan_usaha: wp.badanUsaha?.alamatBadanUsaha || "",
      kecamatan_badan_usaha: wp.badanUsaha?.kecamatanBadanUsaha || "",
      kelurahan_badan_usaha: wp.badanUsaha?.kelurahanBadanUsaha || "",
      telepon_badan_usaha: wp.badanUsaha?.teleponBadanUsaha || "",
      email_badan_usaha: wp.badanUsaha?.emailBadanUsaha || "",
    }));

    const csv = stringify(rows, { header: true, columns: [...WP_CSV_COLUMNS] });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=wajib_pajak.csv");
    res.send(csv);
  });

  app.post("/api/wajib-pajak/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File CSV diperlukan" });
      }

      const content = req.file.buffer.toString("utf-8");
      const records = parse<CsvImportRow>(content, { columns: true, skip_empty_lines: true, trim: true });

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        const wpData = normalizeWpData({
          jenisWp: row.jenis_wp,
          peranWp: row.peran_wp,
          npwpd: row.npwpd,
          statusAktif: row.status_aktif,

          namaWp: row.nama_wp,
          nikKtpWp: row.nik_ktp_wp,
          alamatWp: row.alamat_wp,
          kecamatanWp: row.kecamatan_wp,
          kelurahanWp: row.kelurahan_wp,
          teleponWaWp: row.telepon_wa_wp,
          emailWp: row.email_wp,

          namaPengelola: row.nama_pengelola,
          nikPengelola: row.nik_pengelola,
          alamatPengelola: row.alamat_pengelola,
          kecamatanPengelola: row.kecamatan_pengelola,
          kelurahanPengelola: row.kelurahan_pengelola,
          teleponWaPengelola: row.telepon_wa_pengelola,

          badanUsaha: {
            namaBadanUsaha: row.nama_badan_usaha,
            npwpBadanUsaha: row.npwp_badan_usaha,
            alamatBadanUsaha: row.alamat_badan_usaha,
            kecamatanBadanUsaha: row.kecamatan_badan_usaha,
            kelurahanBadanUsaha: row.kelurahan_badan_usaha,
            teleponBadanUsaha: row.telepon_badan_usaha,
            emailBadanUsaha: row.email_badan_usaha,
          },
        });

        const parsed = createWajibPajakSchema.safeParse(wpData);
        if (!parsed.success) {
          failed++;
          errors.push(`Baris ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(", ")}`);
          continue;
        }

        try {
          await storage.createWajibPajak(parsed.data);
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`Baris ${i + 2}: ${err.message}`);
        }
      }

      res.json({ success, failed, total: records.length, errors });
    } catch (err: any) {
      res.status(400).json({ message: `Gagal parsing CSV: ${err.message}` });
    }
  });

  app.get("/api/master/kecamatan", async (_req, res) => {
    const data = await storage.getAllMasterKecamatan();
    res.json(data);
  });

  app.get("/api/master/kelurahan", async (req, res) => {
    const kecamatanId = typeof req.query.kecamatanId === "string" ? req.query.kecamatanId : undefined;
    const data = await storage.getMasterKelurahan(kecamatanId);
    res.json(data);
  });

  app.get("/api/master/rekening-pajak", async (_req, res) => {
    const data = await storage.getAllMasterRekeningPajak();
    res.json(data);
  });

  app.get("/api/objek-pajak", async (req, res) => {
    const jenisPajak = typeof req.query.jenisPajak === "string" ? req.query.jenisPajak : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const kecamatanId = typeof req.query.kecamatanId === "string" ? req.query.kecamatanId : undefined;

    const data = await storage.getAllObjekPajak({ jenisPajak, status, kecamatanId });
    res.json(data);
  });

  app.get("/api/objek-pajak/export", async (_req, res) => {
    const data = await storage.getAllObjekPajak();
    const rows = data.map((op) => ({
      nopd: op.nopd,
      wp_id: op.wpId,
      rek_pajak_id: op.rekPajakId,
      no_rek_pajak: op.noRekPajak,
      nama_rek_pajak: op.namaRekPajak,
      nama_op: op.namaOp,
      npwp_op: op.npwpOp || "",
      alamat_op: op.alamatOp,
      kecamatan_id: op.kecamatanId,
      kecamatan_nama: op.kecamatan || "",
      kelurahan_id: op.kelurahanId,
      kelurahan_nama: op.kelurahan || "",
      omset_bulanan: op.omsetBulanan || "",
      tarif_persen: op.tarifPersen || "",
      pajak_bulanan: op.pajakBulanan || "",
      latitude: op.latitude || "",
      longitude: op.longitude || "",
      status: op.status,
      ...flattenDetailForCsv(op.detailPajak),
    }));

    const csv = stringify(rows, { header: true, columns: [...OP_CSV_COLUMNS] });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=objek_pajak.csv");
    res.send(csv);
  });

  app.post("/api/objek-pajak/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File CSV diperlukan" });
      }

      const content = req.file.buffer.toString("utf-8");
      const records = parse<CsvImportRow>(content, { columns: true, skip_empty_lines: true, trim: true });

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        const opData = normalizeOpData({
          nopd: row.nopd,
          wpId: parseInteger(row.wp_id),
          rekPajakId: parseInteger(row.rek_pajak_id),
          namaOp: row.nama_op,
          npwpOp: row.npwp_op,
          alamatOp: row.alamat_op,
          kecamatanId: row.kecamatan_id,
          kelurahanId: row.kelurahan_id,
          omsetBulanan: row.omset_bulanan,
          tarifPersen: row.tarif_persen,
          pajakBulanan: row.pajak_bulanan,
          latitude: row.latitude,
          longitude: row.longitude,
          status: row.status,
          detailPajak: null,
        });

        const parsed = insertObjekPajakSchema.safeParse(opData);
        if (!parsed.success) {
          failed++;
          errors.push(`Baris ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(", ")}`);
          continue;
        }

        try {
          const jenisPajak = await getJenisPajakFromRekId(parsed.data.rekPajakId);
          const detailCandidate = buildDetailFromCsvRow(row, jenisPajak);
          const detailParsed = validateDetailByJenis(jenisPajak, detailCandidate);
          if (!detailParsed.success) {
            failed++;
            errors.push(`Baris ${i + 2}: ${detailParsed.error.issues.map((e) => e.message).join(", ")}`);
            continue;
          }

          await storage.createObjekPajak({ ...parsed.data, detailPajak: detailParsed.data });
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`Baris ${i + 2}: ${err.message}`);
        }
      }

      res.json({ success, failed, total: records.length, errors });
    } catch (err: any) {
      res.status(400).json({ message: `Gagal parsing CSV: ${err.message}` });
    }
  });

  app.get("/api/objek-pajak/:id", async (req, res) => {
    const op = await storage.getObjekPajak(Number.parseInt(req.params.id, 10));
    if (!op) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }
    res.json(op);
  });

  app.post("/api/objek-pajak", async (req, res) => {
    const normalized = normalizeOpData(req.body);
    const parsed = insertObjekPajakSchema.safeParse(normalized);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const jenisPajak = await getJenisPajakFromRekId(parsed.data.rekPajakId);
    const detailParsed = validateDetailByJenis(jenisPajak, parsed.data.detailPajak);
    if (!detailParsed.success) {
      return res.status(400).json({ message: detailParsed.error.message });
    }

    const created = await storage.createObjekPajak({ ...parsed.data, detailPajak: detailParsed.data });
    res.status(201).json(created);
  });

  app.patch("/api/objek-pajak/:id", async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await storage.getObjekPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }

    const partialSchema = insertObjekPajakSchema.partial();
    const normalized = normalizeOpData(req.body, true);
    const parsed = partialSchema.safeParse(normalized);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const targetRekPajakId = parsed.data.rekPajakId ?? existing.rekPajakId;
    const targetJenis = await getJenisPajakFromRekId(targetRekPajakId);

    if (parsed.data.detailPajak !== undefined) {
      const detailParsed = validateDetailByJenis(targetJenis, parsed.data.detailPajak);
      if (!detailParsed.success) {
        return res.status(400).json({ message: detailParsed.error.message });
      }
      parsed.data.detailPajak = detailParsed.data;
    }

    const updated = await storage.updateObjekPajak(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/objek-pajak/:id", async (req, res) => {
    await storage.deleteObjekPajak(Number.parseInt(req.params.id, 10));
    res.status(204).send();
  });

  return httpServer;
}
