import {
  type CreateWajibPajakInput,
  entityAttachment,
  type EntityAttachment,
  type InsertObjekPajak,
  type InsertUser,
  type MapObjekPajakItem,
  type MasterKecamatan,
  masterKecamatan,
  type MasterKelurahan,
  masterKelurahan,
  type MasterRekeningPajak,
  masterRekeningPajak,
  type ObjekPajak,
  type ObjekPajakDetail,
  type ObjekPajakListItem,
  type ObjekPajakRow,
  type PaginatedResult,
  type PaginationMeta,
  objekPajak,
  opDetailPajakAirTanah,
  opDetailPajakReklame,
  opDetailPajakWalet,
  opDetailPbjtHiburan,
  opDetailPbjtMakanMinum,
  opDetailPbjtParkir,
  opDetailPbjtPerhotelan,
  opDetailPbjtTenagaListrik,
  type UpdateWajibPajakPayload,
  type User,
  users,
  type WajibPajak,
  type WajibPajakListItem,
  wajibPajak,
  type WajibPajakWithBadanUsaha,
  type WpBadanUsaha,
  wpBadanUsaha,
  type WpBadanUsahaInput,
} from "@shared/schema";
import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env";
import { instrumentPoolForSlowQueryLogging } from "./observability";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
});
instrumentPoolForSlowQueryLogging(pool, env.SLOW_QUERY_MS);

