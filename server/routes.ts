import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { and, asc, desc, eq, gte, ilike, lte, lt, or, sql, type SQL } from "drizzle-orm";
import { db, storage } from "./storage";
import {
  auditLog,
  createWajibPajakSchema,
  insertObjekPajakSchema,
  masterKecamatan,
  masterKecamatanPayloadSchema,
  masterKelurahan,
  masterKelurahanPayloadSchema,
  masterRekeningPajak,
  masterRekeningPayloadSchema,
  objekPajak,
  objekPajakVerificationSchema,
  qualityCheckInputSchema,
  STATUS_OPTIONS,
  updateWajibPajakPayloadSchema,
  validateDetailByJenis,
  wajibPajak,
  wajibPajakResolvedSchema,
  wpBadanUsaha,
  type WajibPajakWithBadanUsaha,
  type WpBadanUsahaInput,
} from "@shared/schema";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import multer from "multer";
import { APP_ROLE_OPTIONS, isAppRole, verifyPassword, type AppRole, type SessionUser } from "./auth";

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

type AuditAction = "create" | "update" | "delete" | "verify" | "reject";

type AuditFilter = {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit: number;
  cursor?: number;
};

type QualityWarning = {
  level: "info" | "warning" | "critical";
  code: string;
  message: string;
  relatedIds: Array<string | number>;
};

type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

const VERIFICATION_STATUS_OPTIONS = ["draft", "verified", "rejected"] as const;
const LIST_LIMIT_DEFAULT = 25;
const LIST_LIMIT_MAX = 100;
const MAP_LIMIT_DEFAULT = 500;
const MAP_LIMIT_MAX = 1000;
const SEARCH_QUERY_MAX_LENGTH = 100;

function getActorName(req: Request) {
  const sessionUser = getSessionUser(req);
  if (sessionUser) {
    return sessionUser.username;
  }

  const raw = req.headers["x-actor-name"];
  const val = Array.isArray(raw) ? raw[0] : raw;
  const cleaned = typeof val === "string" ? val.trim() : "";
  return cleaned.length > 0 ? cleaned : "system";
}

function getSessionUser(req: Request): SessionUser | null {
  const user = req.session?.user;
  if (!user) return null;
  if (typeof user.id !== "string" || typeof user.username !== "string" || !isAppRole(user.role)) {
    return null;
  }
  return user;
}

function requireRole(req: Request, res: Response, roles: readonly AppRole[]) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }

  if (!roles.includes(user.role)) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return user;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseLimit(value: unknown, fallback = 25) {
  if (typeof value !== "string") return fallback;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(num, 200);
}

function parsePage(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return 1;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return num;
}

function parseListLimit(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return LIST_LIMIT_DEFAULT;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return Math.min(num, LIST_LIMIT_MAX);
}

function parseMapLimit(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return MAP_LIMIT_DEFAULT;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return Math.min(num, MAP_LIMIT_MAX);
}

function parseSearchQuery(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  if (normalized.length > SEARCH_QUERY_MAX_LENGTH) return null;
  return normalized;
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return num;
}

function parseVerificationStatus(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  return VERIFICATION_STATUS_OPTIONS.includes(value as (typeof VERIFICATION_STATUS_OPTIONS)[number]) ? value : null;
}

function parseBooleanFlag(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value !== "string") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseBbox(value: unknown): Bbox | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;

  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) return null;
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return null;
  if (minLng >= maxLng || minLat >= maxLat) return null;

  return { minLng, minLat, maxLng, maxLat };
}

