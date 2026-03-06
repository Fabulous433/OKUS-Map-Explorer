import {
  type CreateWajibPajakInput,
  type InsertObjekPajak,
  type InsertUser,
  type MasterKecamatan,
  masterKecamatan,
  type MasterKelurahan,
  masterKelurahan,
  type MasterRekeningPajak,
  masterRekeningPajak,
  type ObjekPajak,
  type ObjekPajakDetail,
  type ObjekPajakRow,
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
  wajibPajak,
  type WajibPajakWithBadanUsaha,
  type WpBadanUsaha,
  wpBadanUsaha,
  type WpBadanUsahaInput,
} from "@shared/schema";
import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export async function ensureDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to PostgreSQL using DATABASE_URL: ${message}`);
  }
}

export const db = drizzle(pool);

type DetailRecord = Record<string, unknown>;

type ObjekPajakFilter = {
  jenisPajak?: string;
  status?: string;
  kecamatan?: string;
  kecamatanId?: string;
};

function cleanDetailObject(input: DetailRecord | null | undefined) {
  if (!input) return null;
  const cleaned = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ""),
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

function hasAnyBadanUsahaValue(input: WpBadanUsahaInput | null | undefined) {
  if (!input) return false;
  return Object.values(input).some((value) => value !== null && value !== undefined);
}

function buildWpDisplayName(wp: WajibPajak, badanUsaha: WpBadanUsaha | null) {
  const candidates = [wp.namaWp, wp.namaPengelola, badanUsaha?.namaBadanUsaha];
  const first = candidates.find((item) => item && item.trim().length > 0);
  return first ?? "(tanpa nama)";
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

function isNopdFormatValid(value: string) {
  return /^OP\.321\.\d{3}\.\d{4}$/.test(value);
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
      fasilitas: (detailValue.fasilitas as string | undefined) ?? null,
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
      ukuranReklame: toDecimalString(detailValue.ukuranReklame) ?? "0",
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
        fasilitas: row.fasilitas,
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
        ukuranReklame: row.ukuranReklame,
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

async function resolveNopd(nopdRaw?: string | null) {
  const cleaned = nopdRaw?.trim();
  if (cleaned) {
    if (!isNopdFormatValid(cleaned)) {
      throw new Error("Format NOPD harus OP.321.XXX.YYYY");
    }
    return cleaned;
  }

  const year = new Date().getFullYear();
  const likePattern = `OP.321.%.${year}`;
  const rows = await db.select({ nopd: objekPajak.nopd }).from(objekPajak).where(ilike(objekPajak.nopd, likePattern));

  let maxSeq = 0;
  for (const row of rows) {
    const match = /^OP\.321\.(\d{3})\.\d{4}$/.exec(row.nopd);
    if (!match) continue;
    const seq = Number.parseInt(match[1], 10);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `OP.321.${nextSeq}.${year}`;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllWajibPajak(): Promise<WajibPajakWithBadanUsaha[]>;
  getWajibPajak(id: number): Promise<WajibPajakWithBadanUsaha | undefined>;
  createWajibPajak(wp: CreateWajibPajakInput): Promise<WajibPajakWithBadanUsaha>;
  updateWajibPajak(id: number, wp: UpdateWajibPajakPayload): Promise<WajibPajakWithBadanUsaha>;
  deleteWajibPajak(id: number): Promise<void>;

  getAllMasterKecamatan(): Promise<MasterKecamatan[]>;
  getMasterKelurahan(kecamatanId?: string): Promise<MasterKelurahan[]>;
  getAllMasterRekeningPajak(): Promise<MasterRekeningPajak[]>;

  getAllObjekPajak(filters?: ObjekPajakFilter): Promise<ObjekPajak[]>;
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
    const conditions = [];

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
    const finalNopd = await resolveNopd(nopd ?? undefined);

    const rekening = await getRekeningById(base.rekPajakId);
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
      nextNopd = await resolveNopd(op.nopd);
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


