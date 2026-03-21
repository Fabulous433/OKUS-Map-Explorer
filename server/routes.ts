import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, asc, desc, eq, gte, ilike, inArray, lte, lt, or, sql, type SQL } from "drizzle-orm";
import { db, ensureDatabaseConnection, storage } from "./storage";
import { env } from "./env";
import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
  entityAttachmentUploadMetadataSchema,
  OP_ATTACHMENT_TYPES,
  WP_ATTACHMENT_TYPES,
} from "@shared/attachments";
import {
  auditLog,
  createWajibPajakSchema,
  entityAttachment,
  insertObjekPajakSchema,
  JENIS_PAJAK_OPTIONS,
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
  users,
  validateDetailByJenis,
  wajibPajak,
  wajibPajakResolvedSchema,
  wpBadanUsaha,
  type WajibPajakWithBadanUsaha,
  type WpBadanUsahaInput,
} from "@shared/schema";
import { activeRegionDesaQuerySchema } from "@shared/region-boundary";
import {
  regionBoundaryDraftFeatureSchema,
  regionBoundaryFragmentAssignmentPayloadSchema,
  regionBoundaryPublishPayloadSchema,
  regionBoundaryTakeoverConfirmationPayloadSchema,
} from "@shared/region-boundary-admin";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import multer, { MulterError } from "multer";
import { ZodError, type ZodIssue } from "zod";
import { APP_ROLE_OPTIONS, hashPassword, isAppRole, PASSWORD_POLICY, validatePasswordPolicy, verifyPassword, type AppRole, type SessionUser } from "./auth";
import { LoginSecurityService, resolveLoginClientId } from "./auth-security";
import {
  analyzeDraftBoundaryTopology,
  assignDraftTopologyFragment,
  confirmDraftTakeover,
  getDraftTopologyByKecamatan,
  getDesaDraftByKecamatan,
  listBoundaryRevisions,
  previewDraftImpact,
  publishDraftRevision,
  resetDraftBoundaryFeature,
  rollbackPublishedRevision,
  saveDraftBoundaryFeature,
} from "./boundary-editor-storage";
import { buildAttachmentDownloadPath, deleteAttachmentFile, ensureAttachmentStorageRoot, saveAttachmentBuffer } from "./file-storage";
import { getActiveRegionBoundary } from "./region-boundaries";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: ATTACHMENT_MAX_FILE_SIZE_BYTES } });

type CsvImportRow = Record<string, string | undefined>;

const WP_CSV_COLUMNS = [
  "jenis_wp",
  "peran_wp",
  "npwpd",
  "status_aktif",
  "nama_subjek",
  "nik_subjek",
  "alamat_subjek",
  "kecamatan_subjek",
  "kelurahan_subjek",
  "telepon_wa_subjek",
  "email_subjek",
  "lampiran",
  "nama_badan_usaha",
  "npwp_badan_usaha",
  "alamat_badan_usaha",
  "kecamatan_badan_usaha",
  "kelurahan_badan_usaha",
  "telepon_badan_usaha",
  "email_badan_usaha",
] as const;

const OP_CSV_BASE_COLUMNS = [
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
  "lampiran",
] as const;

const OP_CSV_DETAIL_COLUMNS = [
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
  "detail_ukuran_panjang",
  "detail_ukuran_lebar",
  "detail_ukuran_tinggi",
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

const OP_CSV_COLUMNS = [...OP_CSV_BASE_COLUMNS, ...OP_CSV_DETAIL_COLUMNS] as const;

const OP_OPERATIONAL_DETAIL_COLUMNS_BY_JENIS: Record<JenisPajakOption, readonly string[]> = {
  "PBJT Makanan dan Minuman": [
    "detail_jenis_usaha",
    "detail_kapasitas_tempat",
    "detail_jumlah_karyawan",
    "detail_rata2_pengunjung",
    "detail_jam_buka",
    "detail_jam_tutup",
    "detail_harga_termurah",
    "detail_harga_termahal",
    "detail_klasifikasi",
  ],
  "PBJT Jasa Perhotelan": [
    "detail_jenis_usaha",
    "detail_jumlah_kamar",
    "detail_klasifikasi",
    "detail_fasilitas",
    "detail_rata2_pengunjung_harian",
  ],
  "PBJT Jasa Parkir": [
    "detail_jenis_usaha",
    "detail_jenis_lokasi",
    "detail_kapasitas_kendaraan",
    "detail_tarif_parkir",
  ],
  "PBJT Jasa Kesenian dan Hiburan": [
    "detail_jenis_hiburan",
    "detail_kapasitas",
    "detail_jam_operasional",
  ],
  "PBJT Tenaga Listrik": [
    "detail_jenis_tenaga_listrik",
    "detail_daya_listrik",
  ],
  "Pajak Reklame": [
    "detail_jenis_reklame",
    "detail_ukuran_panjang",
    "detail_ukuran_lebar",
    "detail_ukuran_tinggi",
    "detail_judul_reklame",
    "detail_masa_berlaku",
    "detail_status_reklame",
    "detail_nama_biro_jasa",
  ],
  "Pajak Air Tanah": [
    "detail_jenis_air_tanah",
    "detail_rata2_ukuran_pemakaian",
    "detail_kriteria_air_tanah",
    "detail_kelompok_usaha",
  ],
  "Pajak Sarang Burung Walet": [
    "detail_jenis_burung_walet",
    "detail_panen_per_tahun",
    "detail_rata2_berat_panen",
  ],
  "Pajak MBLB": [],
};

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "verify"
  | "reject"
  | "ATTACHMENT_UPLOAD"
  | "ATTACHMENT_DELETE";

type AuditFilter = {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit: number;
  cursor?: number;
};

type QualityWarningDuplicate = {
  id: number;
  displayName: string;
  npwpd?: string | null;
  nikKtpWp?: string | null;
  nikPengelola?: string | null;
  npwpBadanUsaha?: string | null;
  matchedField?: "npwpd" | "nikKtpWp" | "nikPengelola" | "npwpBadanUsaha";
};

type QualityWarning = {
  level: "info" | "warning" | "critical";
  code: string;
  message: string;
  relatedIds: Array<string | number>;
  duplicates?: QualityWarningDuplicate[];
};

type ValidationFieldError = {
  field: string;
  message: string;
};

const INVALID_NOPD_MESSAGE = "Format NOPD salah, mohon diperiksa kembali";

type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type DashboardGroupBy = "day" | "week";

type DashboardTrendPoint = {
  periodStart: string;
  periodEnd: string;
  createdOp: number;
  verifiedOp: number;
};

type DashboardSummaryData = {
  generatedAt: string;
  includeUnverified: boolean;
  filters: {
    summaryWindow: { from: string | null; to: string | null };
    trendWindow: { from: string; to: string; groupBy: DashboardGroupBy };
  };
  totals: {
    totalWp: number;
    validWp: number;
    pendingWp: number;
    totalOp: number;
    totalUpdated: number;
    totalPending: number;
    overallPercentage: number;
  };
  byJenis: Array<{
    jenisPajak: string;
    total: number;
    updated: number;
    pending: number;
    percentage: number;
  }>;
  trend: DashboardTrendPoint[];
};

const VERIFICATION_STATUS_OPTIONS = ["draft", "verified", "rejected"] as const;
const LIST_LIMIT_DEFAULT = 25;
const LIST_LIMIT_MAX = 100;
const MAP_LIMIT_DEFAULT = 500;
const MAP_LIMIT_MAX = 1000;
const SEARCH_QUERY_MAX_LENGTH = 100;
const REVALIDATE_CACHE_HEADER = "private, max-age=0, must-revalidate";
const DASHBOARD_TREND_DEFAULT_DAYS = 30;

const loginSecurity = new LoginSecurityService({
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  maxRequestsPerWindow: env.AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS,
  lockoutThreshold: env.AUTH_LOGIN_LOCKOUT_THRESHOLD,
  lockoutMs: env.AUTH_LOGIN_LOCKOUT_MS,
});

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

function normalizeAttachmentUploadError(error: unknown) {
  if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
    return { status: 400, message: "Ukuran file melebihi batas 5 MB" };
  }

  if (error instanceof ZodError) {
    return { status: 400, message: "Metadata attachment tidak valid" };
  }

  if (error instanceof Error) {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: "File gagal diunggah. Silakan coba lagi." };
}

function validateAttachmentDocumentType(
  entityType: "wajib_pajak" | "objek_pajak",
  documentType: string,
) {
  const allowed: readonly string[] = entityType === "wajib_pajak" ? WP_ATTACHMENT_TYPES : OP_ATTACHMENT_TYPES;
  return allowed.includes(documentType);
}

async function assertAttachmentEntityExists(entityType: "wajib_pajak" | "objek_pajak", entityId: number) {
  if (entityType === "wajib_pajak") {
    const wp = await storage.getWajibPajak(entityId);
    if (!wp) {
      throw new Error("Wajib Pajak tidak ditemukan");
    }
    return wp;
  }

  const op = await storage.getObjekPajak(entityId);
  if (!op) {
    throw new Error("Objek Pajak tidak ditemukan");
  }
  return op;
}