function parseCursor(value: unknown) {
  if (typeof value !== "string") return undefined;
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

function generateMasterId(prefix: string) {
  const millis = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${millis}${rand}`.slice(0, 16);
}

function pgErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  return (error as { code?: string }).code ?? null;
}

async function writeAuditLog(params: {
  entityType: string;
  entityId: string | number;
  action: AuditAction;
  actorName: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
}) {
  await db.insert(auditLog).values({
    entityType: params.entityType,
    entityId: String(params.entityId),
    action: params.action,
    actorName: params.actorName,
    beforeData: (params.beforeData ?? null) as any,
    afterData: (params.afterData ?? null) as any,
    metadata: (params.metadata ?? null) as any,
  });
}

async function listAuditLogs(filter: AuditFilter) {
  const conditions: SQL[] = [];
  if (filter.entityType) conditions.push(eq(auditLog.entityType, filter.entityType));
  if (filter.entityId) conditions.push(eq(auditLog.entityId, filter.entityId));
  if (filter.action) conditions.push(eq(auditLog.action, filter.action));
  if (filter.from) conditions.push(gte(auditLog.createdAt, filter.from));
  if (filter.to) conditions.push(lte(auditLog.createdAt, filter.to));
  if (filter.cursor) conditions.push(lt(auditLog.id, filter.cursor));

  const query = db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(filter.limit + 1);

  const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  const hasMore = rows.length > filter.limit;
  const data = hasMore ? rows.slice(0, filter.limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return { data, nextCursor, hasMore };
}

function buildQualityWarnings(input: {
  candidate: Record<string, string | undefined>;
  wpMatches: Array<Record<string, unknown>>;
  opMatches: Array<Record<string, unknown>>;
}) {
  const warnings: QualityWarning[] = [];
  const { candidate, wpMatches, opMatches } = input;

  if (candidate.nopd && opMatches.some((op) => String(op.nopd) === candidate.nopd)) {
    warnings.push({
      level: "critical",
      code: "DUPLICATE_NOPD",
      message: "NOPD sudah digunakan oleh objek pajak lain",
      relatedIds: opMatches.filter((op) => String(op.nopd) === candidate.nopd).map((op) => Number(op.id)),
    });
  }

  if (candidate.npwpd && wpMatches.some((wp) => String(wp.npwpd || "") === candidate.npwpd)) {
    warnings.push({
      level: "critical",
      code: "DUPLICATE_NPWPD",
      message: "NPWPD sudah digunakan oleh wajib pajak lain",
      relatedIds: wpMatches.filter((wp) => String(wp.npwpd || "") === candidate.npwpd).map((wp) => Number(wp.id)),
    });
  }

  if (candidate.nikKtpWp && wpMatches.some((wp) => String(wp.nikKtpWp || "") === candidate.nikKtpWp)) {
    warnings.push({
      level: "warning",
      code: "DUPLICATE_NIK_WP",
      message: "NIK pemilik ditemukan pada wajib pajak lain",
      relatedIds: wpMatches.filter((wp) => String(wp.nikKtpWp || "") === candidate.nikKtpWp).map((wp) => Number(wp.id)),
    });
  }

  if (candidate.nikPengelola && wpMatches.some((wp) => String(wp.nikPengelola || "") === candidate.nikPengelola)) {
    warnings.push({
      level: "warning",
      code: "DUPLICATE_NIK_PENGELOLA",
      message: "NIK pengelola ditemukan pada wajib pajak lain",
      relatedIds: wpMatches.filter((wp) => String(wp.nikPengelola || "") === candidate.nikPengelola).map((wp) => Number(wp.id)),
    });
  }

  if (candidate.npwpBadanUsaha && wpMatches.some((wp) => String((wp as any).npwpBadanUsaha || "") === candidate.npwpBadanUsaha)) {
    warnings.push({
      level: "warning",
      code: "DUPLICATE_NPWP_BADAN_USAHA",
      message: "NPWP badan usaha ditemukan pada record lain",
      relatedIds: wpMatches.filter((wp) => String((wp as any).npwpBadanUsaha || "") === candidate.npwpBadanUsaha).map((wp) => Number(wp.id)),
    });
  }

  if (candidate.nama && candidate.alamat) {
    const normalizedName = candidate.nama.toLowerCase();
    const normalizedAddr = candidate.alamat.toLowerCase();
    const fuzzyMatches = opMatches.filter((op) => {
      const name = String(op.namaOp || "").toLowerCase();
      const addr = String(op.alamatOp || "").toLowerCase();
      return name.includes(normalizedName) && addr.includes(normalizedAddr);
    });

    if (fuzzyMatches.length > 0) {
      warnings.push({
        level: "info",
        code: "SIMILAR_NAME_ADDRESS",
        message: "Nama + alamat mirip dengan objek pajak yang sudah ada",
        relatedIds: fuzzyMatches.map((op) => Number(op.id)),
      });
    }
  }

  return warnings;
}

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
  app.post("/api/auth/login", async (req, res) => {
    const username = cleanText((req.body as Record<string, unknown>)?.username);
    const password = cleanText((req.body as Record<string, unknown>)?.password);

    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || !verifyPassword(user.password, password)) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const rawRole = (user as { role?: unknown }).role;
    const role: AppRole = isAppRole(rawRole) ? rawRole : "viewer";
    req.session.user = {
      id: user.id,
      username: user.username,
      role,
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role,
      },
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    res.status(204).send();
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({ user });
  });

  app.get("/api/wajib-pajak", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const page = parsePage(req.query.page);
    if (!page) {
      return res.status(400).json({ message: "Query page tidak valid" });
    }

    const limit = parseListLimit(req.query.limit);
    if (!limit) {
      return res.status(400).json({ message: "Query limit tidak valid" });
    }

    const q = parseSearchQuery(req.query.q);
    if (q === null) {
      return res.status(400).json({ message: `Query q harus <= ${SEARCH_QUERY_MAX_LENGTH} karakter` });
    }

    const jenisWp = typeof req.query.jenisWp === "string" ? req.query.jenisWp : undefined;
    if (jenisWp && jenisWp !== "orang_pribadi" && jenisWp !== "badan_usaha") {
      return res.status(400).json({ message: "Query jenisWp tidak valid" });
    }

    const peranWp = typeof req.query.peranWp === "string" ? req.query.peranWp : undefined;
    if (peranWp && peranWp !== "pemilik" && peranWp !== "pengelola") {
      return res.status(400).json({ message: "Query peranWp tidak valid" });
    }

    const statusAktif = typeof req.query.statusAktif === "string" ? req.query.statusAktif : undefined;
    if (statusAktif && statusAktif !== "active" && statusAktif !== "inactive") {
      return res.status(400).json({ message: "Query statusAktif tidak valid" });
    }

    const data = await storage.getWajibPajakPage({
      page,
      limit,
      q,
      jenisWp,
      peranWp,
      statusAktif,
    });
    res.json(data);
  });

  app.post("/api/wajib-pajak", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const normalized = normalizeWpData(req.body);
    const parsed = createWajibPajakSchema.safeParse(normalized);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const actorName = getActorName(req);
    const created = await storage.createWajibPajak(parsed.data);
    await writeAuditLog({
      entityType: "wajib_pajak",
      entityId: created.id,
      action: "create",
      actorName,
      beforeData: null,
      afterData: created,
      metadata: { source: "api" },
    });

    res.status(201).json(created);
  });

  app.patch("/api/wajib-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

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

    const actorName = getActorName(req);
    const updated = await storage.updateWajibPajak(id, payloadToUpdate);
    await writeAuditLog({
      entityType: "wajib_pajak",
      entityId: id,
      action: "update",
      actorName,
      beforeData: existing,
      afterData: updated,
      metadata: { source: "api" },
    });

    res.json(updated);
  });

  app.delete("/api/wajib-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    const existing = await storage.getWajibPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Wajib Pajak tidak ditemukan" });
    }

    await storage.deleteWajibPajak(id);
    await writeAuditLog({
      entityType: "wajib_pajak",
      entityId: id,
      action: "delete",
      actorName: getActorName(req),
      beforeData: existing,
      afterData: null,
      metadata: { source: "api" },
    });

    res.status(204).send();
  });

  app.get("/api/wajib-pajak/export", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

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
    if (!requireRole(req, res, ["admin", "editor"])) return;

    try {
      if (!req.file) {
        return res.status(400).json({ message: "File CSV diperlukan" });
      }

      const actorName = getActorName(req);
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
          const created = await storage.createWajibPajak(parsed.data);
          await writeAuditLog({
            entityType: "wajib_pajak",
            entityId: created.id,
            action: "create",
            actorName,
            beforeData: null,
            afterData: created,
            metadata: { source: "csv-import", row: i + 2 },
          });
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
    if (!requireRole(_req, res, APP_ROLE_OPTIONS)) return;

    const data = await storage.getAllMasterKecamatan();
    res.json(data);
  });

  app.post("/api/master/kecamatan", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = masterKecamatanPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const payload = parsed.data;
    const cpmKecId = payload.cpmKecId ?? generateMasterId("KEC");

    try {
      const [created] = await db
        .insert(masterKecamatan)
        .values({
          cpmKecId,
          cpmKecamatan: payload.cpmKecamatan,
          cpmKodeKec: payload.cpmKodeKec,
        })
        .returning();

      await writeAuditLog({
        entityType: "master_kecamatan",
        entityId: created.cpmKecId,
        action: "create",
        actorName: getActorName(req),
        beforeData: null,
        afterData: created,
        metadata: { source: "api" },
      });

      res.status(201).json(created);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode kecamatan atau ID sudah terdaftar" });
      }
      throw error;
    }
  });

  app.patch("/api/master/kecamatan/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = req.params.id;
    const parsed = masterKecamatanPayloadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const beforeRows = await db.select().from(masterKecamatan).where(eq(masterKecamatan.cpmKecId, id)).limit(1);
    if (beforeRows.length === 0) {
      return res.status(404).json({ message: "Kecamatan tidak ditemukan" });
    }

    const payload = parsed.data;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "Payload update kosong" });
    }

    const before = beforeRows[0];
    if (payload.cpmKodeKec && payload.cpmKodeKec !== before.cpmKodeKec) {
      const [linkedKelurahan] = await db
        .select({ id: masterKelurahan.cpmKelId })
        .from(masterKelurahan)
        .where(eq(masterKelurahan.cpmKodeKec, before.cpmKodeKec))
        .limit(1);
      if (linkedKelurahan) {
        return res.status(409).json({ message: "Kode kecamatan tidak dapat diubah karena sudah dipakai kelurahan" });
      }
    }

    try {
      const [updated] = await db
        .update(masterKecamatan)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(masterKecamatan.cpmKecId, id))
        .returning();

      await writeAuditLog({
        entityType: "master_kecamatan",
        entityId: id,
        action: "update",
        actorName: getActorName(req),
        beforeData: before,
        afterData: updated,
        metadata: { source: "api" },
      });

      res.json(updated);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode kecamatan sudah digunakan" });
      }
      throw error;
    }
  });

  app.delete("/api/master/kecamatan/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = req.params.id;
    const rows = await db.select().from(masterKecamatan).where(eq(masterKecamatan.cpmKecId, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kecamatan tidak ditemukan" });
    }

    const existing = rows[0];
    const [linkedOp] = await db
      .select({ id: objekPajak.id })
      .from(objekPajak)
      .where(eq(objekPajak.kecamatanId, id))
      .limit(1);
    if (linkedOp) {
      return res.status(409).json({ message: "Kecamatan tidak dapat dihapus karena masih direferensikan OP" });
    }

    const [linkedKel] = await db
      .select({ id: masterKelurahan.cpmKelId })
      .from(masterKelurahan)
      .where(eq(masterKelurahan.cpmKodeKec, existing.cpmKodeKec))
      .limit(1);
    if (linkedKel) {
      return res.status(409).json({ message: "Kecamatan tidak dapat dihapus karena masih memiliki kelurahan" });
    }

    await db.delete(masterKecamatan).where(eq(masterKecamatan.cpmKecId, id));
    await writeAuditLog({
      entityType: "master_kecamatan",
      entityId: id,
      action: "delete",
      actorName: getActorName(req),
      beforeData: existing,
      afterData: null,
      metadata: { source: "api" },
    });

    res.status(204).send();
  });

  app.get("/api/master/kelurahan", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const kecamatanId = typeof req.query.kecamatanId === "string" ? req.query.kecamatanId : undefined;
    const data = await storage.getMasterKelurahan(kecamatanId);
    res.json(data);
  });

  app.post("/api/master/kelurahan", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = masterKelurahanPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const payload = parsed.data;
    const [kecamatanExists] = await db
      .select({ id: masterKecamatan.cpmKecId })
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKodeKec, payload.cpmKodeKec))
      .limit(1);

    if (!kecamatanExists) {
      return res.status(400).json({ message: "Kode kecamatan tidak valid" });
    }

    try {
      const cpmKelId = payload.cpmKelId ?? generateMasterId("KEL");
      const [created] = await db
        .insert(masterKelurahan)
        .values({
          cpmKelId,
          cpmKelurahan: payload.cpmKelurahan,
          cpmKodeKec: payload.cpmKodeKec,
          cpmKodeKel: payload.cpmKodeKel,
        })
        .returning();

      await writeAuditLog({
        entityType: "master_kelurahan",
        entityId: created.cpmKelId,
        action: "create",
        actorName: getActorName(req),
        beforeData: null,
        afterData: created,
        metadata: { source: "api" },
      });

      res.status(201).json(created);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode kelurahan pada kecamatan ini sudah digunakan" });
      }
      throw error;
    }
  });

  app.patch("/api/master/kelurahan/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = req.params.id;
    const parsed = masterKelurahanPayloadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const payload = parsed.data;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "Payload update kosong" });
    }

    const rows = await db.select().from(masterKelurahan).where(eq(masterKelurahan.cpmKelId, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kelurahan tidak ditemukan" });
    }

    if (payload.cpmKodeKec) {
      const [kecamatanExists] = await db
        .select({ id: masterKecamatan.cpmKecId })
        .from(masterKecamatan)
        .where(eq(masterKecamatan.cpmKodeKec, payload.cpmKodeKec))
        .limit(1);
      if (!kecamatanExists) {
        return res.status(400).json({ message: "Kode kecamatan tidak valid" });
      }
    }

    try {
      const [updated] = await db
        .update(masterKelurahan)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(masterKelurahan.cpmKelId, id))
        .returning();

      await writeAuditLog({
        entityType: "master_kelurahan",
        entityId: id,
        action: "update",
        actorName: getActorName(req),
        beforeData: rows[0],
        afterData: updated,
        metadata: { source: "api" },
      });

      res.json(updated);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode kelurahan pada kecamatan ini sudah digunakan" });
      }
      throw error;
    }
  });

  app.delete("/api/master/kelurahan/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = req.params.id;
    const rows = await db.select().from(masterKelurahan).where(eq(masterKelurahan.cpmKelId, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Kelurahan tidak ditemukan" });
    }

    const [linkedOp] = await db
      .select({ id: objekPajak.id })
      .from(objekPajak)
      .where(eq(objekPajak.kelurahanId, id))
      .limit(1);
    if (linkedOp) {
      return res.status(409).json({ message: "Kelurahan tidak dapat dihapus karena masih direferensikan OP" });
    }

    await db.delete(masterKelurahan).where(eq(masterKelurahan.cpmKelId, id));
    await writeAuditLog({
      entityType: "master_kelurahan",
      entityId: id,
      action: "delete",
      actorName: getActorName(req),
      beforeData: rows[0],
      afterData: null,
      metadata: { source: "api" },
    });

    res.status(204).send();
  });

  app.get("/api/master/rekening-pajak", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const includeInactive = typeof req.query.includeInactive === "string" && req.query.includeInactive === "true";
    const data = includeInactive
      ? await db.select().from(masterRekeningPajak).orderBy(asc(masterRekeningPajak.kodeRekening))
      : await storage.getAllMasterRekeningPajak();
    res.json(data);
  });

  app.post("/api/master/rekening-pajak", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = masterRekeningPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    try {
      const [created] = await db
        .insert(masterRekeningPajak)
        .values({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .returning();

      await writeAuditLog({
        entityType: "master_rekening_pajak",
        entityId: created.id,
        action: "create",
        actorName: getActorName(req),
        beforeData: null,
        afterData: created,
        metadata: { source: "api" },
      });

      res.status(201).json(created);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode rekening sudah terdaftar" });
      }
      throw error;
    }
  });

  app.patch("/api/master/rekening-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID rekening tidak valid" });
    }

    const parsed = masterRekeningPayloadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const payload = parsed.data;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "Payload update kosong" });
    }

    const rows = await db.select().from(masterRekeningPajak).where(eq(masterRekeningPajak.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Rekening pajak tidak ditemukan" });
    }

    try {
      const [updated] = await db
        .update(masterRekeningPajak)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(masterRekeningPajak.id, id))
        .returning();

      await writeAuditLog({
        entityType: "master_rekening_pajak",
        entityId: id,
        action: "update",
        actorName: getActorName(req),
        beforeData: rows[0],
        afterData: updated,
        metadata: { source: "api" },
      });

      res.json(updated);
    } catch (error) {
      if (pgErrorCode(error) === "23505") {
        return res.status(409).json({ message: "Kode rekening sudah terdaftar" });
      }
      throw error;
    }
  });

  app.delete("/api/master/rekening-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID rekening tidak valid" });
    }

    const rows = await db.select().from(masterRekeningPajak).where(eq(masterRekeningPajak.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Rekening pajak tidak ditemukan" });
    }

    const [linkedOp] = await db
      .select({ id: objekPajak.id })
      .from(objekPajak)
      .where(eq(objekPajak.rekPajakId, id))
      .limit(1);
    if (linkedOp) {
      return res.status(409).json({ message: "Rekening pajak tidak dapat dihapus karena masih direferensikan OP" });
    }

    await db.delete(masterRekeningPajak).where(eq(masterRekeningPajak.id, id));
    await writeAuditLog({
      entityType: "master_rekening_pajak",
      entityId: id,
      action: "delete",
      actorName: getActorName(req),
      beforeData: rows[0],
      afterData: null,
      metadata: { source: "api" },
    });

    res.status(204).send();
  });

  app.get("/api/audit-log", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const fromRaw = typeof req.query.from === "string" ? req.query.from : undefined;
    const toRaw = typeof req.query.to === "string" ? req.query.to : undefined;
    const from = parseDate(fromRaw);
    const to = parseDate(toRaw);

    if (fromRaw && !from) {
      return res.status(400).json({ message: "Format query 'from' tidak valid" });
    }

    if (toRaw && !to) {
      return res.status(400).json({ message: "Format query 'to' tidak valid" });
    }

    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const limit = parseLimit(req.query.limit, 25);
    const cursor = parseCursor(req.query.cursor);

    const result = await listAuditLogs({ entityType, entityId, action, from, to, limit, cursor });
    res.json(result);
  });

  app.post("/api/quality/check", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const parsed = qualityCheckInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const candidate = parsed.data;
    const wpRows = await db
      .select({
        id: wajibPajak.id,
        npwpd: wajibPajak.npwpd,
        nikKtpWp: wajibPajak.nikKtpWp,
        nikPengelola: wajibPajak.nikPengelola,
        npwpBadanUsaha: wpBadanUsaha.npwpBadanUsaha,
      })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId));
    const opRows = await db
      .select({
        id: objekPajak.id,
        nopd: objekPajak.nopd,
        namaOp: objekPajak.namaOp,
        alamatOp: objekPajak.alamatOp,
      })
      .from(objekPajak);

    const wpMatches = wpRows.filter((row) => {
      if (candidate.npwpd && row.npwpd === candidate.npwpd) return true;
      if (candidate.nikKtpWp && row.nikKtpWp === candidate.nikKtpWp) return true;
      if (candidate.nikPengelola && row.nikPengelola === candidate.nikPengelola) return true;
      if (candidate.npwpBadanUsaha && row.npwpBadanUsaha === candidate.npwpBadanUsaha) return true;
      return false;
    });

    const opMatches = opRows.filter((row) => {
      if (candidate.nopd && row.nopd === candidate.nopd) return true;
      if (candidate.nama && String(row.namaOp || "").toLowerCase().includes(candidate.nama.toLowerCase())) return true;
      if (candidate.alamat && String(row.alamatOp || "").toLowerCase().includes(candidate.alamat.toLowerCase())) return true;
      return false;
    });

    const warnings = buildQualityWarnings({
      candidate,
      wpMatches: wpMatches as Array<Record<string, unknown>>,
      opMatches: opMatches as Array<Record<string, unknown>>,
    });

    res.json({ warnings });
  });

  app.get("/api/quality/report", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const wpRows = await db
      .select({
        id: wajibPajak.id,
        npwpd: wajibPajak.npwpd,
        nikKtpWp: wajibPajak.nikKtpWp,
        nikPengelola: wajibPajak.nikPengelola,
        npwpBadanUsaha: wpBadanUsaha.npwpBadanUsaha,
      })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId));
    const opRows = await db
      .select({
        id: objekPajak.id,
        nopd: objekPajak.nopd,
        wpId: objekPajak.wpId,
        rekPajakId: objekPajak.rekPajakId,
        namaOp: objekPajak.namaOp,
        alamatOp: objekPajak.alamatOp,
        latitude: objekPajak.latitude,
        longitude: objekPajak.longitude,
      })
      .from(objekPajak);

    const countDuplicates = (values: Array<string | null | undefined>) => {
      const map = new Map<string, number>();
      for (const value of values) {
        const key = String(value ?? "").trim();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.values()).filter((count) => count > 1).length;
    };

    const invalidGeoRows = opRows.filter((row) => {
      const lat = row.latitude === null || row.latitude === undefined ? null : Number(row.latitude);
      const lng = row.longitude === null || row.longitude === undefined ? null : Number(row.longitude);
      if (lat === null || lng === null) return false;
      return lat < -90 || lat > 90 || lng < -180 || lng > 180;
    });

    const missingCriticalRows = opRows.filter((row) => {
      const nama = String(row.namaOp ?? "").trim();
      const alamat = String(row.alamatOp ?? "").trim();
      return !row.wpId || !row.rekPajakId || nama.length === 0 || alamat.length === 0;
    });

    res.json({
      generatedAt: new Date().toISOString(),
      totals: {
        wajibPajak: wpRows.length,
        objekPajak: opRows.length,
      },
      duplicateIndicators: {
        npwpd: countDuplicates(wpRows.map((row) => row.npwpd)),
        nopd: countDuplicates(opRows.map((row) => row.nopd)),
        nikKtpWp: countDuplicates(wpRows.map((row) => row.nikKtpWp)),
        nikPengelola: countDuplicates(wpRows.map((row) => row.nikPengelola)),
        npwpBadanUsaha: countDuplicates(wpRows.map((row) => row.npwpBadanUsaha)),
      },
      missingCriticalFields: {
        count: missingCriticalRows.length,
        relatedIds: missingCriticalRows.map((row) => row.id),
      },
      invalidGeoRange: {
        count: invalidGeoRows.length,
        relatedIds: invalidGeoRows.map((row) => row.id),
      },
    });
  });

  app.get("/api/objek-pajak", async (req, res) => {
    const page = parsePage(req.query.page);
    if (!page) {
      return res.status(400).json({ message: "Query page tidak valid" });
    }

    const limit = parseListLimit(req.query.limit);
    if (!limit) {
      return res.status(400).json({ message: "Query limit tidak valid" });
    }

    const q = parseSearchQuery(req.query.q);
    if (q === null) {
      return res.status(400).json({ message: `Query q harus <= ${SEARCH_QUERY_MAX_LENGTH} karakter` });
    }

    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && status !== "active" && status !== "inactive") {
      return res.status(400).json({ message: "status tidak valid" });
    }

    const kecamatanId = typeof req.query.kecamatanId === "string" ? req.query.kecamatanId : undefined;
    const rekPajakId = parseOptionalNumber(req.query.rekPajakId);
    if (rekPajakId === null) {
      return res.status(400).json({ message: "rekPajakId tidak valid" });
    }

    const statusVerifikasi = parseVerificationStatus(req.query.statusVerifikasi);
    if (statusVerifikasi === null) {
      return res.status(400).json({ message: "statusVerifikasi tidak valid" });
    }

    const includeUnverified = parseBooleanFlag(req.query.includeUnverified);
    if (includeUnverified === null) {
      return res.status(400).json({ message: "includeUnverified harus true/false" });
    }

    const requiresInternalAccess = includeUnverified || (statusVerifikasi ? statusVerifikasi !== "verified" : false);
    if (requiresInternalAccess && !requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const effectiveStatusVerifikasi = statusVerifikasi ?? (includeUnverified ? undefined : "verified");

    const data = await storage.getObjekPajakPage({
      page,
      limit,
      q,
      status,
      statusVerifikasi: effectiveStatusVerifikasi,
      kecamatanId,
      rekPajakId: rekPajakId ?? undefined,
    });

    res.json(data);
  });

  app.get("/api/objek-pajak/map", async (req, res) => {
    const bbox = parseBbox(req.query.bbox);
    if (!bbox) {
      return res.status(400).json({ message: "bbox tidak valid. Gunakan format minLng,minLat,maxLng,maxLat" });
    }

    const zoomRaw = req.query.zoom;
    if (zoomRaw !== undefined && zoomRaw !== null && zoomRaw !== "") {
      const zoom = Number(zoomRaw);
      if (!Number.isFinite(zoom) || zoom < 0 || zoom > 24) {
        return res.status(400).json({ message: "zoom tidak valid" });
      }
    }

    const limit = parseMapLimit(req.query.limit);
    if (!limit) {
      return res.status(400).json({ message: "limit tidak valid" });
    }

    const q = parseSearchQuery(req.query.q);
    if (q === null) {
      return res.status(400).json({ message: `Query q harus <= ${SEARCH_QUERY_MAX_LENGTH} karakter` });
    }

    const kecamatanId = typeof req.query.kecamatanId === "string" ? req.query.kecamatanId : undefined;
    const rekPajakId = parseOptionalNumber(req.query.rekPajakId);
    if (rekPajakId === null) {
      return res.status(400).json({ message: "rekPajakId tidak valid" });
    }

    const statusVerifikasi = parseVerificationStatus(req.query.statusVerifikasi);
    if (statusVerifikasi === null) {
      return res.status(400).json({ message: "statusVerifikasi tidak valid" });
    }

    const includeUnverified = parseBooleanFlag(req.query.includeUnverified);
    if (includeUnverified === null) {
      return res.status(400).json({ message: "includeUnverified harus true/false" });
    }

    const requiresInternalAccess = includeUnverified || (statusVerifikasi ? statusVerifikasi !== "verified" : false);
    if (requiresInternalAccess && !requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const effectiveStatusVerifikasi = statusVerifikasi ?? (includeUnverified ? undefined : "verified");

    const result = await storage.getObjekPajakMap({
      ...bbox,
      q,
      kecamatanId,
      rekPajakId: rekPajakId ?? undefined,
      statusVerifikasi: effectiveStatusVerifikasi,
      limit,
    });

    res.json({
      items: result.items,
      meta: {
        totalInView: result.totalInView,
        isCapped: result.isCapped,
      },
    });
  });

  app.get("/api/objek-pajak/export", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

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
    if (!requireRole(req, res, ["admin", "editor"])) return;

    try {
      if (!req.file) {
        return res.status(400).json({ message: "File CSV diperlukan" });
      }

      const actorName = getActorName(req);
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

          const created = await storage.createObjekPajak({
            ...parsed.data,
            statusVerifikasi: "draft",
            catatanVerifikasi: null,
            verifiedAt: null,
            verifiedBy: null,
            detailPajak: detailParsed.data,
          });
          await writeAuditLog({
            entityType: "objek_pajak",
            entityId: created.id,
            action: "create",
            actorName,
            beforeData: null,
            afterData: created,
            metadata: { source: "csv-import", row: i + 2 },
          });
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

  app.patch("/api/objek-pajak/:id/verification", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID objek pajak tidak valid" });
    }

    const existing = await storage.getObjekPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }

    const parsed = objekPajakVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const actorName = parsed.data.verifierName?.trim() || getActorName(req);
    const now = new Date();
    const verificationPatch =
      parsed.data.statusVerifikasi === "verified"
        ? {
            statusVerifikasi: "verified" as const,
            catatanVerifikasi: null,
            verifiedAt: now,
            verifiedBy: actorName,
            updatedAt: now,
          }
        : parsed.data.statusVerifikasi === "rejected"
          ? {
              statusVerifikasi: "rejected" as const,
              catatanVerifikasi: parsed.data.catatanVerifikasi?.trim() || null,
              verifiedAt: null,
              verifiedBy: actorName,
              updatedAt: now,
            }
          : {
              statusVerifikasi: "draft" as const,
              catatanVerifikasi: null,
              verifiedAt: null,
              verifiedBy: null,
              updatedAt: now,
            };

    await db.update(objekPajak).set(verificationPatch).where(eq(objekPajak.id, id));
    const updated = await storage.getObjekPajak(id);
    if (!updated) {
      return res.status(500).json({ message: "Gagal memuat data OP setelah verifikasi" });
    }

    await writeAuditLog({
      entityType: "objek_pajak",
      entityId: id,
      action: parsed.data.statusVerifikasi === "rejected" ? "reject" : "verify",
      actorName,
      beforeData: existing,
      afterData: updated,
      metadata: { source: "api", statusVerifikasi: parsed.data.statusVerifikasi },
    });

    res.json(updated);
  });

  app.get("/api/objek-pajak/:id", async (req, res) => {
    const op = await storage.getObjekPajak(Number.parseInt(req.params.id, 10));
    if (!op) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }

    if (op.statusVerifikasi !== "verified" && !requireRole(req, res, APP_ROLE_OPTIONS)) return;

    res.json(op);
  });

  app.post("/api/objek-pajak", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

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

    const created = await storage.createObjekPajak({
      ...parsed.data,
      statusVerifikasi: "draft",
      catatanVerifikasi: null,
      verifiedAt: null,
      verifiedBy: null,
      detailPajak: detailParsed.data,
    });
    await writeAuditLog({
      entityType: "objek_pajak",
      entityId: created.id,
      action: "create",
      actorName: getActorName(req),
      beforeData: null,
      afterData: created,
      metadata: { source: "api" },
    });
    res.status(201).json(created);
  });

  app.patch("/api/objek-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

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

    delete (parsed.data as Record<string, unknown>).statusVerifikasi;
    delete (parsed.data as Record<string, unknown>).catatanVerifikasi;
    delete (parsed.data as Record<string, unknown>).verifiedAt;
    delete (parsed.data as Record<string, unknown>).verifiedBy;

    const updated = await storage.updateObjekPajak(id, parsed.data);
    await writeAuditLog({
      entityType: "objek_pajak",
      entityId: id,
      action: "update",
      actorName: getActorName(req),
      beforeData: existing,
      afterData: updated,
      metadata: { source: "api" },
    });
    res.json(updated);
  });

  app.delete("/api/objek-pajak/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    const existing = await storage.getObjekPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }

    await storage.deleteObjekPajak(id);
    await writeAuditLog({
      entityType: "objek_pajak",
      entityId: id,
      action: "delete",
      actorName: getActorName(req),
      beforeData: existing,
      afterData: null,
      metadata: { source: "api" },
    });
    res.status(204).send();
  });

  return httpServer;
}