export async function ensureDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to PostgreSQL using DATABASE_URL: ${message}`);
  }
}

export const db = drizzle(pool);

export async function closeDatabasePool() {
  await pool.end();
}

type DetailRecord = Record<string, unknown>;

type ObjekPajakFilter = {
  jenisPajak?: string;
  status?: string;
  kecamatan?: string;
  kecamatanId?: string;
};

type PaginationParams = {
  page: number;
  limit: number;
  cursor?: number;
};

type WajibPajakListFilter = PaginationParams & {
  q?: string;
  jenisWp?: string;
  peranWp?: string;
  statusAktif?: string;
};

type ObjekPajakListFilter = PaginationParams & {
  q?: string;
  status?: string;
  statusVerifikasi?: string;
  kecamatanId?: string;
  rekPajakId?: number;
  jenisPajak?: string;
};

type ObjekPajakMapFilter = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  q?: string;
  kecamatanId?: string;
  rekPajakId?: number;
  statusVerifikasi?: string;
  limit: number;
};

type AttachmentEntityType = "wajib_pajak" | "objek_pajak";

type CreateEntityAttachmentInput = {
  id: string;
  entityType: AttachmentEntityType;
  entityId: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  uploadedBy: string;
  notes?: string | null;
};

function cleanDetailObject(input: DetailRecord | null | undefined) {
  if (!input) return null;
  const cleaned = Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function toDecimalString(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return undefined;
  }

  return String(num);
}

function toInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return undefined;
  }

  return Math.trunc(num);
}

function toTimeString(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function hasAnyBadanUsahaValue(input: WpBadanUsahaInput | null | undefined) {
  if (!input) return false;
  return Object.values(input).some((value) => value !== null && value !== undefined);
}

function buildWpDisplayName(wp: WajibPajak, badanUsaha: WpBadanUsaha | null) {
  const candidates = [wp.namaWp, wp.namaPengelola, badanUsaha?.namaBadanUsaha];
  const first = candidates.find((item) => item && item.trim().length > 0);
  return first ?? "(tanpa nama)";
}

function toPaginationMeta(
  page: number,
  limit: number,
  total: number,
  options?: {
    mode?: "offset" | "cursor";
    cursor?: number | null;
    nextCursor?: number | null;
  },
): PaginationMeta {
  const safeTotal = Math.max(0, total);
  const totalPages = safeTotal === 0 ? 1 : Math.ceil(safeTotal / limit);
  const mode = options?.mode ?? "offset";
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNext: mode === "cursor" ? Boolean(options?.nextCursor) : page < totalPages,
    hasPrev: mode === "cursor" ? options?.cursor !== null && options?.cursor !== undefined : page > 1,
    mode,
    cursor: options?.cursor ?? null,
    nextCursor: options?.nextCursor ?? null,
  };
}

function mapWpRecord(record: { wp: WajibPajak; badanUsaha: WpBadanUsaha | null }): WajibPajakWithBadanUsaha {
  return {
    ...record.wp,
    badanUsaha: record.badanUsaha,
    displayName: buildWpDisplayName(record.wp, record.badanUsaha),
  };
}

function getDetailKind(jenisPajak: string) {
  if (jenisPajak.includes("Makanan")) return "makan_minum" as const;
  if (jenisPajak.includes("Perhotelan")) return "perhotelan" as const;
  if (jenisPajak.includes("Parkir")) return "parkir" as const;
  if (jenisPajak.includes("Kesenian") || jenisPajak.includes("Hiburan")) return "hiburan" as const;
  if (jenisPajak.includes("Tenaga Listrik")) return "tenaga_listrik" as const;
  if (jenisPajak.includes("Reklame")) return "reklame" as const;
  if (jenisPajak.includes("Air Tanah")) return "air_tanah" as const;
  if (jenisPajak.includes("Walet")) return "walet" as const;
  return null;
}

type ParsedNopd = {
  aa: string;
  bb: string;
  cc: string;
  sequence: string;
};

const INVALID_NOPD_MESSAGE = "Format NOPD salah, mohon diperiksa kembali";

function parseNopd(value: string): ParsedNopd | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    aa: match[1],
    bb: match[2],
    cc: match[3],
    sequence: match[4],
  };
}

function isGenericNopdJenis(jenisPajak: string, aa: string) {
  return jenisPajak === "Pajak Reklame" || jenisPajak === "Pajak MBLB" || aa === "09" || aa === "14";
}

function buildNopdPrefix(rekening: MasterRekeningPajak) {
  const segments = rekening.kodeRekening.split(".").map((segment) => segment.trim());
  if (segments.length < 6) {
    throw new Error(`Kode rekening tidak valid untuk pembentukan NOPD: ${rekening.kodeRekening}`);
  }

  const aa = segments[3];
  const bb = segments[4];
  const rincian = segments[5];
  const cc = rincian.slice(-2);

  if (!/^\d{2}$/.test(aa) || !/^\d{2}$/.test(bb) || !/^\d{4}$/.test(rincian) || !/^\d{2}$/.test(cc)) {
    throw new Error(`Kode rekening tidak valid untuk pembentukan NOPD: ${rekening.kodeRekening}`);
  }

  if (isGenericNopdJenis(rekening.jenisPajak, aa)) {
    return `${aa}.00.00`;
  }

  return `${aa}.${bb}.${cc}`;
}

function assertNopdMatchesRekening(nopd: string, rekening: MasterRekeningPajak) {
  const parsed = parseNopd(nopd);
  if (!parsed) {
    throw new Error(INVALID_NOPD_MESSAGE);
  }

  const expectedPrefix = buildNopdPrefix(rekening);
  const actualPrefix = `${parsed.aa}.${parsed.bb}.${parsed.cc}`;
  if (actualPrefix !== expectedPrefix) {
    throw new Error(INVALID_NOPD_MESSAGE);
  }
}

async function clearAllDetailTables(opId: number) {
  await Promise.all([
    db.delete(opDetailPbjtMakanMinum).where(eq(opDetailPbjtMakanMinum.opId, opId)),
    db.delete(opDetailPbjtPerhotelan).where(eq(opDetailPbjtPerhotelan.opId, opId)),
    db.delete(opDetailPbjtParkir).where(eq(opDetailPbjtParkir.opId, opId)),
    db.delete(opDetailPbjtHiburan).where(eq(opDetailPbjtHiburan.opId, opId)),
    db.delete(opDetailPbjtTenagaListrik).where(eq(opDetailPbjtTenagaListrik.opId, opId)),
    db.delete(opDetailPajakReklame).where(eq(opDetailPajakReklame.opId, opId)),
    db.delete(opDetailPajakAirTanah).where(eq(opDetailPajakAirTanah.opId, opId)),
    db.delete(opDetailPajakWalet).where(eq(opDetailPajakWalet.opId, opId)),
  ]);
}

async function upsertDetailByJenis(opId: number, jenisPajak: string, detail: unknown) {
  await clearAllDetailTables(opId);

  const kind = getDetailKind(jenisPajak);
  if (!kind || detail === null || detail === undefined) {
    return;
  }

  const detailValue = cleanDetailObject(detail as DetailRecord);
  if (!detailValue) {
    return;
  }

  if (kind === "makan_minum") {
    const values = {
      opId,
      jenisUsaha: String(detailValue.jenisUsaha ?? ""),
      klasifikasi: (detailValue.klasifikasi as string | undefined) ?? null,
      kapasitasTempat: toInteger(detailValue.kapasitasTempat) ?? 0,
      jumlahKaryawan: toInteger(detailValue.jumlahKaryawan),
      rata2Pengunjung: toInteger(detailValue.rata2Pengunjung),
      jamBuka: toTimeString(detailValue.jamBuka),
      jamTutup: toTimeString(detailValue.jamTutup),
      hargaTermurah: toDecimalString(detailValue.hargaTermurah),
      hargaTermahal: toDecimalString(detailValue.hargaTermahal),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPbjtMakanMinum)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPbjtMakanMinum.opId, set: values });
    return;
  }

  if (kind === "perhotelan") {
    const values = {
      opId,
      jenisUsaha: String(detailValue.jenisUsaha ?? ""),
      jumlahKamar: toInteger(detailValue.jumlahKamar) ?? 0,
      klasifikasi: (detailValue.klasifikasi as string | undefined) ?? null,
      fasilitas: toStringArray(detailValue.fasilitas) ?? null,
      rata2PengunjungHarian: toInteger(detailValue.rata2PengunjungHarian),
      hargaTermurah: toDecimalString(detailValue.hargaTermurah),
      hargaTermahal: toDecimalString(detailValue.hargaTermahal),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPbjtPerhotelan)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPbjtPerhotelan.opId, set: values });
    return;
  }

  if (kind === "parkir") {
    const values = {
      opId,
      jenisUsaha: String(detailValue.jenisUsaha ?? ""),
      jenisLokasi: String(detailValue.jenisLokasi ?? ""),
      kapasitasKendaraan: toInteger(detailValue.kapasitasKendaraan) ?? 0,
      tarifParkir: toDecimalString(detailValue.tarifParkir),
      rata2Pengunjung: toInteger(detailValue.rata2Pengunjung),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPbjtParkir)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPbjtParkir.opId, set: values });
    return;
  }

  if (kind === "hiburan") {
    const values = {
      opId,
      jenisHiburan: String(detailValue.jenisHiburan ?? ""),
      kapasitas: toInteger(detailValue.kapasitas) ?? 0,
      jamOperasional: (detailValue.jamOperasional as string | undefined) ?? null,
      jumlahKaryawan: toInteger(detailValue.jumlahKaryawan),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPbjtHiburan)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPbjtHiburan.opId, set: values });
    return;
  }

  if (kind === "tenaga_listrik") {
    const values = {
      opId,
      jenisTenagaListrik: String(detailValue.jenisTenagaListrik ?? ""),
      dayaListrik: toDecimalString(detailValue.dayaListrik) ?? "0",
      kapasitas: toDecimalString(detailValue.kapasitas),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPbjtTenagaListrik)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPbjtTenagaListrik.opId, set: values });
    return;
  }

  if (kind === "reklame") {
    const values = {
      opId,
      jenisReklame: String(detailValue.jenisReklame ?? ""),
      ukuranPanjang: toDecimalString(detailValue.ukuranPanjang) ?? "0",
      ukuranLebar: toDecimalString(detailValue.ukuranLebar) ?? "0",
      ukuranTinggi: toDecimalString(detailValue.ukuranTinggi) ?? "0",
      judulReklame: (detailValue.judulReklame as string | undefined) ?? null,
      masaBerlaku: (detailValue.masaBerlaku as string | undefined) ?? null,
      statusReklame: String(detailValue.statusReklame ?? "baru"),
      namaBiroJasa: (detailValue.namaBiroJasa as string | undefined) ?? null,
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPajakReklame)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPajakReklame.opId, set: values });
    return;
  }

  if (kind === "air_tanah") {
    const values = {
      opId,
      jenisAirTanah: String(detailValue.jenisAirTanah ?? ""),
      rata2UkuranPemakaian: toDecimalString(detailValue.rata2UkuranPemakaian) ?? "0",
      kriteriaAirTanah: (detailValue.kriteriaAirTanah as string | undefined) ?? null,
      kelompokUsaha: (detailValue.kelompokUsaha as string | undefined) ?? null,
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPajakAirTanah)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPajakAirTanah.opId, set: values });
    return;
  }

  if (kind === "walet") {
    const values = {
      opId,
      jenisBurungWalet: String(detailValue.jenisBurungWalet ?? ""),
      panenPerTahun: toInteger(detailValue.panenPerTahun) ?? 0,
      rata2BeratPanen: toDecimalString(detailValue.rata2BeratPanen),
      updatedAt: new Date(),
    };
    await db
      .insert(opDetailPajakWalet)
      .values(values)
      .onConflictDoUpdate({ target: opDetailPajakWalet.opId, set: values });
  }
}

async function buildDetailMap(opIds: number[]) {
  if (opIds.length === 0) {
    return new Map<number, ObjekPajakDetail>();
  }

  const [makanRows, hotelRows, parkirRows, hiburanRows, listrikRows, reklameRows, airRows, waletRows] =
    await Promise.all([
      db.select().from(opDetailPbjtMakanMinum).where(inArray(opDetailPbjtMakanMinum.opId, opIds)),
      db.select().from(opDetailPbjtPerhotelan).where(inArray(opDetailPbjtPerhotelan.opId, opIds)),
      db.select().from(opDetailPbjtParkir).where(inArray(opDetailPbjtParkir.opId, opIds)),
      db.select().from(opDetailPbjtHiburan).where(inArray(opDetailPbjtHiburan.opId, opIds)),
      db.select().from(opDetailPbjtTenagaListrik).where(inArray(opDetailPbjtTenagaListrik.opId, opIds)),
      db.select().from(opDetailPajakReklame).where(inArray(opDetailPajakReklame.opId, opIds)),
      db.select().from(opDetailPajakAirTanah).where(inArray(opDetailPajakAirTanah.opId, opIds)),
      db.select().from(opDetailPajakWalet).where(inArray(opDetailPajakWalet.opId, opIds)),
    ]);

  const detailMap = new Map<number, ObjekPajakDetail>();

  for (const row of makanRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisUsaha: row.jenisUsaha,
        klasifikasi: row.klasifikasi,
        kapasitasTempat: row.kapasitasTempat,
        jumlahKaryawan: row.jumlahKaryawan,
        rata2Pengunjung: row.rata2Pengunjung,
        jamBuka: row.jamBuka,
        jamTutup: row.jamTutup,
        hargaTermurah: row.hargaTermurah,
        hargaTermahal: row.hargaTermahal,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of hotelRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisUsaha: row.jenisUsaha,
        jumlahKamar: row.jumlahKamar,
        klasifikasi: row.klasifikasi,
        fasilitas: row.fasilitas ?? undefined,
        rata2PengunjungHarian: row.rata2PengunjungHarian,
        hargaTermurah: row.hargaTermurah,
        hargaTermahal: row.hargaTermahal,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of parkirRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisUsaha: row.jenisUsaha,
        jenisLokasi: row.jenisLokasi,
        kapasitasKendaraan: row.kapasitasKendaraan,
        tarifParkir: row.tarifParkir,
        rata2Pengunjung: row.rata2Pengunjung,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of hiburanRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisHiburan: row.jenisHiburan,
        kapasitas: row.kapasitas,
        jamOperasional: row.jamOperasional,
        jumlahKaryawan: row.jumlahKaryawan,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of listrikRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisTenagaListrik: row.jenisTenagaListrik,
        dayaListrik: row.dayaListrik,
        kapasitas: row.kapasitas,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of reklameRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisReklame: row.jenisReklame,
        ukuranPanjang: row.ukuranPanjang,
        ukuranLebar: row.ukuranLebar,
        ukuranTinggi: row.ukuranTinggi,
        judulReklame: row.judulReklame,
        masaBerlaku: row.masaBerlaku,
        statusReklame: row.statusReklame,
        namaBiroJasa: row.namaBiroJasa,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of airRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisAirTanah: row.jenisAirTanah,
        rata2UkuranPemakaian: row.rata2UkuranPemakaian,
        kriteriaAirTanah: row.kriteriaAirTanah,
        kelompokUsaha: row.kelompokUsaha,
      }) as ObjekPajakDetail,
    );
  }

  for (const row of waletRows) {
    detailMap.set(
      row.opId,
      cleanDetailObject({
        jenisBurungWalet: row.jenisBurungWalet,
        panenPerTahun: row.panenPerTahun,
        rata2BeratPanen: row.rata2BeratPanen,
      }) as ObjekPajakDetail,
    );
  }

  return detailMap;
}

function mapObjekPajakRecord(record: {
  op: ObjekPajakRow;
  rekening: MasterRekeningPajak | null;
  kecamatan: MasterKecamatan | null;
  kelurahan: MasterKelurahan | null;
}, detail: ObjekPajakDetail | null): ObjekPajak {
  const jenisPajak = record.rekening?.jenisPajak ?? "Pajak MBLB";

  return {
    ...record.op,
    detailPajak: detail ?? null,
    jenisPajak,
    noRekPajak: record.rekening?.kodeRekening ?? "",
    namaRekPajak: record.rekening?.namaRekening ?? "",
    kecamatan: record.kecamatan?.cpmKecamatan ?? null,
    kelurahan: record.kelurahan?.cpmKelurahan ?? null,
    rekeningPajak: record.rekening,
    kecamatanRef: record.kecamatan,
    kelurahanRef: record.kelurahan,
  };
}

function mapObjekPajakListRecord(record: {
  op: ObjekPajakRow;
  rekening: MasterRekeningPajak | null;
  kecamatan: MasterKecamatan | null;
  kelurahan: MasterKelurahan | null;
  hasDetail: boolean;
}): ObjekPajakListItem {
  return {
    id: record.op.id,
    nopd: record.op.nopd,
    wpId: record.op.wpId,
    rekPajakId: record.op.rekPajakId,
    namaOp: record.op.namaOp,
    npwpOp: record.op.npwpOp,
    alamatOp: record.op.alamatOp,
    kecamatanId: record.op.kecamatanId,
    kelurahanId: record.op.kelurahanId,
    omsetBulanan: record.op.omsetBulanan,
    tarifPersen: record.op.tarifPersen,
    pajakBulanan: record.op.pajakBulanan,
    latitude: record.op.latitude,
    longitude: record.op.longitude,
    status: record.op.status,
    statusVerifikasi: record.op.statusVerifikasi,
    catatanVerifikasi: record.op.catatanVerifikasi,
    verifiedAt: record.op.verifiedAt,
    verifiedBy: record.op.verifiedBy,
    createdAt: record.op.createdAt,
    updatedAt: record.op.updatedAt,
    jenisPajak: record.rekening?.jenisPajak ?? "Pajak MBLB",
    noRekPajak: record.rekening?.kodeRekening ?? "",
    namaRekPajak: record.rekening?.namaRekening ?? "",
    kecamatan: record.kecamatan?.cpmKecamatan ?? null,
    kelurahan: record.kelurahan?.cpmKelurahan ?? null,
    hasDetail: record.hasDetail,
  };
}

async function assertKelurahanDalamKecamatan(kelurahanId: string, kecamatanId: string) {
  const [row] = await db
    .select({
      kelurahan: masterKelurahan,
      kecamatan: masterKecamatan,
    })
    .from(masterKelurahan)
    .innerJoin(masterKecamatan, eq(masterKelurahan.cpmKodeKec, masterKecamatan.cpmKodeKec))
    .where(and(eq(masterKelurahan.cpmKelId, kelurahanId), eq(masterKecamatan.cpmKecId, kecamatanId)));

  if (!row) {
    throw new Error("Kelurahan tidak sesuai dengan kecamatan yang dipilih");
  }
}

async function getRekeningById(id: number) {
  const [rekening] = await db.select().from(masterRekeningPajak).where(eq(masterRekeningPajak.id, id));
  if (!rekening) {
    throw new Error("Rekening pajak tidak ditemukan");
  }
  return rekening;
}

async function resolveNopd(rekening: MasterRekeningPajak, nopdRaw?: string | null) {
  const cleaned = nopdRaw?.trim();
  if (cleaned) {
    assertNopdMatchesRekening(cleaned, rekening);
    return cleaned;
  }

  const prefix = buildNopdPrefix(rekening);
  const likePattern = `${prefix}.%`;
  const rows = await db.select({ nopd: objekPajak.nopd }).from(objekPajak).where(ilike(objekPajak.nopd, likePattern));

  let maxSeq = 0;
  for (const row of rows) {
    const parsed = parseNopd(row.nopd);
    if (!parsed) continue;
    const rowPrefix = `${parsed.aa}.${parsed.bb}.${parsed.cc}`;
    if (rowPrefix !== prefix) continue;
    const seq = Number.parseInt(parsed.sequence, 10);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}.${nextSeq}`;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllWajibPajak(): Promise<WajibPajakWithBadanUsaha[]>;
  getWajibPajakPage(filters: WajibPajakListFilter): Promise<PaginatedResult<WajibPajakListItem>>;
  getWajibPajak(id: number): Promise<WajibPajakWithBadanUsaha | undefined>;
  createWajibPajak(wp: CreateWajibPajakInput): Promise<WajibPajakWithBadanUsaha>;
  updateWajibPajak(id: number, wp: UpdateWajibPajakPayload): Promise<WajibPajakWithBadanUsaha>;
  deleteWajibPajak(id: number): Promise<void>;
  listEntityAttachments(entityType: AttachmentEntityType, entityId: number): Promise<EntityAttachment[]>;
  getEntityAttachment(entityType: AttachmentEntityType, entityId: number, attachmentId: string): Promise<EntityAttachment | undefined>;
  createEntityAttachment(input: CreateEntityAttachmentInput): Promise<EntityAttachment>;
  deleteEntityAttachment(entityType: AttachmentEntityType, entityId: number, attachmentId: string): Promise<EntityAttachment | undefined>;

  getAllMasterKecamatan(): Promise<MasterKecamatan[]>;
  getMasterKelurahan(kecamatanId?: string): Promise<MasterKelurahan[]>;
  getAllMasterRekeningPajak(): Promise<MasterRekeningPajak[]>;

  getAllObjekPajak(filters?: ObjekPajakFilter): Promise<ObjekPajak[]>;
  getObjekPajakPage(filters: ObjekPajakListFilter): Promise<PaginatedResult<ObjekPajakListItem>>;
  getObjekPajakMap(filters: ObjekPajakMapFilter): Promise<{ items: MapObjekPajakItem[]; totalInView: number; isCapped: boolean }>;
  getObjekPajak(id: number): Promise<ObjekPajak | undefined>;
  createObjekPajak(op: InsertObjekPajak): Promise<ObjekPajak>;
  updateObjekPajak(id: number, op: Partial<InsertObjekPajak>): Promise<ObjekPajak>;
  deleteObjekPajak(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllWajibPajak(): Promise<WajibPajakWithBadanUsaha[]> {
    const rows = await db
      .select({ wp: wajibPajak, badanUsaha: wpBadanUsaha })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId))
      .orderBy(asc(wajibPajak.id));

    return rows.map(mapWpRecord);
  }

  async getWajibPajakPage(filters: WajibPajakListFilter): Promise<PaginatedResult<WajibPajakListItem>> {
    const baseConditions: SQL[] = [];
    const cursor = filters.cursor ?? null;
    const offset = (filters.page - 1) * filters.limit;
    const useCursor = cursor !== null;

    if (filters.jenisWp) {
      baseConditions.push(eq(wajibPajak.jenisWp, filters.jenisWp));
    }

    if (filters.peranWp) {
      baseConditions.push(eq(wajibPajak.peranWp, filters.peranWp));
    }

    if (filters.statusAktif) {
      baseConditions.push(eq(wajibPajak.statusAktif, filters.statusAktif));
    }

    if (filters.q) {
      const like = `%${filters.q}%`;
      const searchCondition = or(
        ilike(wajibPajak.namaWp, like),
        ilike(wajibPajak.namaPengelola, like),
        ilike(wajibPajak.npwpd, like),
        ilike(wpBadanUsaha.namaBadanUsaha, like),
        ilike(wpBadanUsaha.npwpBadanUsaha, like),
      );
      if (searchCondition) {
        baseConditions.push(searchCondition);
      }
    }

    const dataConditions = [...baseConditions];
    if (useCursor && cursor !== null) {
      dataConditions.push(lt(wajibPajak.id, cursor));
    }

    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId));
    const countRows = baseConditions.length > 0 ? await countQuery.where(and(...baseConditions)) : await countQuery;
    const total = Number(countRows[0]?.count ?? 0);

    const baseDataQuery = (
      useCursor
        ? db
            .select({ wp: wajibPajak, badanUsaha: wpBadanUsaha })
            .from(wajibPajak)
            .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId))
            .orderBy(desc(wajibPajak.id))
            .limit(filters.limit + 1)
        : db
            .select({ wp: wajibPajak, badanUsaha: wpBadanUsaha })
            .from(wajibPajak)
            .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId))
            .orderBy(desc(wajibPajak.updatedAt), desc(wajibPajak.id))
            .limit(filters.limit)
            .offset(offset)
    ).$dynamic();

    const rows = dataConditions.length > 0 ? await baseDataQuery.where(and(...dataConditions)) : await baseDataQuery;
    const hasNext = useCursor ? rows.length > filters.limit : filters.page * filters.limit < total;
    const normalizedRows = useCursor ? rows.slice(0, filters.limit) : rows;
    const nextCursor = useCursor && hasNext ? normalizedRows[normalizedRows.length - 1]?.wp.id ?? null : null;

    return {
      items: normalizedRows.map(mapWpRecord),
      meta: toPaginationMeta(filters.page, filters.limit, total, {
        mode: useCursor ? "cursor" : "offset",
        cursor,
        nextCursor,
      }),
    };
  }

  async getWajibPajak(id: number): Promise<WajibPajakWithBadanUsaha | undefined> {
    const [row] = await db
      .select({ wp: wajibPajak, badanUsaha: wpBadanUsaha })
      .from(wajibPajak)
      .leftJoin(wpBadanUsaha, eq(wajibPajak.id, wpBadanUsaha.wpId))
      .where(eq(wajibPajak.id, id));

    if (!row) return undefined;
    return mapWpRecord(row);
  }

  async createWajibPajak(wp: CreateWajibPajakInput): Promise<WajibPajakWithBadanUsaha> {
    const { badanUsaha, ...wpValues } = wp;
    const now = new Date();

    const [created] = await db
      .insert(wajibPajak)
      .values({
        ...wpValues,
        updatedAt: now,
      })
      .returning();

    if (hasAnyBadanUsahaValue(badanUsaha)) {
      await db.insert(wpBadanUsaha).values({
        wpId: created.id,
        ...badanUsaha,
        createdAt: now,
        updatedAt: now,
      });
    }

    const saved = await this.getWajibPajak(created.id);
    if (!saved) {
      throw new Error("Wajib Pajak gagal dibuat");
    }

    return saved;
  }

  async updateWajibPajak(id: number, payload: UpdateWajibPajakPayload): Promise<WajibPajakWithBadanUsaha> {
    const { badanUsaha, ...wpUpdates } = payload;
    const now = new Date();

    const normalizedWpUpdates = Object.fromEntries(
      Object.entries(wpUpdates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(normalizedWpUpdates).length > 0) {
      await db
        .update(wajibPajak)
        .set({ ...normalizedWpUpdates, updatedAt: now })
        .where(eq(wajibPajak.id, id));
    }

    if (badanUsaha !== undefined) {
      if (!hasAnyBadanUsahaValue(badanUsaha)) {
        await db.delete(wpBadanUsaha).where(eq(wpBadanUsaha.wpId, id));
      } else {
        const values = {
          wpId: id,
          ...badanUsaha,
          updatedAt: now,
        };
        await db
          .insert(wpBadanUsaha)
          .values({ ...values, createdAt: now })
          .onConflictDoUpdate({
            target: wpBadanUsaha.wpId,
            set: values,
          });
      }
    }

    const updated = await this.getWajibPajak(id);
    if (!updated) {
      throw new Error("Wajib Pajak tidak ditemukan");
    }

    return updated;
  }

  async deleteWajibPajak(id: number): Promise<void> {
    await db.delete(wajibPajak).where(eq(wajibPajak.id, id));
  }

  async listEntityAttachments(entityType: AttachmentEntityType, entityId: number): Promise<EntityAttachment[]> {
    return db
      .select()
      .from(entityAttachment)
      .where(and(eq(entityAttachment.entityType, entityType), eq(entityAttachment.entityId, entityId)))
      .orderBy(desc(entityAttachment.uploadedAt), desc(entityAttachment.id));
  }

  async getEntityAttachment(
    entityType: AttachmentEntityType,
    entityId: number,
    attachmentId: string,
  ): Promise<EntityAttachment | undefined> {
    const [row] = await db
      .select()
      .from(entityAttachment)
      .where(
        and(
          eq(entityAttachment.entityType, entityType),
          eq(entityAttachment.entityId, entityId),
          eq(entityAttachment.id, attachmentId),
        ),
      )
      .limit(1);

    return row;
  }

  async createEntityAttachment(input: CreateEntityAttachmentInput): Promise<EntityAttachment> {
    const [created] = await db
      .insert(entityAttachment)
      .values({
        ...input,
        notes: input.notes ?? null,
        uploadedAt: new Date(),
      })
      .returning();

    return created;
  }

  async deleteEntityAttachment(
    entityType: AttachmentEntityType,
    entityId: number,
    attachmentId: string,
  ): Promise<EntityAttachment | undefined> {
    const existing = await this.getEntityAttachment(entityType, entityId, attachmentId);
    if (!existing) {
      return undefined;
    }

    await db.delete(entityAttachment).where(eq(entityAttachment.id, attachmentId));
    return existing;
  }

  async getAllMasterKecamatan(): Promise<MasterKecamatan[]> {
    return db.select().from(masterKecamatan).orderBy(asc(masterKecamatan.cpmKodeKec));
  }

  async getMasterKelurahan(kecamatanId?: string): Promise<MasterKelurahan[]> {
    if (!kecamatanId) {
      return db.select().from(masterKelurahan).orderBy(asc(masterKelurahan.cpmKodeKec), asc(masterKelurahan.cpmKodeKel));
    }

    const rows = await db
      .select({ kel: masterKelurahan })
      .from(masterKelurahan)
      .innerJoin(masterKecamatan, eq(masterKelurahan.cpmKodeKec, masterKecamatan.cpmKodeKec))
      .where(eq(masterKecamatan.cpmKecId, kecamatanId))
      .orderBy(asc(masterKelurahan.cpmKodeKel));

    return rows.map((row) => row.kel);
  }

  async getAllMasterRekeningPajak(): Promise<MasterRekeningPajak[]> {
    return db
      .select()
      .from(masterRekeningPajak)
      .where(eq(masterRekeningPajak.isActive, true))
      .orderBy(asc(masterRekeningPajak.kodeRekening));
  }

  async getAllObjekPajak(filters?: ObjekPajakFilter): Promise<ObjekPajak[]> {
    const conditions: SQL[] = [];

    if (filters?.status) {
      conditions.push(eq(objekPajak.status, filters.status));
    }

    if (filters?.kecamatanId) {
      conditions.push(eq(objekPajak.kecamatanId, filters.kecamatanId));
    }

    if (filters?.jenisPajak) {
      conditions.push(eq(masterRekeningPajak.jenisPajak, filters.jenisPajak));
    }

    if (filters?.kecamatan) {
      conditions.push(ilike(masterKecamatan.cpmKecamatan, `%${filters.kecamatan}%`));
    }

    const query = db
      .select({
        op: objekPajak,
        rekening: masterRekeningPajak,
        kecamatan: masterKecamatan,
        kelurahan: masterKelurahan,
      })
      .from(objekPajak)
      .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
      .leftJoin(masterKecamatan, eq(objekPajak.kecamatanId, masterKecamatan.cpmKecId))
      .leftJoin(masterKelurahan, eq(objekPajak.kelurahanId, masterKelurahan.cpmKelId));

    const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    const detailMap = await buildDetailMap(rows.map((row) => row.op.id));
    return rows.map((row) => mapObjekPajakRecord(row, detailMap.get(row.op.id) ?? null));
  }

  async getObjekPajakPage(filters: ObjekPajakListFilter): Promise<PaginatedResult<ObjekPajakListItem>> {
    const baseConditions: SQL[] = [];
    const cursor = filters.cursor ?? null;
    const offset = (filters.page - 1) * filters.limit;
    const useCursor = cursor !== null;

    if (filters.status) {
      baseConditions.push(eq(objekPajak.status, filters.status));
    }

    if (filters.statusVerifikasi) {
      baseConditions.push(eq(objekPajak.statusVerifikasi, filters.statusVerifikasi));
    }

    if (filters.kecamatanId) {
      baseConditions.push(eq(objekPajak.kecamatanId, filters.kecamatanId));
    }

    if (filters.rekPajakId) {
      baseConditions.push(eq(objekPajak.rekPajakId, filters.rekPajakId));
    }

    if (filters.jenisPajak) {
      baseConditions.push(eq(masterRekeningPajak.jenisPajak, filters.jenisPajak));
    }

    if (filters.q) {
      const like = `%${filters.q}%`;
      const searchCondition = or(
        ilike(objekPajak.namaOp, like),
        ilike(objekPajak.nopd, like),
        ilike(objekPajak.alamatOp, like),
      );
      if (searchCondition) {
        baseConditions.push(searchCondition);
      }
    }

    const dataConditions = [...baseConditions];
    if (useCursor && cursor !== null) {
      dataConditions.push(lt(objekPajak.id, cursor));
    }

    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(objekPajak)
      .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id));
    const countRows = baseConditions.length > 0 ? await countQuery.where(and(...baseConditions)) : await countQuery;
    const total = Number(countRows[0]?.count ?? 0);

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

    const baseDataQuery = (
      useCursor
        ? db
            .select({
              op: objekPajak,
              rekening: masterRekeningPajak,
              kecamatan: masterKecamatan,
              kelurahan: masterKelurahan,
              hasDetail: hasDetailExpr,
            })
            .from(objekPajak)
            .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
            .leftJoin(masterKecamatan, eq(objekPajak.kecamatanId, masterKecamatan.cpmKecId))
            .leftJoin(masterKelurahan, eq(objekPajak.kelurahanId, masterKelurahan.cpmKelId))
            .orderBy(desc(objekPajak.id))
            .limit(filters.limit + 1)
        : db
            .select({
              op: objekPajak,
              rekening: masterRekeningPajak,
              kecamatan: masterKecamatan,
              kelurahan: masterKelurahan,
              hasDetail: hasDetailExpr,
            })
            .from(objekPajak)
            .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
            .leftJoin(masterKecamatan, eq(objekPajak.kecamatanId, masterKecamatan.cpmKecId))
            .leftJoin(masterKelurahan, eq(objekPajak.kelurahanId, masterKelurahan.cpmKelId))
            .orderBy(desc(objekPajak.updatedAt), desc(objekPajak.id))
            .limit(filters.limit)
            .offset(offset)
    ).$dynamic();

    const rows = dataConditions.length > 0 ? await baseDataQuery.where(and(...dataConditions)) : await baseDataQuery;
    const hasNext = useCursor ? rows.length > filters.limit : filters.page * filters.limit < total;
    const normalizedRows = useCursor ? rows.slice(0, filters.limit) : rows;
    const nextCursor = useCursor ? (hasNext ? normalizedRows[normalizedRows.length - 1]?.op.id ?? null : null) : null;

    return {
      items: normalizedRows.map((row) => mapObjekPajakListRecord({ ...row, hasDetail: Boolean(row.hasDetail) })),
      meta: toPaginationMeta(filters.page, filters.limit, total, {
        mode: useCursor ? "cursor" : "offset",
        cursor,
        nextCursor,
      }),
    };
  }

  async getObjekPajakMap(filters: ObjekPajakMapFilter): Promise<{ items: MapObjekPajakItem[]; totalInView: number; isCapped: boolean }> {
    const conditions: SQL[] = [
      sql`${objekPajak.latitude} is not null`,
      sql`${objekPajak.longitude} is not null`,
      sql`cast(${objekPajak.latitude} as double precision) between ${filters.minLat} and ${filters.maxLat}`,
      sql`cast(${objekPajak.longitude} as double precision) between ${filters.minLng} and ${filters.maxLng}`,
    ];

    if (filters.statusVerifikasi) {
      conditions.push(eq(objekPajak.statusVerifikasi, filters.statusVerifikasi));
    }

    if (filters.kecamatanId) {
      conditions.push(eq(objekPajak.kecamatanId, filters.kecamatanId));
    }

    if (filters.rekPajakId) {
      conditions.push(eq(objekPajak.rekPajakId, filters.rekPajakId));
    }

    if (filters.q) {
      const like = `%${filters.q}%`;
      const searchCondition = or(
        ilike(objekPajak.namaOp, like),
        ilike(objekPajak.nopd, like),
        ilike(objekPajak.alamatOp, like),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(objekPajak)
      .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id));
    const countRows = await countQuery.where(and(...conditions));
    const totalInView = Number(countRows[0]?.count ?? 0);

    const rows = await db
      .select({
        id: objekPajak.id,
        wpId: objekPajak.wpId,
        nopd: objekPajak.nopd,
        namaOp: objekPajak.namaOp,
        alamatOp: objekPajak.alamatOp,
        pajakBulanan: objekPajak.pajakBulanan,
        statusVerifikasi: objekPajak.statusVerifikasi,
        jenisPajak: masterRekeningPajak.jenisPajak,
        latitude: sql<number>`cast(${objekPajak.latitude} as double precision)`,
        longitude: sql<number>`cast(${objekPajak.longitude} as double precision)`,
      })
      .from(objekPajak)
      .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
      .where(and(...conditions))
      .orderBy(desc(objekPajak.updatedAt), desc(objekPajak.id))
      .limit(filters.limit);

    const items: MapObjekPajakItem[] = rows.map((row) => ({
      id: row.id,
      wpId: row.wpId,
      nopd: row.nopd,
      namaOp: row.namaOp,
      jenisPajak: row.jenisPajak ?? "Pajak MBLB",
      alamatOp: row.alamatOp,
      pajakBulanan: row.pajakBulanan,
      statusVerifikasi: row.statusVerifikasi,
      latitude: row.latitude,
      longitude: row.longitude,
    }));

    return {
      items,
      totalInView,
      isCapped: totalInView > items.length,
    };
  }

  async getObjekPajak(id: number): Promise<ObjekPajak | undefined> {
    const [row] = await db
      .select({
        op: objekPajak,
        rekening: masterRekeningPajak,
        kecamatan: masterKecamatan,
        kelurahan: masterKelurahan,
      })
      .from(objekPajak)
      .leftJoin(masterRekeningPajak, eq(objekPajak.rekPajakId, masterRekeningPajak.id))
      .leftJoin(masterKecamatan, eq(objekPajak.kecamatanId, masterKecamatan.cpmKecId))
      .leftJoin(masterKelurahan, eq(objekPajak.kelurahanId, masterKelurahan.cpmKelId))
      .where(eq(objekPajak.id, id));

    if (!row) return undefined;

    const detailMap = await buildDetailMap([id]);
    return mapObjekPajakRecord(row, detailMap.get(id) ?? null);
  }

  async createObjekPajak(op: InsertObjekPajak): Promise<ObjekPajak> {
    const { detailPajak, nopd, ...base } = op;
    const now = new Date();
    const rekening = await getRekeningById(base.rekPajakId);
    const finalNopd = await resolveNopd(rekening, nopd ?? undefined);
    await assertKelurahanDalamKecamatan(base.kelurahanId, base.kecamatanId);

    const [created] = await db
      .insert(objekPajak)
      .values({
        ...base,
        nopd: finalNopd,
        npwpOp: base.npwpOp ?? null,
        updatedAt: now,
      })
      .returning();

    await upsertDetailByJenis(created.id, rekening.jenisPajak, detailPajak);

    const hydrated = await this.getObjekPajak(created.id);
    if (!hydrated) {
      throw new Error("Objek Pajak gagal dibuat");
    }

    return hydrated;
  }

  async updateObjekPajak(id: number, op: Partial<InsertObjekPajak>): Promise<ObjekPajak> {
    const current = await this.getObjekPajak(id);
    if (!current) {
      throw new Error("Objek Pajak tidak ditemukan");
    }

    const nextRekPajakId = op.rekPajakId ?? current.rekPajakId;
    const rekening = await getRekeningById(nextRekPajakId);

    const nextKecamatanId = op.kecamatanId ?? current.kecamatanId;
    const nextKelurahanId = op.kelurahanId ?? current.kelurahanId;
    await assertKelurahanDalamKecamatan(nextKelurahanId, nextKecamatanId);

    let nextNopd = current.nopd;
    if (op.nopd !== undefined) {
      nextNopd = await resolveNopd(rekening, op.nopd);
    } else if (nextRekPajakId !== current.rekPajakId) {
      nextNopd = await resolveNopd(rekening, current.nopd);
    }

    const detailBaru =
      op.detailPajak !== undefined
        ? op.detailPajak
        : op.rekPajakId && op.rekPajakId !== current.rekPajakId
          ? null
          : current.detailPajak;

    const updatePayload: Partial<ObjekPajakRow> = {
      nopd: nextNopd,
      wpId: op.wpId ?? current.wpId,
      rekPajakId: nextRekPajakId,
      namaOp: op.namaOp ?? current.namaOp,
      npwpOp: op.npwpOp !== undefined ? op.npwpOp : current.npwpOp,
      alamatOp: op.alamatOp ?? current.alamatOp,
      kecamatanId: nextKecamatanId,
      kelurahanId: nextKelurahanId,
      omsetBulanan: op.omsetBulanan !== undefined ? op.omsetBulanan : current.omsetBulanan,
      tarifPersen: op.tarifPersen !== undefined ? op.tarifPersen : current.tarifPersen,
      pajakBulanan: op.pajakBulanan !== undefined ? op.pajakBulanan : current.pajakBulanan,
      latitude: op.latitude !== undefined ? op.latitude : current.latitude,
      longitude: op.longitude !== undefined ? op.longitude : current.longitude,
      status: op.status ?? current.status,
      updatedAt: new Date(),
    };

    await db.update(objekPajak).set(updatePayload).where(eq(objekPajak.id, id));
    await upsertDetailByJenis(id, rekening.jenisPajak, detailBaru);

    const hydrated = await this.getObjekPajak(id);
    if (!hydrated) {
      throw new Error("Objek Pajak gagal diperbarui");
    }

    return hydrated;
  }

  async deleteObjekPajak(id: number): Promise<void> {
    await clearAllDetailTables(id);
    await db.delete(objekPajak).where(eq(objekPajak.id, id));
  }
}

export const storage = new DatabaseStorage();