function toAttachmentResponse(row: {
  id: string;
  entityType: string;
  entityId: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  uploadedAt: Date;
  uploadedBy: string;
  notes?: string | null;
}) {
  return {
    ...row,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

async function runSingleFileUpload(req: Request, res: Response) {
  await new Promise<void>((resolve, reject) => {
    upload.single("file")(req as any, res as any, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseDashboardDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(Date.UTC(year, monthIndex, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDay(value: Date) {
  const end = startOfUtcDay(value);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function startOfUtcWeek(value: Date) {
  const start = startOfUtcDay(value);
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as week start
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function formatDashboardTrendRange(rawFrom: Date | undefined, rawTo: Date | undefined, groupBy: DashboardGroupBy) {
  const now = new Date();
  const defaultTo = startOfUtcDay(now);
  const defaultFrom = addUtcDays(defaultTo, -(DASHBOARD_TREND_DEFAULT_DAYS - 1));

  let from = rawFrom ? startOfUtcDay(rawFrom) : defaultFrom;
  let to = rawTo ? startOfUtcDay(rawTo) : defaultTo;

  if (from > to) {
    const copy = from;
    from = to;
    to = copy;
  }

  if (groupBy === "week") {
    from = startOfUtcWeek(from);
    to = startOfUtcWeek(to);
  }

  return { from, to };
}

function buildTrendTimeline(from: Date, to: Date, groupBy: DashboardGroupBy) {
  const points: DashboardTrendPoint[] = [];
  const stepDays = groupBy === "week" ? 7 : 1;

  for (let cursor = new Date(from); cursor <= to; cursor = addUtcDays(cursor, stepDays)) {
    const periodStart = toIsoDate(cursor);
    const periodEnd = toIsoDate(addUtcDays(cursor, stepDays - 1));
    points.push({
      periodStart,
      periodEnd,
      createdOp: 0,
      verifiedOp: 0,
    });
  }

  return points;
}

function parseDashboardGroupBy(value: unknown): DashboardGroupBy | null {
  if (value === undefined || value === null || value === "") return "day";
  if (value === "day" || value === "week") return value;
  return null;
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

function normalizeEtagToken(value: string) {
  let token = value.trim();
  if (token.startsWith("W/")) {
    token = token.slice(2).trim();
  }
  if (token.startsWith("\"") && token.endsWith("\"") && token.length >= 2) {
    token = token.slice(1, -1);
  }
  return token;
}

function buildWeakEtag(payload: unknown) {
  const digest = createHash("sha1").update(JSON.stringify(payload)).digest("base64url");
  return `W/"${digest}"`;
}

function isEtagMatch(ifNoneMatchRaw: string | undefined, etag: string) {
  if (!ifNoneMatchRaw) return false;
  const incoming = ifNoneMatchRaw.trim();
  if (incoming === "*") return true;

  const target = normalizeEtagToken(etag);
  return incoming
    .split(",")
    .map((item) => normalizeEtagToken(item))
    .some((item) => item.length > 0 && item === target);
}

function sendJsonWithEtag(
  req: Request,
  res: Response,
  payload: unknown,
  options?: {
    etagPayload?: unknown;
  },
) {
  const etag = buildWeakEtag(options?.etagPayload ?? payload);
  res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
  res.setHeader("ETag", etag);

  if (isEtagMatch(req.header("if-none-match") ?? undefined, etag)) {
    return res.status(304).end();
  }

  return res.json(payload);
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

function formatFieldLabel(rawField: string) {
  const labels: Record<string, string> = {
    nopd: "NOPD",
    wpId: "Wajib Pajak",
    rekPajakId: "Rekening pajak",
    namaOp: "Nama objek pajak",
    alamatOp: "Alamat objek pajak",
    kecamatanId: "Kecamatan",
    kelurahanId: "Kelurahan",
    omsetBulanan: "Omset bulanan",
    tarifPersen: "Tarif persen",
    pajakBulanan: "Pajak bulanan",
    latitude: "Latitude",
    longitude: "Longitude",
    jenisUsaha: "Jenis usaha",
    kapasitasTempat: "Kapasitas tempat",
    jumlahKaryawan: "Jumlah karyawan",
    rata2Pengunjung: "Rata-rata pengunjung",
    jumlahKamar: "Jumlah kamar",
    klasifikasi: "Klasifikasi",
    tarifParkir: "Tarif parkir",
    kapasitasKendaraan: "Kapasitas kendaraan",
    jenisLokasi: "Jenis lokasi",
    jenisReklame: "Jenis reklame",
    ukuranPanjang: "Ukuran panjang",
    ukuranLebar: "Ukuran lebar",
    ukuranTinggi: "Ukuran tinggi",
    jenisHiburan: "Jenis hiburan",
    kapasitas: "Kapasitas",
    dayaListrik: "Daya listrik",
    jenisTenagaListrik: "Jenis tenaga listrik",
    jenisAirTanah: "Jenis air tanah",
    rata2UkuranPemakaian: "Rata-rata ukuran pemakaian",
    jenisBurungWalet: "Jenis burung walet",
    panenPerTahun: "Panen per tahun",
    rata2BeratPanen: "Rata-rata berat panen",
  };

  return labels[rawField] ?? rawField;
}

function buildFieldPath(path: Array<string | number>) {
  return path
    .map((segment) => String(segment))
    .filter((segment) => segment.length > 0)
    .join(".");
}

function buildFriendlyIssueMessage(issue: ZodIssue) {
  const field = String(issue.path[issue.path.length - 1] ?? "");
  const fieldLabel = formatFieldLabel(field);
  const numericMessages: Record<string, string> = {
    tarifParkir: "Tarif parkir harus berupa angka",
    latitude: "Latitude harus berupa angka desimal yang valid",
    longitude: "Longitude harus berupa angka desimal yang valid",
    tarifPersen: "Tarif persen harus berupa angka",
    pajakBulanan: "Pajak bulanan harus berupa angka",
    omsetBulanan: "Omset bulanan harus berupa angka",
    kapasitasKendaraan: "Kapasitas kendaraan harus berupa angka",
    kapasitasTempat: "Kapasitas tempat harus berupa angka",
    jumlahKaryawan: "Jumlah karyawan harus berupa angka",
    rata2Pengunjung: "Rata-rata pengunjung harus berupa angka",
    rata2PengunjungHarian: "Rata-rata pengunjung harian harus berupa angka",
    jumlahKamar: "Jumlah kamar harus berupa angka",
    kapasitas: "Kapasitas harus berupa angka",
    dayaListrik: "Daya listrik harus berupa angka",
    hargaTermurah: "Harga termurah harus berupa angka",
    hargaTermahal: "Harga termahal harus berupa angka",
    ukuranPanjang: "Ukuran panjang harus berupa angka",
    ukuranLebar: "Ukuran lebar harus berupa angka",
    ukuranTinggi: "Ukuran tinggi harus berupa angka",
    rata2UkuranPemakaian: "Rata-rata ukuran pemakaian harus berupa angka",
    panenPerTahun: "Panen per tahun harus berupa angka",
    rata2BeratPanen: "Rata-rata berat panen harus berupa angka",
  };
  const requiredSelectionFields = new Set(["wpId", "rekPajakId", "kecamatanId", "kelurahanId", "statusReklame"]);
  const optionalEmailFields = new Set(["emailWp", "emailBadanUsaha"]);

  if (field === "nopd") {
    return INVALID_NOPD_MESSAGE;
  }

  if (numericMessages[field]) {
    return numericMessages[field];
  }

  if (
    issue.code === "invalid_string" &&
    issue.message.toLowerCase().includes("email") &&
    optionalEmailFields.has(field)
  ) {
    return `${fieldLabel} tidak valid`;
  }

  if (issue.code === "invalid_type") {
    if (requiredSelectionFields.has(field)) {
      return `${fieldLabel} wajib dipilih`;
    }

    if (issue.received === "undefined" || issue.received === "null") {
      return `${fieldLabel} wajib diisi`;
    }
  }

  if (issue.code === "too_small") {
    if (requiredSelectionFields.has(field)) {
      return `${fieldLabel} wajib dipilih`;
    }

    return `${fieldLabel} wajib diisi`;
  }

  if (issue.code === "invalid_enum_value") {
    return `${fieldLabel} tidak valid`;
  }

  if (issue.code === "custom" && issue.message) {
    return issue.message;
  }

  if (
    issue.message &&
    !issue.message.startsWith("[") &&
    issue.message !== "Required" &&
    issue.message !== "Invalid input"
  ) {
    return issue.message;
  }

  if (field) {
    return `${fieldLabel} tidak valid`;
  }

  return "Data tidak valid. Periksa kembali isian form.";
}

function buildValidationErrorPayload(error: ZodError, fallbackMessage: string) {
  const fieldErrors: ValidationFieldError[] = error.issues.map((issue) => ({
    field: buildFieldPath(issue.path),
    message: buildFriendlyIssueMessage(issue),
  }));

  const firstMessage = fieldErrors[0]?.message;
  return {
    message: firstMessage ?? fallbackMessage,
    fieldErrors,
  };
}

function sendZodValidationError(res: Response, error: ZodError, fallbackMessage: string) {
  return res.status(400).json(buildValidationErrorPayload(error, fallbackMessage));
}

function normalizeObjekPajakMutationError(error: unknown): {
  status: number;
  message: string;
  fieldErrors?: ValidationFieldError[];
} {
  const code = pgErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);

  if (code === "23505" && message.toLowerCase().includes("nopd")) {
    return {
      status: 409,
      message: "NOPD sudah digunakan oleh objek pajak lain",
      fieldErrors: [{ field: "nopd", message: "NOPD sudah digunakan oleh objek pajak lain" }],
    };
  }

  if (message.includes("Format NOPD")) {
    return {
      status: 400,
      message: INVALID_NOPD_MESSAGE,
      fieldErrors: [{ field: "nopd", message: INVALID_NOPD_MESSAGE }],
    };
  }

  if (message.includes("Kelurahan tidak sesuai")) {
    return {
      status: 400,
      message,
      fieldErrors: [{ field: "kelurahanId", message }],
    };
  }

  if (message.includes("kabupaten aktif")) {
    return {
      status: 400,
      message,
      fieldErrors: [
        { field: "latitude", message },
        { field: "longitude", message },
      ],
    };
  }

  if (message.includes("kecamatan terpilih") || message.includes("kecamatan aktif")) {
    return {
      status: 400,
      message,
      fieldErrors: [{ field: "kecamatanId", message }],
    };
  }

  if (message.includes("kelurahan terpilih")) {
    return {
      status: 400,
      message,
      fieldErrors: [{ field: "kelurahanId", message }],
    };
  }

  if (message.includes("latitude/longitude tidak valid")) {
    return {
      status: 400,
      message,
      fieldErrors: [
        { field: "latitude", message },
        { field: "longitude", message },
      ],
    };
  }

  if (message.includes("Rekening pajak tidak ditemukan")) {
    return {
      status: 400,
      message,
      fieldErrors: [{ field: "rekPajakId", message }],
    };
  }

  if (message.includes("Kode rekening tidak valid untuk pembentukan NOPD")) {
    return {
      status: 400,
      message: "Kode rekening pajak belum valid untuk generate NOPD. Hubungi admin master data.",
      fieldErrors: [{ field: "rekPajakId", message: "Kode rekening pajak belum valid untuk generate NOPD" }],
    };
  }

  return {
    status: 500,
    message: "Data gagal disimpan. Periksa kembali isian form.",
  };
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

function buildWpWarningDisplayName(row: {
  namaWp: string | null;
  namaPengelola: string | null;
  namaBadanUsaha: string | null;
}) {
  const candidates = [row.namaWp, row.namaPengelola, row.namaBadanUsaha];
  for (const item of candidates) {
    const value = String(item ?? "").trim();
    if (value.length > 0) return value;
  }
  return "(tanpa nama)";
}

function buildWarningDuplicates(
  rows: Array<{
    id: number;
    npwpd: string | null;
    nikKtpWp: string | null;
    nikPengelola: string | null;
    npwpBadanUsaha: string | null;
    namaWp: string | null;
    namaPengelola: string | null;
    namaBadanUsaha: string | null;
  }>,
  matchedField: "npwpd" | "nikKtpWp" | "nikPengelola" | "npwpBadanUsaha",
) {
  return rows.map((row) => ({
    id: row.id,
    displayName: buildWpWarningDisplayName(row),
    npwpd: row.npwpd,
    nikKtpWp: row.nikKtpWp,
    nikPengelola: row.nikPengelola,
    npwpBadanUsaha: row.npwpBadanUsaha,
    matchedField,
  }));
}

function buildQualityWarnings(input: {
  candidate: { npwpd?: string; nikKtpWp?: string; nikPengelola?: string; npwpBadanUsaha?: string; };
  wpMatches: Array<{
    id: number;
    npwpd: string | null;
    nikKtpWp: string | null;
    nikPengelola: string | null;
    npwpBadanUsaha: string | null;
    namaWp: string | null;
    namaPengelola: string | null;
    namaBadanUsaha: string | null;
  }>;
}) {
  const warnings: QualityWarning[] = [];
  const { candidate, wpMatches } = input;

  if (candidate.npwpd) {
    const duplicates = wpMatches.filter((wp) => String(wp.npwpd || "") === candidate.npwpd);
    if (duplicates.length > 0) {
      warnings.push({
        level: "critical",
        code: "DUPLICATE_NPWPD",
        message: "Maaf, NPWPD yang Anda masukkan terdeteksi duplikasi.",
        relatedIds: duplicates.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(duplicates, "npwpd"),
      });
    }
  }

  if (candidate.nikKtpWp) {
    const asOwner = wpMatches.filter((wp) => String(wp.nikKtpWp || "") === candidate.nikKtpWp);
    if (asOwner.length > 0) {
      warnings.push({
        level: "warning",
        code: "DUPLICATE_NIK_WP",
        message: "Maaf, NIK yang Anda masukkan terdeteksi sebagai pemilik di sistem kami.",
        relatedIds: asOwner.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(asOwner, "nikKtpWp"),
      });
    }

    const asManager = wpMatches.filter((wp) => String(wp.nikPengelola || "") === candidate.nikKtpWp);
    if (asManager.length > 0) {
      warnings.push({
        level: "warning",
        code: "DUPLICATE_NIK_WP_AS_PENGELOLA",
        message: "Maaf, NIK yang Anda masukkan terdeteksi sebagai pengelola di sistem kami.",
        relatedIds: asManager.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(asManager, "nikPengelola"),
      });
    }
  }

  if (candidate.nikPengelola) {
    const asManager = wpMatches.filter((wp) => String(wp.nikPengelola || "") === candidate.nikPengelola);
    if (asManager.length > 0) {
      warnings.push({
        level: "warning",
        code: "DUPLICATE_NIK_PENGELOLA",
        message: "Maaf, NIK yang Anda masukkan terdeteksi sebagai pengelola di sistem kami.",
        relatedIds: asManager.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(asManager, "nikPengelola"),
      });
    }

    const asOwner = wpMatches.filter((wp) => String(wp.nikKtpWp || "") === candidate.nikPengelola);
    if (asOwner.length > 0) {
      warnings.push({
        level: "warning",
        code: "DUPLICATE_NIK_PENGELOLA_AS_WP",
        message: "Maaf, NIK yang Anda masukkan terdeteksi sebagai pemilik di sistem kami.",
        relatedIds: asOwner.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(asOwner, "nikKtpWp"),
      });
    }
  }

  if (candidate.npwpBadanUsaha) {
    const duplicates = wpMatches.filter((wp) => String(wp.npwpBadanUsaha || "") === candidate.npwpBadanUsaha);
    if (duplicates.length > 0) {
      warnings.push({
        level: "warning",
        code: "DUPLICATE_NPWP_BADAN_USAHA",
        message: "Maaf, NPWP badan usaha yang Anda masukkan terdeteksi duplikasi.",
        relatedIds: duplicates.map((wp) => Number(wp.id)),
        duplicates: buildWarningDuplicates(duplicates, "npwpBadanUsaha"),
      });
    }
  }

  return warnings;
}

function buildSimilarNameAddressGroups(
  opRows: Array<{
    id: number;
    namaOp: string | null;
    alamatOp: string | null;
  }>,
) {
  const grouped = new Map<
    string,
    {
      namaOp: string;
      alamatOp: string;
      relatedIds: number[];
    }
  >();

  for (const row of opRows) {
    const namaOp = String(row.namaOp ?? "").trim();
    const alamatOp = String(row.alamatOp ?? "").trim();
    if (!namaOp || !alamatOp) continue;

    const key = `${namaOp.toLowerCase()}||${alamatOp.toLowerCase()}`;
    const current = grouped.get(key);
    if (current) {
      current.relatedIds.push(row.id);
      continue;
    }

    grouped.set(key, {
      namaOp,
      alamatOp,
      relatedIds: [row.id],
    });
  }

  return Array.from(grouped.values()).filter((group) => group.relatedIds.length > 1);
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

function parseStringArray(value: string | undefined) {
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  const items = cleaned
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
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
      klasifikasi: cleanText(row.detail_klasifikasi) ?? undefined,
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
      fasilitas: parseStringArray(row.detail_fasilitas) ?? undefined,
      rata2PengunjungHarian: parseNumber(row.detail_rata2_pengunjung_harian) ?? undefined,
      hargaTermurah: parseNumber(row.detail_harga_termurah) ?? undefined,
      hargaTermahal: parseNumber(row.detail_harga_termahal) ?? undefined,
    });
  }

  if (jenisPajak === "PBJT Jasa Parkir") {
    return compactObject({
      jenisUsaha: cleanText(row.detail_jenis_usaha) ?? undefined,
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
      ukuranPanjang: parseNumber(row.detail_ukuran_panjang) ?? undefined,
      ukuranLebar: parseNumber(row.detail_ukuran_lebar) ?? undefined,
      ukuranTinggi: parseNumber(row.detail_ukuran_tinggi) ?? undefined,
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
    detail_fasilitas: Array.isArray(d.fasilitas) ? d.fasilitas.join(" | ") : d.fasilitas ?? "",
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
    detail_ukuran_panjang: d.ukuranPanjang ?? "",
    detail_ukuran_lebar: d.ukuranLebar ?? "",
    detail_ukuran_tinggi: d.ukuranTinggi ?? "",
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

type CsvAttachmentEntityType = "wajib_pajak" | "objek_pajak";
type OpExportMode = "template" | "operational";
type JenisPajakOption = (typeof JENIS_PAJAK_OPTIONS)[number];

function readCsvValue(row: CsvImportRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function hasAnyCsvValue(row: CsvImportRow, keys: readonly string[]) {
  return keys.some((key) => {
    const value = row[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function resolveWpImportPayloadFromCsvRow(row: CsvImportRow) {
  const peranWp = typeof row.peran_wp === "string" ? row.peran_wp.trim() : undefined;
  const hasCompactSubject = hasAnyCsvValue(row, [
    "nama_subjek",
    "nik_subjek",
    "alamat_subjek",
    "kecamatan_subjek",
    "kelurahan_subjek",
    "telepon_wa_subjek",
    "email_subjek",
  ]);
  const useCompactSubjectForPemilik = hasCompactSubject && peranWp !== "pengelola";
  const useCompactSubjectForPengelola = hasCompactSubject && peranWp === "pengelola";

  return normalizeWpData({
    jenisWp: row.jenis_wp,
    peranWp: row.peran_wp,
    npwpd: row.npwpd,
    statusAktif: row.status_aktif,

    namaWp: useCompactSubjectForPemilik ? readCsvValue(row, "nama_subjek") : row.nama_wp,
    nikKtpWp: useCompactSubjectForPemilik ? readCsvValue(row, "nik_subjek") : row.nik_ktp_wp,
    alamatWp: useCompactSubjectForPemilik ? readCsvValue(row, "alamat_subjek") : row.alamat_wp,
    kecamatanWp: useCompactSubjectForPemilik ? readCsvValue(row, "kecamatan_subjek") : row.kecamatan_wp,
    kelurahanWp: useCompactSubjectForPemilik ? readCsvValue(row, "kelurahan_subjek") : row.kelurahan_wp,
    teleponWaWp: useCompactSubjectForPemilik ? readCsvValue(row, "telepon_wa_subjek") : row.telepon_wa_wp,
    emailWp: useCompactSubjectForPemilik ? readCsvValue(row, "email_subjek") : row.email_wp,

    namaPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "nama_subjek") : row.nama_pengelola,
    nikPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "nik_subjek") : row.nik_pengelola,
    alamatPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "alamat_subjek") : row.alamat_pengelola,
    kecamatanPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "kecamatan_subjek") : row.kecamatan_pengelola,
    kelurahanPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "kelurahan_subjek") : row.kelurahan_pengelola,
    teleponWaPengelola: useCompactSubjectForPengelola ? readCsvValue(row, "telepon_wa_subjek") : row.telepon_wa_pengelola,

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
}

function selectWpSubjectForCsv(wp: WajibPajakWithBadanUsaha) {
  const prefersPengelola = wp.peranWp === "pengelola";

  return {
    nama_subjek: prefersPengelola ? wp.namaPengelola || wp.namaWp || "" : wp.namaWp || wp.namaPengelola || "",
    nik_subjek: prefersPengelola ? wp.nikPengelola || wp.nikKtpWp || "" : wp.nikKtpWp || wp.nikPengelola || "",
    alamat_subjek: prefersPengelola ? wp.alamatPengelola || wp.alamatWp || "" : wp.alamatWp || wp.alamatPengelola || "",
    kecamatan_subjek: prefersPengelola ? wp.kecamatanPengelola || wp.kecamatanWp || "" : wp.kecamatanWp || wp.kecamatanPengelola || "",
    kelurahan_subjek: prefersPengelola ? wp.kelurahanPengelola || wp.kelurahanWp || "" : wp.kelurahanWp || wp.kelurahanPengelola || "",
    telepon_wa_subjek: prefersPengelola ? wp.teleponWaPengelola || wp.teleponWaWp || "" : wp.teleponWaWp || wp.teleponWaPengelola || "",
    email_subjek: prefersPengelola ? "" : wp.emailWp || "",
  };
}

async function buildAttachmentPresenceMap(entityType: CsvAttachmentEntityType, entityIds: number[]) {
  const uniqueIds = Array.from(new Set(entityIds.filter((value) => Number.isFinite(value))));
  if (uniqueIds.length === 0) {
    return new Map<number, "ADA">();
  }

  const rows = await db
    .select({
      entityId: entityAttachment.entityId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(entityAttachment)
    .where(and(eq(entityAttachment.entityType, entityType), inArray(entityAttachment.entityId, uniqueIds)))
    .groupBy(entityAttachment.entityId);

  return new Map(
    rows.filter((row) => Number(row.count) > 0).map((row) => [row.entityId, "ADA" as const]),
  );
}

function parseObjekPajakExportMode(value: unknown): OpExportMode | null {
  if (value === undefined || value === null || value === "") return "template";
  if (value === "template" || value === "operational") return value;
  return null;
}

function parseJenisPajakOption(value: unknown): JenisPajakOption | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const normalized = value.trim();
  return JENIS_PAJAK_OPTIONS.includes(normalized as JenisPajakOption) ? (normalized as JenisPajakOption) : null;
}

function buildOperationalDetailForCsv(detail: unknown, jenisPajak: JenisPajakOption) {
  const flattened: Record<string, unknown> = flattenDetailForCsv(detail);
  const allowedColumns = OP_OPERATIONAL_DETAIL_COLUMNS_BY_JENIS[jenisPajak];
  return Object.fromEntries(allowedColumns.map((column: string) => [column, flattened[column] ?? ""]));
}

function buildObjekPajakExportFileName(mode: OpExportMode, jenisPajak?: JenisPajakOption | null) {
  if (mode === "template") {
    return "objek_pajak_template.csv";
  }

  const safeJenis = (jenisPajak ?? "operasional")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `objek_pajak_${safeJenis}.csv`;
}

async function buildDashboardSummaryData(params: {
  includeUnverified: boolean;
  summaryFrom?: Date;
  summaryTo?: Date;
  trendFrom?: Date;
  trendTo?: Date;
  groupBy: DashboardGroupBy;
}): Promise<DashboardSummaryData> {
  const summaryConditions: SQL[] = [];
  if (!params.includeUnverified) {
    summaryConditions.push(eq(objekPajak.statusVerifikasi, "verified"));
  }

  if (params.summaryFrom && params.summaryTo) {
    summaryConditions.push(gte(objekPajak.createdAt, startOfUtcDay(params.summaryFrom)));
    summaryConditions.push(lte(objekPajak.createdAt, endOfUtcDay(params.summaryTo)));
  }

  const hasDetailExpr = sql<boolean>`
    (
      exists (select 1 from op_detail_pbjt_makan_minum d1 where d1.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pbjt_perhotelan d2 where d2.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pbjt_hiburan d3 where d3.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pbjt_parkir d4 where d4.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pbjt_tenaga_listrik d5 where d5.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pajak_reklame d6 where d6.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pajak_air_tanah d7 where d7.op_id = ${objekPajak.id}) or
      exists (select 1 from op_detail_pajak_walet d8 where d8.op_id = ${objekPajak.id})
    )
  `;

  const byJenisQuery = db
    .select({
      jenisPajak: sql<string>`coalesce(${masterRekeningPajak.jenisPajak}, 'Pajak MBLB')`,
      total: sql<number>`cast(count(*) as int)`,
      updated: sql<number>`cast(sum(case when ${hasDetailExpr} then 1 else 0 end) as int)`,
    })
    .from(objekPajak)
    .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
    .groupBy(sql`coalesce(${masterRekeningPajak.jenisPajak}, 'Pajak MBLB')`);

  const byJenisRaw = summaryConditions.length > 0 ? await byJenisQuery.where(and(...summaryConditions)) : await byJenisQuery;

  const byJenisMap = new Map(
    byJenisRaw.map((row) => [
      row.jenisPajak,
      {
        total: Number(row.total ?? 0),
        updated: Number(row.updated ?? 0),
      },
    ]),
  );

  const byJenis: DashboardSummaryData["byJenis"] = JENIS_PAJAK_OPTIONS.map((jenisPajak) => {
    const stats = byJenisMap.get(jenisPajak) ?? { total: 0, updated: 0 };
    const pending = Math.max(0, stats.total - stats.updated);
    const percentage = stats.total > 0 ? Math.round((stats.updated / stats.total) * 100) : 0;
    return {
      jenisPajak,
      total: stats.total,
      updated: stats.updated,
      pending,
      percentage,
    };
  });

  for (const row of byJenisRaw) {
    if (JENIS_PAJAK_OPTIONS.includes(row.jenisPajak as (typeof JENIS_PAJAK_OPTIONS)[number])) {
      continue;
    }
    const total = Number(row.total ?? 0);
    const updated = Number(row.updated ?? 0);
    byJenis.push({
      jenisPajak: row.jenisPajak,
      total,
      updated,
      pending: Math.max(0, total - updated),
      percentage: total > 0 ? Math.round((updated / total) * 100) : 0,
    });
  }

  const totalOp = byJenis.reduce((acc, row) => acc + row.total, 0);
  const totalUpdated = byJenis.reduce((acc, row) => acc + row.updated, 0);
  const totalPending = Math.max(0, totalOp - totalUpdated);
  const overallPercentage = totalOp > 0 ? Math.round((totalUpdated / totalOp) * 100) : 0;

  const wpRows = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(wajibPajak);
  const totalWp = Number(wpRows[0]?.count ?? 0);
  const validWpRows = await db
    .select({ count: sql<number>`cast(count(distinct ${entityAttachment.entityId}) as int)` })
    .from(entityAttachment)
    .where(eq(entityAttachment.entityType, "wajib_pajak"));
  const validWp = Math.min(totalWp, Number(validWpRows[0]?.count ?? 0));
  const pendingWp = Math.max(0, totalWp - validWp);

  const trendWindow = formatDashboardTrendRange(params.trendFrom, params.trendTo, params.groupBy);
  const trendStart = startOfUtcDay(trendWindow.from);
  const trendEnd = endOfUtcDay(trendWindow.to);

  const createdBucketExpr =
    params.groupBy === "week"
      ? sql`date_trunc('week', ${objekPajak.createdAt})`
      : sql`date_trunc('day', ${objekPajak.createdAt})`;

  const verifiedBucketExpr =
    params.groupBy === "week"
      ? sql`date_trunc('week', ${objekPajak.verifiedAt})`
      : sql`date_trunc('day', ${objekPajak.verifiedAt})`;

  const createdConditions: SQL[] = [
    gte(objekPajak.createdAt, trendStart),
    lte(objekPajak.createdAt, trendEnd),
  ];
  if (!params.includeUnverified) {
    createdConditions.push(eq(objekPajak.statusVerifikasi, "verified"));
  }

  const createdTrendRows = await db
    .select({
      bucket: sql<string>`to_char(${createdBucketExpr}, 'YYYY-MM-DD')`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(objekPajak)
    .where(and(...createdConditions))
    .groupBy(createdBucketExpr)
    .orderBy(createdBucketExpr);

  const verifiedTrendRows = await db
    .select({
      bucket: sql<string>`to_char(${verifiedBucketExpr}, 'YYYY-MM-DD')`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(objekPajak)
    .where(
      and(
        eq(objekPajak.statusVerifikasi, "verified"),
        sql`${objekPajak.verifiedAt} is not null`,
        gte(objekPajak.verifiedAt, trendStart),
        lte(objekPajak.verifiedAt, trendEnd),
      ),
    )
    .groupBy(verifiedBucketExpr)
    .orderBy(verifiedBucketExpr);

  const createdMap = new Map(createdTrendRows.map((row) => [row.bucket, Number(row.count ?? 0)]));
  const verifiedMap = new Map(verifiedTrendRows.map((row) => [row.bucket, Number(row.count ?? 0)]));
  const trend = buildTrendTimeline(trendWindow.from, trendWindow.to, params.groupBy).map((point) => ({
    ...point,
    createdOp: createdMap.get(point.periodStart) ?? 0,
    verifiedOp: verifiedMap.get(point.periodStart) ?? 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    includeUnverified: params.includeUnverified,
    filters: {
      summaryWindow: {
        from: params.summaryFrom ? toIsoDate(params.summaryFrom) : null,
        to: params.summaryTo ? toIsoDate(params.summaryTo) : null,
      },
      trendWindow: {
        from: toIsoDate(trendWindow.from),
        to: toIsoDate(trendWindow.to),
        groupBy: params.groupBy,
      },
    },
    totals: {
      totalWp,
      validWp,
      pendingWp,
      totalOp,
      totalUpdated,
      totalPending,
      overallPercentage,
    },
    byJenis,
    trend,
  };
}

function buildDashboardSummaryCsv(summary: DashboardSummaryData) {
  const rows: Array<Record<string, string | number>> = [];

  rows.push({
    section: "totals",
    jenis_pajak: "ALL",
    total: summary.totals.totalOp,
    updated: summary.totals.totalUpdated,
    pending: summary.totals.totalPending,
    percentage: summary.totals.overallPercentage,
    period_start: "",
    period_end: "",
    created_op: "",
    verified_op: "",
    include_unverified: summary.includeUnverified ? "true" : "false",
    summary_from: summary.filters.summaryWindow.from ?? "",
    summary_to: summary.filters.summaryWindow.to ?? "",
    trend_group_by: summary.filters.trendWindow.groupBy,
    trend_from: summary.filters.trendWindow.from,
    trend_to: summary.filters.trendWindow.to,
  });

  for (const row of summary.byJenis) {
    rows.push({
      section: "by_jenis",
      jenis_pajak: row.jenisPajak,
      total: row.total,
      updated: row.updated,
      pending: row.pending,
      percentage: row.percentage,
      period_start: "",
      period_end: "",
      created_op: "",
      verified_op: "",
      include_unverified: summary.includeUnverified ? "true" : "false",
      summary_from: summary.filters.summaryWindow.from ?? "",
      summary_to: summary.filters.summaryWindow.to ?? "",
      trend_group_by: summary.filters.trendWindow.groupBy,
      trend_from: summary.filters.trendWindow.from,
      trend_to: summary.filters.trendWindow.to,
    });
  }

  for (const point of summary.trend) {
    rows.push({
      section: "trend",
      jenis_pajak: "",
      total: "",
      updated: "",
      pending: "",
      percentage: "",
      period_start: point.periodStart,
      period_end: point.periodEnd,
      created_op: point.createdOp,
      verified_op: point.verifiedOp,
      include_unverified: summary.includeUnverified ? "true" : "false",
      summary_from: summary.filters.summaryWindow.from ?? "",
      summary_to: summary.filters.summaryWindow.to ?? "",
      trend_group_by: summary.filters.trendWindow.groupBy,
      trend_from: summary.filters.trendWindow.from,
      trend_to: summary.filters.trendWindow.to,
    });
  }

  return stringify(rows, {
    header: true,
    columns: [
      "section",
      "jenis_pajak",
      "total",
      "updated",
      "pending",
      "percentage",
      "period_start",
      "period_end",
      "created_op",
      "verified_op",
      "include_unverified",
      "summary_from",
      "summary_to",
      "trend_group_by",
      "trend_from",
      "trend_to",
    ],
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const healthHandler = async (_req: Request, res: Response) => {
    try {
      await ensureDatabaseConnection();
      await ensureAttachmentStorageRoot();
      return res.json({
        status: "healthy",
        service: "okus-map-explorer",
        database: "up",
        attachmentsStorage: "ready",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database connectivity error";
      return res.status(503).json({
        status: "degraded",
        service: "okus-map-explorer",
        database: "down",
        timestamp: new Date().toISOString(),
        message,
      });
    }
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  app.post("/api/auth/login", async (req, res) => {
    const clientId = resolveLoginClientId(req);
    const rateLimit = loginSecurity.consumeRateLimit(clientId);
    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSec));
      return res.status(429).json({
        code: "AUTH_RATE_LIMITED",
        message: "Terlalu banyak request login. Coba lagi nanti.",
        retryAfterSec: rateLimit.retryAfterSec,
      });
    }

    const username = cleanText((req.body as Record<string, unknown>)?.username);
    const password = cleanText((req.body as Record<string, unknown>)?.password);

    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi" });
    }

    const lockoutState = loginSecurity.getLockoutState(clientId, username);
    if (lockoutState.locked) {
      res.setHeader("Retry-After", String(lockoutState.retryAfterSec));
      return res.status(429).json({
        code: "AUTH_LOCKED",
        message: "Akses login sementara dikunci karena terlalu banyak percobaan gagal.",
        retryAfterSec: lockoutState.retryAfterSec,
      });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || !verifyPassword(user.password, password)) {
      const failureState = loginSecurity.registerFailedAttempt(clientId, username);
      if (failureState.locked) {
        res.setHeader("Retry-After", String(failureState.retryAfterSec));
        return res.status(429).json({
          code: "AUTH_LOCKED",
          message: "Akses login sementara dikunci karena terlalu banyak percobaan gagal.",
          retryAfterSec: failureState.retryAfterSec,
        });
      }
      return res.status(401).json({ message: "Username atau password salah" });
    }
    loginSecurity.clearFailedAttempt(clientId, username);

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

  app.post("/api/auth/change-password", async (req, res) => {
    const sessionUser = requireRole(req, res, APP_ROLE_OPTIONS);
    if (!sessionUser) return;

    const oldPassword = cleanText((req.body as Record<string, unknown>)?.oldPassword);
    const newPassword = cleanText((req.body as Record<string, unknown>)?.newPassword);

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "oldPassword dan newPassword wajib diisi" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ message: "Password baru harus berbeda dari password lama" });
    }

    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        code: "PASSWORD_POLICY_VIOLATION",
        message: "Password baru tidak memenuhi kebijakan minimum",
        errors: passwordCheck.errors,
        policy: PASSWORD_POLICY,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!verifyPassword(user.password, oldPassword)) {
      return res.status(401).json({ message: "Password lama tidak sesuai" });
    }

    await db
      .update(users)
      .set({
        password: hashPassword(newPassword),
      })
      .where(eq(users.id, user.id));

    await writeAuditLog({
      entityType: "auth_user",
      entityId: user.id,
      action: "update",
      actorName: sessionUser.username,
      beforeData: null,
      afterData: { id: user.id, username: user.username, role: user.role },
      metadata: { source: "api", operation: "change_password" },
    });

    return res.json({ message: "Password berhasil diperbarui" });
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

    const rawCursor = req.query.cursor;
    const cursor = parseCursor(rawCursor);
    if (rawCursor !== undefined && rawCursor !== null && rawCursor !== "" && !cursor) {
      return res.status(400).json({ message: "Query cursor tidak valid" });
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
      cursor,
      q,
      jenisWp,
      peranWp,
      statusAktif,
    });
    return sendJsonWithEtag(req, res, data);
  });

  app.get("/api/wajib-pajak/detail/:id", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor", "viewer"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID wajib pajak tidak valid" });
    }

    const data = await storage.getWajibPajak(id);
    if (!data) {
      return res.status(404).json({ message: "Data duplikasi tidak ditemukan" });
    }

    return res.json(data);
  });

  app.get("/api/wajib-pajak/:id/attachments", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID wajib pajak tidak valid" });
    }

    const existing = await storage.getWajibPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Wajib Pajak tidak ditemukan" });
    }

    const rows = await storage.listEntityAttachments("wajib_pajak", id);
    return res.json(rows.map(toAttachmentResponse));
  });

  app.post("/api/wajib-pajak/:id/attachments", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID wajib pajak tidak valid" });
    }

    try {
      await runSingleFileUpload(req, res);
      await assertAttachmentEntityExists("wajib_pajak", id);

      if (!req.file) {
        return res.status(400).json({ message: "File attachment wajib diunggah" });
      }

      if (!ATTACHMENT_ALLOWED_MIME_TYPES.includes(req.file.mimetype as (typeof ATTACHMENT_ALLOWED_MIME_TYPES)[number])) {
        return res.status(400).json({ message: "Format file tidak didukung" });
      }

      const parsedMeta = entityAttachmentUploadMetadataSchema.safeParse(req.body);
      if (!parsedMeta.success) {
        return res.status(400).json({ message: "Metadata attachment tidak valid" });
      }

      if (!validateAttachmentDocumentType("wajib_pajak", parsedMeta.data.documentType)) {
        return res.status(400).json({ message: "Jenis dokumen tidak valid untuk Wajib Pajak" });
      }

      const savedFile = await saveAttachmentBuffer({
        entityType: "wajib_pajak",
        entityId: id,
        documentType: parsedMeta.data.documentType,
        originalFileName: req.file.originalname,
        buffer: req.file.buffer,
      });

      try {
        const created = await storage.createEntityAttachment({
          id: savedFile.id,
          entityType: "wajib_pajak",
          entityId: id,
          documentType: parsedMeta.data.documentType,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          storagePath: savedFile.storagePath,
          uploadedBy: getActorName(req),
          notes: parsedMeta.data.notes ?? null,
        });

        await writeAuditLog({
          entityType: "wajib_pajak",
          entityId: id,
          action: "ATTACHMENT_UPLOAD",
          actorName: getActorName(req),
          beforeData: null,
          afterData: created,
          metadata: { source: "api", attachmentId: created.id, documentType: created.documentType },
        });

        return res.status(201).json(toAttachmentResponse(created));
      } catch (error) {
        await deleteAttachmentFile(savedFile.storagePath).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      const normalized = normalizeAttachmentUploadError(error);
      return res.status(normalized.status).json({ message: normalized.message });
    }
  });

  app.get("/api/wajib-pajak/:id/attachments/:attachmentId/download", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID wajib pajak tidak valid" });
    }

    const row = await storage.getEntityAttachment("wajib_pajak", id, req.params.attachmentId);
    if (!row) {
      return res.status(404).json({ message: "Attachment tidak ditemukan" });
    }

    const buffer = await readFile(buildAttachmentDownloadPath(row.storagePath));
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${encodeURIComponent(row.fileName)}\"`);
    return res.send(buffer);
  });

  app.delete("/api/wajib-pajak/:id/attachments/:attachmentId", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID wajib pajak tidak valid" });
    }

    const removed = await storage.deleteEntityAttachment("wajib_pajak", id, req.params.attachmentId);
    if (!removed) {
      return res.status(404).json({ message: "Attachment tidak ditemukan" });
    }

    await deleteAttachmentFile(removed.storagePath).catch(() => undefined);
    await writeAuditLog({
      entityType: "wajib_pajak",
      entityId: id,
      action: "ATTACHMENT_DELETE",
      actorName: getActorName(req),
      beforeData: removed,
      afterData: null,
      metadata: { source: "api", attachmentId: removed.id, documentType: removed.documentType },
    });

    return res.json({ success: true });
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
    const attachmentMap = await buildAttachmentPresenceMap(
      "wajib_pajak",
      data.map((wp) => wp.id),
    );
    const rows = data.map((wp) => ({
      jenis_wp: wp.jenisWp,
      peran_wp: wp.peranWp,
      npwpd: wp.npwpd || "",
      status_aktif: wp.statusAktif,
      ...selectWpSubjectForCsv(wp),
      lampiran: attachmentMap.get(wp.id) ?? "",

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

        const wpData = resolveWpImportPayloadFromCsvRow(row);

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

  app.get("/api/master/kecamatan", async (req, res) => {
    const data = await storage.getAllMasterKecamatan();
    return sendJsonWithEtag(req, res, data);
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
    return sendJsonWithEtag(req, res, data);
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
    const includeInactive = typeof req.query.includeInactive === "string" && req.query.includeInactive === "true";
    if (includeInactive && !requireRole(req, res, APP_ROLE_OPTIONS)) return;
    const data = includeInactive
      ? await db.select().from(masterRekeningPajak).orderBy(asc(masterRekeningPajak.kodeRekening))
      : await storage.getAllMasterRekeningPajak();
    return sendJsonWithEtag(req, res, data);
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
      return sendZodValidationError(res, parsed.error, "Parameter quality check tidak valid");
    }

    const candidate = parsed.data;
    const wpRows = await db
      .select({
        id: wajibPajak.id,
        npwpd: wajibPajak.npwpd,
        nikKtpWp: wajibPajak.nikKtpWp,
        nikPengelola: wajibPajak.nikPengelola,
        npwpBadanUsaha: wpBadanUsaha.npwpBadanUsaha,
        namaWp: wajibPajak.namaWp,
        namaPengelola: wajibPajak.namaPengelola,
        namaBadanUsaha: wpBadanUsaha.namaBadanUsaha,
      })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId));

    const wpMatches = wpRows.filter((row) => {
      if (typeof candidate.excludeWpId === "number" && row.id === candidate.excludeWpId) return false;
      if (candidate.npwpd && row.npwpd === candidate.npwpd) return true;
      if (candidate.nikKtpWp && (row.nikKtpWp === candidate.nikKtpWp || row.nikPengelola === candidate.nikKtpWp)) return true;
      if (candidate.nikPengelola && (row.nikPengelola === candidate.nikPengelola || row.nikKtpWp === candidate.nikPengelola)) return true;
      if (candidate.npwpBadanUsaha && row.npwpBadanUsaha === candidate.npwpBadanUsaha) return true;
      return false;
    });

    const warnings = buildQualityWarnings({
      candidate,
      wpMatches,
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
    const similarNameAddressGroups = buildSimilarNameAddressGroups(
      opRows.map((row) => ({
        id: row.id,
        namaOp: row.namaOp,
        alamatOp: row.alamatOp,
      })),
    );

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
      similarNameAddress: {
        count: similarNameAddressGroups.length,
        groups: similarNameAddressGroups,
      },
    });
  });

  app.get("/api/dashboard/summary", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const includeUnverified = parseBooleanFlag(req.query.includeUnverified);
    if (includeUnverified === null) {
      return res.status(400).json({ message: "includeUnverified harus true/false" });
    }

    const from = parseDashboardDate(req.query.from);
    const to = parseDashboardDate(req.query.to);
    if (from === null || to === null) {
      return res.status(400).json({ message: "from/to harus format YYYY-MM-DD" });
    }
    if ((from && !to) || (!from && to)) {
      return res.status(400).json({ message: "from dan to harus diisi berpasangan" });
    }

    const groupBy = parseDashboardGroupBy(req.query.groupBy);
    if (!groupBy) {
      return res.status(400).json({ message: "groupBy harus day/week" });
    }

    const summary = await buildDashboardSummaryData({
      includeUnverified: includeUnverified !== false,
      summaryFrom: from,
      summaryTo: to,
      trendFrom: from,
      trendTo: to,
      groupBy,
    });

    const stableData = {
      includeUnverified: summary.includeUnverified,
      filters: summary.filters,
      totals: summary.totals,
      byJenis: summary.byJenis,
      trend: summary.trend,
    };

    return sendJsonWithEtag(req, res, summary, { etagPayload: stableData });
  });

  app.get("/api/dashboard/summary/export", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const includeUnverified = parseBooleanFlag(req.query.includeUnverified);
    if (includeUnverified === null) {
      return res.status(400).json({ message: "includeUnverified harus true/false" });
    }

    const from = parseDashboardDate(req.query.from);
    const to = parseDashboardDate(req.query.to);
    if (from === null || to === null) {
      return res.status(400).json({ message: "from/to harus format YYYY-MM-DD" });
    }
    if ((from && !to) || (!from && to)) {
      return res.status(400).json({ message: "from dan to harus diisi berpasangan" });
    }

    const groupBy = parseDashboardGroupBy(req.query.groupBy);
    if (!groupBy) {
      return res.status(400).json({ message: "groupBy harus day/week" });
    }

    const summary = await buildDashboardSummaryData({
      includeUnverified: includeUnverified !== false,
      summaryFrom: from,
      summaryTo: to,
      trendFrom: from,
      trendTo: to,
      groupBy,
    });

    const csv = buildDashboardSummaryCsv(summary);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=dashboard_summary.csv");
    return res.send(csv);
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

    const rawCursor = req.query.cursor;
    const cursor = parseCursor(rawCursor);
    if (rawCursor !== undefined && rawCursor !== null && rawCursor !== "" && !cursor) {
      return res.status(400).json({ message: "Query cursor tidak valid" });
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

    const wpId = parseOptionalNumber(req.query.wpId);
    if (wpId === null) {
      return res.status(400).json({ message: "wpId tidak valid" });
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
      cursor,
      q,
      status,
      statusVerifikasi: effectiveStatusVerifikasi,
      kecamatanId,
      rekPajakId: rekPajakId ?? undefined,
      wpId: wpId ?? undefined,
    });

    return sendJsonWithEtag(req, res, data);
  });

  app.get("/api/region-boundaries/active/kabupaten", async (req, res) => {
    const boundary = await getActiveRegionBoundary("kabupaten", "light");
    return sendJsonWithEtag(req, res, boundary);
  });

  app.get("/api/region-boundaries/active/kecamatan", async (req, res) => {
    const boundary = await getActiveRegionBoundary("kecamatan", "light");
    return sendJsonWithEtag(req, res, boundary);
  });

  app.get("/api/region-boundaries/active/desa", async (req, res) => {
    const queryResult = activeRegionDesaQuerySchema.safeParse({
      kecamatanId: req.query.kecamatanId,
    });
    if (!queryResult.success) {
      return res.status(400).json({
        message: "kecamatanId wajib diisi untuk memuat batas desa/kelurahan",
      });
    }

    const [kecamatan] = await db
      .select({
        cpmKecId: masterKecamatan.cpmKecId,
        cpmKecamatan: masterKecamatan.cpmKecamatan,
      })
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecId, queryResult.data.kecamatanId))
      .limit(1);
    if (!kecamatan) {
      return res.status(400).json({
        message: "kecamatanId tidak dikenal di master wilayah aktif",
      });
    }

    const boundary = await getActiveRegionBoundary("desa", "light", {
      kecamatanId: kecamatan.cpmKecId,
      kecamatanName: kecamatan.cpmKecamatan,
    });
    return sendJsonWithEtag(req, res, boundary);
  });

  app.get("/api/backoffice/region-boundaries/desa/revisions", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;
    const revisions = await listBoundaryRevisions();
    return res.json(revisions);
  });

  app.get("/api/backoffice/region-boundaries/desa/draft", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const queryResult = activeRegionDesaQuerySchema.safeParse({
      kecamatanId: req.query.kecamatanId,
    });
    if (!queryResult.success) {
      return res.status(400).json({
        message: "kecamatanId wajib diisi untuk memuat draft batas desa/kelurahan",
      });
    }

    try {
      const draft = await getDesaDraftByKecamatan(queryResult.data.kecamatanId, getActorName(req));
      return res.json(draft);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.put("/api/backoffice/region-boundaries/desa/draft/features/:boundaryKey", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryDraftFeatureSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Draft boundary tidak valid");
    }

    if (parsed.data.boundaryKey !== req.params.boundaryKey) {
      return res.status(400).json({ message: "boundaryKey pada path dan payload harus sama" });
    }

    try {
      const result = await saveDraftBoundaryFeature({
        ...parsed.data,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.delete("/api/backoffice/region-boundaries/desa/draft/features/:boundaryKey", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const boundaryKey = String(req.params.boundaryKey ?? "").trim();
    if (!boundaryKey) {
      return res.status(400).json({ message: "boundaryKey draft boundary tidak valid" });
    }

    try {
      const result = await resetDraftBoundaryFeature({
        boundaryKey,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mereset draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/draft/analyze", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryDraftFeatureSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Draft topology boundary tidak valid");
    }

    try {
      const result = await analyzeDraftBoundaryTopology({
        ...parsed.data,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menganalisa topology draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.get("/api/backoffice/region-boundaries/desa/draft/topology", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const queryResult = activeRegionDesaQuerySchema.safeParse({
      kecamatanId: req.query.kecamatanId,
    });
    if (!queryResult.success) {
      return res.status(400).json({
        message: "kecamatanId wajib diisi untuk memuat topology draft batas desa/kelurahan",
      });
    }

    try {
      const result = await getDraftTopologyByKecamatan(queryResult.data.kecamatanId);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat topology draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/draft/fragments/:fragmentId/assign", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryFragmentAssignmentPayloadSchema.safeParse({
      ...req.body,
      fragmentId: req.params.fragmentId,
    });
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Payload assignment fragment topology tidak valid");
    }

    try {
      const result = await assignDraftTopologyFragment({
        revisionId: parsed.data.revisionId,
        fragmentId: parsed.data.fragmentId,
        assignedBoundaryKey: parsed.data.assignedBoundaryKey,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menetapkan assignment fragment topology";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/draft/takeover/confirm", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryTakeoverConfirmationPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Payload konfirmasi takeover tidak valid");
    }

    try {
      const result = await confirmDraftTakeover({
        revisionId: parsed.data.revisionId,
        actorName: getActorName(req),
        takeoverConfirmedBy: parsed.data.takeoverConfirmedBy,
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengonfirmasi takeover draft boundary";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/preview-impact", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryDraftFeatureSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Preview boundary tidak valid");
    }

    try {
      const preview = await previewDraftImpact(parsed.data);
      return res.json(preview);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghitung preview impact";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/publish", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const parsed = regionBoundaryPublishPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Payload publish boundary tidak valid");
    }

    try {
      const result = await publishDraftRevision({
        revisionId: parsed.data.revisionId,
        mode: parsed.data.mode,
        topologyStatus: parsed.data.topologyStatus,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal publish boundary";
      return res.status(400).json({ message });
    }
  });

  app.post("/api/backoffice/region-boundaries/desa/revisions/:id/rollback", async (req, res) => {
    if (!requireRole(req, res, ["admin"])) return;

    const revisionId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(revisionId)) {
      return res.status(400).json({ message: "ID revision rollback tidak valid" });
    }

    try {
      const result = await rollbackPublishedRevision({
        revisionId,
        actorName: getActorName(req),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal rollback boundary";
      return res.status(400).json({ message });
    }
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

    return sendJsonWithEtag(req, res, {
      items: result.items,
      meta: {
        totalInView: result.totalInView,
        isCapped: result.isCapped,
      },
    });
  });

  app.get("/api/objek-pajak/map-wfs", async (req, res) => {
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

    return sendJsonWithEtag(req, res, {
      type: "FeatureCollection",
      numberMatched: result.totalInView,
      numberReturned: result.items.length,
      features: result.items.map((item) => ({
        type: "Feature",
        id: item.id,
        geometry: {
          type: "Point",
          coordinates: [item.longitude, item.latitude],
        },
        properties: {
          id: item.id,
          wp_id: item.wpId,
          nopd: item.nopd,
          nama_op: item.namaOp,
          jenis_pajak: item.jenisPajak,
          alamat_op: item.alamatOp,
          pajak_bulanan: item.pajakBulanan,
          status_verifikasi: item.statusVerifikasi,
        },
      })),
    });
  });

  app.get("/api/objek-pajak/export", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const mode = parseObjekPajakExportMode(req.query.mode);
    if (!mode) {
      return res.status(400).json({ message: "mode export objek pajak tidak valid" });
    }

    const requestedJenis = req.query.jenisPajak;
    const jenisPajak = mode === "operational" ? parseJenisPajakOption(requestedJenis) : null;
    if (mode === "operational" && !jenisPajak) {
      return res.status(400).json({ message: "jenisPajak wajib valid untuk export operasional" });
    }

    const data = await storage.getAllObjekPajak(
      mode === "operational" && jenisPajak ? { jenisPajak } : undefined,
    );
    const attachmentMap = await buildAttachmentPresenceMap(
      "objek_pajak",
      data.map((op) => op.id),
    );
    const columns =
      mode === "template" || !jenisPajak
        ? [...OP_CSV_COLUMNS]
        : [...OP_CSV_BASE_COLUMNS, ...OP_OPERATIONAL_DETAIL_COLUMNS_BY_JENIS[jenisPajak]];
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
      lampiran: attachmentMap.get(op.id) ?? "",
      ...(mode === "template" || !jenisPajak
        ? flattenDetailForCsv(op.detailPajak)
        : buildOperationalDetailForCsv(op.detailPajak, jenisPajak)),
    }));

    const csv = stringify(rows, { header: true, columns });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${buildObjekPajakExportFileName(mode, jenisPajak)}`,
    );
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
          const payload = buildValidationErrorPayload(parsed.error, "Data OP tidak valid");
          errors.push(`Baris ${i + 2}: ${payload.fieldErrors.map((e) => e.message).join(", ")}`);
          continue;
        }

        try {
          const jenisPajak = await getJenisPajakFromRekId(parsed.data.rekPajakId);
          const detailCandidate = buildDetailFromCsvRow(row, jenisPajak);
          const detailParsed = validateDetailByJenis(jenisPajak, detailCandidate);
          if (!detailParsed.success) {
            failed++;
            const payload = buildValidationErrorPayload(detailParsed.error, "Detail pajak tidak valid");
            errors.push(`Baris ${i + 2}: ${payload.fieldErrors.map((e) => e.message).join(", ")}`);
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
          const normalized = normalizeObjekPajakMutationError(err);
          errors.push(`Baris ${i + 2}: ${normalized.message}`);
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
      return sendZodValidationError(res, parsed.error, "Data verifikasi tidak valid");
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

  app.get("/api/objek-pajak/:id/attachments", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID objek pajak tidak valid" });
    }

    const existing = await storage.getObjekPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }

    const rows = await storage.listEntityAttachments("objek_pajak", id);
    return res.json(rows.map(toAttachmentResponse));
  });

  app.post("/api/objek-pajak/:id/attachments", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID objek pajak tidak valid" });
    }

    try {
      await runSingleFileUpload(req, res);
      await assertAttachmentEntityExists("objek_pajak", id);

      if (!req.file) {
        return res.status(400).json({ message: "File attachment wajib diunggah" });
      }

      if (!ATTACHMENT_ALLOWED_MIME_TYPES.includes(req.file.mimetype as (typeof ATTACHMENT_ALLOWED_MIME_TYPES)[number])) {
        return res.status(400).json({ message: "Format file tidak didukung" });
      }

      const parsedMeta = entityAttachmentUploadMetadataSchema.safeParse(req.body);
      if (!parsedMeta.success) {
        return res.status(400).json({ message: "Metadata attachment tidak valid" });
      }

      if (!validateAttachmentDocumentType("objek_pajak", parsedMeta.data.documentType)) {
        return res.status(400).json({ message: "Jenis dokumen tidak valid untuk Objek Pajak" });
      }

      const savedFile = await saveAttachmentBuffer({
        entityType: "objek_pajak",
        entityId: id,
        documentType: parsedMeta.data.documentType,
        originalFileName: req.file.originalname,
        buffer: req.file.buffer,
      });

      try {
        const created = await storage.createEntityAttachment({
          id: savedFile.id,
          entityType: "objek_pajak",
          entityId: id,
          documentType: parsedMeta.data.documentType,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          storagePath: savedFile.storagePath,
          uploadedBy: getActorName(req),
          notes: parsedMeta.data.notes ?? null,
        });

        await writeAuditLog({
          entityType: "objek_pajak",
          entityId: id,
          action: "ATTACHMENT_UPLOAD",
          actorName: getActorName(req),
          beforeData: null,
          afterData: created,
          metadata: { source: "api", attachmentId: created.id, documentType: created.documentType },
        });

        return res.status(201).json(toAttachmentResponse(created));
      } catch (error) {
        await deleteAttachmentFile(savedFile.storagePath).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      const normalized = normalizeAttachmentUploadError(error);
      return res.status(normalized.status).json({ message: normalized.message });
    }
  });

  app.get("/api/objek-pajak/:id/attachments/:attachmentId/download", async (req, res) => {
    if (!requireRole(req, res, APP_ROLE_OPTIONS)) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID objek pajak tidak valid" });
    }

    const row = await storage.getEntityAttachment("objek_pajak", id, req.params.attachmentId);
    if (!row) {
      return res.status(404).json({ message: "Attachment tidak ditemukan" });
    }

    const buffer = await readFile(buildAttachmentDownloadPath(row.storagePath));
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${encodeURIComponent(row.fileName)}\"`);
    return res.send(buffer);
  });

  app.delete("/api/objek-pajak/:id/attachments/:attachmentId", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID objek pajak tidak valid" });
    }

    const removed = await storage.deleteEntityAttachment("objek_pajak", id, req.params.attachmentId);
    if (!removed) {
      return res.status(404).json({ message: "Attachment tidak ditemukan" });
    }

    await deleteAttachmentFile(removed.storagePath).catch(() => undefined);
    await writeAuditLog({
      entityType: "objek_pajak",
      entityId: id,
      action: "ATTACHMENT_DELETE",
      actorName: getActorName(req),
      beforeData: removed,
      afterData: null,
      metadata: { source: "api", attachmentId: removed.id, documentType: removed.documentType },
    });

    return res.json({ success: true });
  });

  app.post("/api/objek-pajak", async (req, res) => {
    if (!requireRole(req, res, ["admin", "editor"])) return;

    const normalized = normalizeOpData(req.body);
    const parsed = insertObjekPajakSchema.safeParse(normalized);
    if (!parsed.success) {
      return sendZodValidationError(res, parsed.error, "Data objek pajak tidak valid");
    }

    try {
      const jenisPajak = await getJenisPajakFromRekId(parsed.data.rekPajakId);
      const detailParsed = validateDetailByJenis(jenisPajak, parsed.data.detailPajak);
      if (!detailParsed.success) {
        return sendZodValidationError(res, detailParsed.error, "Detail objek pajak tidak valid");
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
    } catch (error) {
      const normalized = normalizeObjekPajakMutationError(error);
      res.status(normalized.status).json({
        message: normalized.message,
        fieldErrors: normalized.fieldErrors ?? [],
      });
    }
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
      return sendZodValidationError(res, parsed.error, "Data objek pajak tidak valid");
    }

    delete (parsed.data as Record<string, unknown>).statusVerifikasi;
    delete (parsed.data as Record<string, unknown>).catatanVerifikasi;
    delete (parsed.data as Record<string, unknown>).verifiedAt;
    delete (parsed.data as Record<string, unknown>).verifiedBy;

    try {
      const targetRekPajakId = parsed.data.rekPajakId ?? existing.rekPajakId;
      const targetJenis = await getJenisPajakFromRekId(targetRekPajakId);

      if (parsed.data.detailPajak !== undefined) {
        const detailParsed = validateDetailByJenis(targetJenis, parsed.data.detailPajak);
        if (!detailParsed.success) {
          return sendZodValidationError(res, detailParsed.error, "Detail objek pajak tidak valid");
        }
        parsed.data.detailPajak = detailParsed.data;
      }

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
    } catch (error) {
      const normalizedError = normalizeObjekPajakMutationError(error);
      res.status(normalizedError.status).json({
        message: normalizedError.message,
        fieldErrors: normalizedError.fieldErrors ?? [],
      });
    }
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




