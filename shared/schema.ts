import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
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
} from "./pbjt-options";
export {
  PBJT_HIBURAN_JENIS_HIBURAN_OPTIONS,
  PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS,
  PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS,
  PBJT_PARKIR_JENIS_LOKASI_OPTIONS,
  PBJT_PARKIR_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS,
  PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS,
  PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS,
  PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS,
} from "./pbjt-options";

export const STATUS_OPTIONS = ["active", "inactive"] as const;
export const REKLAME_STATUS_OPTIONS = ["baru", "perpanjangan"] as const;
export const JENIS_WP_OPTIONS = ["orang_pribadi", "badan_usaha"] as const;
export const PERAN_WP_OPTIONS = ["pemilik", "pengelola"] as const;
export const VERIFICATION_STATUS_OPTIONS = ["draft", "verified", "rejected"] as const;
export const APP_ROLE_OPTIONS = ["admin", "editor", "viewer"] as const;

export const JENIS_PAJAK_OPTIONS = [
  "PBJT Makanan dan Minuman",
  "PBJT Jasa Perhotelan",
  "PBJT Jasa Parkir",
  "PBJT Jasa Kesenian dan Hiburan",
  "PBJT Tenaga Listrik",
  "Pajak Reklame",
  "Pajak Air Tanah",
  "Pajak Sarang Burung Walet",
  "Pajak MBLB",
] as const;

export type JenisPajak = (typeof JENIS_PAJAK_OPTIONS)[number];
export type JenisWp = (typeof JENIS_WP_OPTIONS)[number];
export type PeranWp = (typeof PERAN_WP_OPTIONS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUS_OPTIONS)[number];
export type AppRole = (typeof APP_ROLE_OPTIONS)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("viewer"),
});

export const wajibPajak = pgTable(
  "wajib_pajak",
  {
    id: serial("id").primaryKey(),
    jenisWp: varchar("jenis_wp", { length: 20 }).notNull(),
    peranWp: varchar("peran_wp", { length: 20 }).notNull(),
    npwpd: varchar("npwpd", { length: 30 }),
    statusAktif: varchar("status_aktif", { length: 20 }).notNull().default("active"),

    namaWp: text("nama_wp"),
    nikKtpWp: varchar("nik_ktp_wp", { length: 32 }),
    alamatWp: text("alamat_wp"),
    kecamatanWp: text("kecamatan_wp"),
    kelurahanWp: text("kelurahan_wp"),
    teleponWaWp: varchar("telepon_wa_wp", { length: 20 }),
    emailWp: varchar("email_wp", { length: 255 }),

    namaPengelola: text("nama_pengelola"),
    nikPengelola: varchar("nik_pengelola", { length: 32 }),
    alamatPengelola: text("alamat_pengelola"),
    kecamatanPengelola: text("kecamatan_pengelola"),
    kelurahanPengelola: text("kelurahan_pengelola"),
    teleponWaPengelola: varchar("telepon_wa_pengelola", { length: 20 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    npwpdUniqueNotNull: uniqueIndex("wajib_pajak_npwpd_unique_not_null")
      .on(table.npwpd)
      .where(sql`${table.npwpd} is not null`),
  }),
);

export const wpBadanUsaha = pgTable("wp_badan_usaha", {
  wpId: integer("wp_id")
    .primaryKey()
    .references(() => wajibPajak.id, { onDelete: "cascade" }),
  namaBadanUsaha: text("nama_badan_usaha"),
  npwpBadanUsaha: varchar("npwp_badan_usaha", { length: 32 }),
  alamatBadanUsaha: text("alamat_badan_usaha"),
  kecamatanBadanUsaha: text("kecamatan_badan_usaha"),
  kelurahanBadanUsaha: text("kelurahan_badan_usaha"),
  teleponBadanUsaha: varchar("telepon_badan_usaha", { length: 20 }),
  emailBadanUsaha: varchar("email_badan_usaha", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const masterKecamatan = pgTable("master_kecamatan", {
  cpmKecId: varchar("cpm_kec_id", { length: 16 }).primaryKey(),
  cpmKecamatan: text("cpm_kecamatan").notNull(),
  cpmKodeKec: varchar("cpm_kode_kec", { length: 4 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const masterKelurahan = pgTable(
  "master_kelurahan",
  {
    cpmKelId: varchar("cpm_kel_id", { length: 16 }).primaryKey(),
    cpmKelurahan: text("cpm_kelurahan").notNull(),
    cpmKodeKec: varchar("cpm_kode_kec", { length: 4 })
      .notNull()
      .references(() => masterKecamatan.cpmKodeKec),
    cpmKodeKel: varchar("cpm_kode_kel", { length: 4 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueKodeKel: uniqueIndex("master_kelurahan_unique_kode").on(table.cpmKodeKec, table.cpmKodeKel),
  }),
);

export const masterRekeningPajak = pgTable("master_rekening_pajak", {
  id: serial("id").primaryKey(),
  kodeRekening: varchar("kode_rekening", { length: 30 }).notNull().unique(),
  namaRekening: text("nama_rekening").notNull(),
  jenisPajak: text("jenis_pajak").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const objekPajak = pgTable(
  "objek_pajak",
  {
    id: serial("id").primaryKey(),
    nopd: varchar("nopd", { length: 30 }).notNull(),
    wpId: integer("wp_id")
      .notNull()
      .references(() => wajibPajak.id),
    rekPajakId: integer("rek_pajak_id")
      .notNull()
      .references(() => masterRekeningPajak.id),
    namaOp: text("nama_op").notNull(),
    npwpOp: varchar("npwp_op", { length: 32 }),
    alamatOp: text("alamat_op").notNull(),
    kecamatanId: varchar("kecamatan_id", { length: 16 })
      .notNull()
      .references(() => masterKecamatan.cpmKecId),
    kelurahanId: varchar("kelurahan_id", { length: 16 })
      .notNull()
      .references(() => masterKelurahan.cpmKelId),
    omsetBulanan: decimal("omset_bulanan", { precision: 15, scale: 2 }),
    tarifPersen: decimal("tarif_persen", { precision: 5, scale: 2 }),
    pajakBulanan: decimal("pajak_bulanan", { precision: 15, scale: 2 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    statusVerifikasi: varchar("status_verifikasi", { length: 20 }).notNull().default("draft"),
    catatanVerifikasi: text("catatan_verifikasi"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: varchar("verified_by", { length: 120 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nopdUnique: uniqueIndex("objek_pajak_nopd_unique").on(table.nopd),
  }),
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: varchar("entity_id", { length: 120 }).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  actorName: varchar("actor_name", { length: 120 }).notNull().default("system"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const opDetailPbjtMakanMinum = pgTable("op_detail_pbjt_makan_minum", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisUsaha: text("jenis_usaha").notNull(),
  klasifikasi: text("klasifikasi"),
  kapasitasTempat: integer("kapasitas_tempat").notNull(),
  jumlahKaryawan: integer("jumlah_karyawan"),
  rata2Pengunjung: integer("rata2_pengunjung"),
  jamBuka: time("jam_buka"),
  jamTutup: time("jam_tutup"),
  hargaTermurah: decimal("harga_termurah", { precision: 15, scale: 2 }),
  hargaTermahal: decimal("harga_termahal", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPbjtPerhotelan = pgTable("op_detail_pbjt_perhotelan", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisUsaha: text("jenis_usaha").notNull(),
  jumlahKamar: integer("jumlah_kamar").notNull(),
  klasifikasi: text("klasifikasi"),
  fasilitas: text("fasilitas").array(),
  rata2PengunjungHarian: integer("rata2_pengunjung_harian"),
  hargaTermurah: decimal("harga_termurah", { precision: 15, scale: 2 }),
  hargaTermahal: decimal("harga_termahal", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPbjtHiburan = pgTable("op_detail_pbjt_hiburan", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisHiburan: text("jenis_hiburan").notNull(),
  kapasitas: integer("kapasitas").notNull(),
  jamOperasional: text("jam_operasional"),
  jumlahKaryawan: integer("jumlah_karyawan"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPbjtParkir = pgTable("op_detail_pbjt_parkir", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisUsaha: text("jenis_usaha").notNull(),
  jenisLokasi: text("jenis_lokasi").notNull(),
  kapasitasKendaraan: integer("kapasitas_kendaraan").notNull(),
  tarifParkir: decimal("tarif_parkir", { precision: 15, scale: 2 }),
  rata2Pengunjung: integer("rata2_pengunjung"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPbjtTenagaListrik = pgTable("op_detail_pbjt_tenaga_listrik", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisTenagaListrik: text("jenis_tenaga_listrik").notNull(),
  dayaListrik: decimal("daya_listrik", { precision: 15, scale: 2 }).notNull(),
  kapasitas: decimal("kapasitas", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPajakReklame = pgTable("op_detail_pajak_reklame", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisReklame: text("jenis_reklame").notNull(),
  ukuranPanjang: decimal("ukuran_panjang", { precision: 15, scale: 2 }).notNull(),
  ukuranLebar: decimal("ukuran_lebar", { precision: 15, scale: 2 }).notNull(),
  ukuranTinggi: decimal("ukuran_tinggi", { precision: 15, scale: 2 }).notNull(),
  judulReklame: text("judul_reklame"),
  masaBerlaku: text("masa_berlaku"),
  statusReklame: varchar("status_reklame", { length: 20 }).notNull(),
  namaBiroJasa: text("nama_biro_jasa"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPajakAirTanah = pgTable("op_detail_pajak_air_tanah", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisAirTanah: text("jenis_air_tanah").notNull(),
  rata2UkuranPemakaian: decimal("rata2_ukuran_pemakaian", { precision: 15, scale: 2 }).notNull(),
  kriteriaAirTanah: text("kriteria_air_tanah"),
  kelompokUsaha: text("kelompok_usaha"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const opDetailPajakWalet = pgTable("op_detail_pajak_walet", {
  opId: integer("op_id")
    .primaryKey()
    .references(() => objekPajak.id, { onDelete: "cascade" }),
  jenisBurungWalet: text("jenis_burung_walet").notNull(),
  panenPerTahun: integer("panen_per_tahun").notNull(),
  rata2BeratPanen: decimal("rata2_berat_panen", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const nullableTrimmedString = z.string().trim().min(1).max(255).nullable().optional();
const nullableEmail = z.string().trim().email().nullable().optional();

export const wpBadanUsahaInputSchema = z
  .object({
    namaBadanUsaha: nullableTrimmedString,
    npwpBadanUsaha: z.string().trim().min(1).max(32).nullable().optional(),
    alamatBadanUsaha: nullableTrimmedString,
    kecamatanBadanUsaha: nullableTrimmedString,
    kelurahanBadanUsaha: nullableTrimmedString,
    teleponBadanUsaha: z.string().trim().min(1).max(20).nullable().optional(),
    emailBadanUsaha: nullableEmail,
  })
  .strict();

function hasBadanUsahaValue(badan: z.infer<typeof wpBadanUsahaInputSchema> | null | undefined) {
  if (!badan) return false;
  return Object.values(badan).some((value) => value !== null && value !== undefined);
}

export const wajibPajakResolvedSchema = z
  .object({
    jenisWp: z.enum(JENIS_WP_OPTIONS),
    peranWp: z.enum(PERAN_WP_OPTIONS),
    npwpd: z.string().trim().min(1).max(30).nullable().optional(),
    statusAktif: z.enum(STATUS_OPTIONS).default("active"),

    namaWp: nullableTrimmedString,
    nikKtpWp: z.string().trim().min(1).max(32).nullable().optional(),
    alamatWp: nullableTrimmedString,
    kecamatanWp: nullableTrimmedString,
    kelurahanWp: nullableTrimmedString,
    teleponWaWp: z.string().trim().min(1).max(20).nullable().optional(),
    emailWp: nullableEmail,

    namaPengelola: nullableTrimmedString,
    nikPengelola: z.string().trim().min(1).max(32).nullable().optional(),
    alamatPengelola: nullableTrimmedString,
    kecamatanPengelola: nullableTrimmedString,
    kelurahanPengelola: nullableTrimmedString,
    teleponWaPengelola: z.string().trim().min(1).max(20).nullable().optional(),

    badanUsaha: wpBadanUsahaInputSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const requireFields = (paths: Array<keyof typeof data>, messagePrefix: string) => {
      for (const path of paths) {
        const value = data[path];
        if (value === null || value === undefined || value === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: `${messagePrefix} wajib diisi`,
          });
        }
      }
    };

    if (data.peranWp === "pemilik") {
      requireFields(
        ["namaWp", "nikKtpWp", "alamatWp", "kecamatanWp", "kelurahanWp", "teleponWaWp"],
        "Data pemilik",
      );
    }

    if (data.peranWp === "pengelola") {
      requireFields(
        [
          "namaPengelola",
          "nikPengelola",
          "alamatPengelola",
          "kecamatanPengelola",
          "kelurahanPengelola",
          "teleponWaPengelola",
        ],
        "Data pengelola",
      );
    }

    const badanUsahaHasValue = hasBadanUsahaValue(data.badanUsaha);

    if (data.jenisWp === "orang_pribadi" && badanUsahaHasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["badanUsaha"],
        message: "Data badan usaha hanya boleh diisi jika jenis_wp = badan_usaha",
      });
    }

    if (data.jenisWp === "badan_usaha" && data.peranWp === "pemilik") {
      if (!data.badanUsaha) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["badanUsaha"],
          message: "Data badan usaha wajib diisi untuk pemilik dengan jenis_wp badan_usaha",
        });
        return;
      }

      const requiredBadanUsahaFields: Array<keyof z.infer<typeof wpBadanUsahaInputSchema>> = [
        "namaBadanUsaha",
        "npwpBadanUsaha",
        "alamatBadanUsaha",
        "kecamatanBadanUsaha",
        "kelurahanBadanUsaha",
        "teleponBadanUsaha",
      ];

      for (const field of requiredBadanUsahaFields) {
        const value = data.badanUsaha[field];
        if (value === null || value === undefined || value === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["badanUsaha", field],
            message: "Field badan usaha wajib diisi",
          });
        }
      }
    }
  });

export const createWajibPajakSchema = wajibPajakResolvedSchema.superRefine((data, ctx) => {
  if (data.npwpd !== null && data.npwpd !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["npwpd"],
      message: "NPWPD tidak boleh diisi saat pembuatan data baru",
    });
  }
});

export const updateWajibPajakPayloadSchema = z
  .object({
    jenisWp: z.enum(JENIS_WP_OPTIONS).optional(),
    peranWp: z.enum(PERAN_WP_OPTIONS).optional(),
    npwpd: z.string().trim().min(1).max(30).nullable().optional(),
    statusAktif: z.enum(STATUS_OPTIONS).optional(),

    namaWp: nullableTrimmedString,
    nikKtpWp: z.string().trim().min(1).max(32).nullable().optional(),
    alamatWp: nullableTrimmedString,
    kecamatanWp: nullableTrimmedString,
    kelurahanWp: nullableTrimmedString,
    teleponWaWp: z.string().trim().min(1).max(20).nullable().optional(),
    emailWp: nullableEmail,

    namaPengelola: nullableTrimmedString,
    nikPengelola: z.string().trim().min(1).max(32).nullable().optional(),
    alamatPengelola: nullableTrimmedString,
    kecamatanPengelola: nullableTrimmedString,
    kelurahanPengelola: nullableTrimmedString,
    teleponWaPengelola: z.string().trim().min(1).max(20).nullable().optional(),

    badanUsaha: wpBadanUsahaInputSchema.nullable().optional(),
  })
  .strict();

export const detailPbjtMakananSchema = z
  .object({
    jenisUsaha: z.enum(PBJT_MAKANAN_MINUMAN_JENIS_USAHA_OPTIONS),
    klasifikasi: z.enum(PBJT_MAKANAN_MINUMAN_KLASIFIKASI_RESTORAN_OPTIONS).optional(),
    kapasitasTempat: z.coerce.number().int().positive(),
    jumlahKaryawan: z.coerce.number().int().positive().optional(),
    rata2Pengunjung: z.coerce.number().int().positive().optional(),
    jamBuka: z.string().trim().min(1).optional(),
    jamTutup: z.string().trim().min(1).optional(),
    hargaTermurah: z.coerce.number().positive().optional(),
    hargaTermahal: z.coerce.number().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.jenisUsaha === "Restoran" && !data.klasifikasi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["klasifikasi"],
        message: "Klasifikasi wajib dipilih untuk jenis usaha Restoran",
      });
    }

    if (data.jenisUsaha !== "Restoran" && data.klasifikasi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["klasifikasi"],
        message: "Klasifikasi hanya berlaku untuk jenis usaha Restoran",
      });
    }
  });

export const detailPbjtPerhotelanSchema = z
  .object({
    jenisUsaha: z.enum(PBJT_PERHOTELAN_JENIS_USAHA_OPTIONS),
    jumlahKamar: z.coerce.number().int().positive(),
    klasifikasi: z.enum(PBJT_PERHOTELAN_KLASIFIKASI_OPTIONS).optional(),
    fasilitas: z.array(z.string().trim().min(1)).min(1).optional(),
    rata2PengunjungHarian: z.coerce.number().int().positive().optional(),
    hargaTermurah: z.coerce.number().positive().optional(),
    hargaTermahal: z.coerce.number().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const requiresKlasifikasi = PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS.includes(
      data.jenisUsaha as (typeof PBJT_PERHOTELAN_KLASIFIKASI_REQUIRED_JENIS)[number],
    );

    if (requiresKlasifikasi && !data.klasifikasi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["klasifikasi"],
        message: "Klasifikasi wajib dipilih untuk Hotel/Hostel atau Motel/Losmen",
      });
    }

    if (!requiresKlasifikasi && data.klasifikasi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["klasifikasi"],
        message: "Klasifikasi hanya berlaku untuk Hotel/Hostel atau Motel/Losmen",
      });
    }
  });

export const detailPbjtHiburanSchema = z
  .object({
    jenisHiburan: z.string().trim().min(1),
    kapasitas: z.coerce.number().int().positive(),
    jamOperasional: z.string().trim().min(1).optional(),
    jumlahKaryawan: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.jenisHiburan === "Lainnya") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jenisHiburan"],
        message: "Jenis hiburan lainnya wajib diisi",
      });
    }
  });

export const detailPbjtParkirSchema = z
  .object({
    jenisUsaha: z.enum(PBJT_PARKIR_JENIS_USAHA_OPTIONS),
    jenisLokasi: z.enum(PBJT_PARKIR_JENIS_LOKASI_OPTIONS),
    kapasitasKendaraan: z.coerce.number().int().positive(),
    tarifParkir: z.coerce.number().positive().optional(),
    rata2Pengunjung: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const detailPbjtTenagaListrikSchema = z
  .object({
    jenisTenagaListrik: z.enum(PBJT_TENAGA_LISTRIK_JENIS_USAHA_OPTIONS),
    dayaListrik: z.coerce.number().positive(),
    kapasitas: z.coerce.number().positive().optional(),
  })
  .strict();

export const detailPajakReklameSchema = z
  .object({
    jenisReklame: z.string().trim().min(1),
    ukuranPanjang: z.coerce.number().positive(),
    ukuranLebar: z.coerce.number().positive(),
    ukuranTinggi: z.coerce.number().positive(),
    judulReklame: z.string().trim().min(1).optional(),
    masaBerlaku: z.string().trim().min(1).optional(),
    statusReklame: z.enum(REKLAME_STATUS_OPTIONS),
    namaBiroJasa: z.string().trim().min(1).optional(),
  })
  .strict();

export const detailPajakAirTanahSchema = z
  .object({
    jenisAirTanah: z.string().trim().min(1),
    rata2UkuranPemakaian: z.coerce.number().positive(),
    kriteriaAirTanah: z.string().trim().min(1).optional(),
    kelompokUsaha: z.string().trim().min(1).optional(),
  })
  .strict();

export const detailPajakWaletSchema = z
  .object({
    jenisBurungWalet: z.string().trim().min(1),
    panenPerTahun: z.coerce.number().int().positive(),
    rata2BeratPanen: z.coerce.number().positive().optional(),
  })
  .strict();

export type DetailPBJTMakanMinum = z.infer<typeof detailPbjtMakananSchema>;
export type DetailPBJTPerhotelan = z.infer<typeof detailPbjtPerhotelanSchema>;
export type DetailPBJTHiburan = z.infer<typeof detailPbjtHiburanSchema>;
export type DetailPBJTParkir = z.infer<typeof detailPbjtParkirSchema>;
export type DetailPBJTTenagaListrik = z.infer<typeof detailPbjtTenagaListrikSchema>;
export type DetailPajakReklame = z.infer<typeof detailPajakReklameSchema>;
export type DetailPajakAirTanah = z.infer<typeof detailPajakAirTanahSchema>;
export type DetailPajakWalet = z.infer<typeof detailPajakWaletSchema>;

export type ObjekPajakDetail =
  | DetailPBJTMakanMinum
  | DetailPBJTPerhotelan
  | DetailPBJTHiburan
  | DetailPBJTParkir
  | DetailPBJTTenagaListrik
  | DetailPajakReklame
  | DetailPajakAirTanah
  | DetailPajakWalet;

export const DETAIL_SCHEMA_BY_JENIS: Record<string, z.ZodTypeAny> = {
  "PBJT Makanan dan Minuman": detailPbjtMakananSchema,
  "PBJT Jasa Perhotelan": detailPbjtPerhotelanSchema,
  "PBJT Jasa Parkir": detailPbjtParkirSchema,
  "PBJT Jasa Kesenian dan Hiburan": detailPbjtHiburanSchema,
  "PBJT Tenaga Listrik": detailPbjtTenagaListrikSchema,
  "Pajak Reklame": detailPajakReklameSchema,
  "Pajak Air Tanah": detailPajakAirTanahSchema,
  "Pajak Sarang Burung Walet": detailPajakWaletSchema,
};

export function validateDetailByJenis(jenisPajak: string, detailPajak: unknown) {
  if (detailPajak === null || detailPajak === undefined) {
    return { success: true as const, data: null };
  }

  const schema = DETAIL_SCHEMA_BY_JENIS[jenisPajak];
  if (!schema) {
    return { success: true as const, data: detailPajak };
  }

  return schema.safeParse(detailPajak);
}

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    role: true,
  })
  .extend({
    role: z.enum(APP_ROLE_OPTIONS).default("viewer"),
  });

export const insertObjekPajakSchema = createInsertSchema(objekPajak)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    nopd: z.string().trim().max(30).optional(),
    wpId: z.coerce.number().int().positive(),
    rekPajakId: z.coerce.number().int().positive(),
    namaOp: z.string().trim().min(1),
    npwpOp: z.string().trim().min(1).max(32).nullable().optional(),
    alamatOp: z.string().trim().min(1),
    kecamatanId: z.string().trim().min(1),
    kelurahanId: z.string().trim().min(1),
    status: z.enum(STATUS_OPTIONS).default("active"),
    statusVerifikasi: z.enum(VERIFICATION_STATUS_OPTIONS).optional().default("draft"),
    catatanVerifikasi: z.string().trim().max(1000).nullable().optional(),
    verifiedAt: z.date().nullable().optional(),
    verifiedBy: z.string().trim().min(1).max(120).nullable().optional(),
    detailPajak: z.unknown().nullable().optional(),
  });

export const masterKecamatanPayloadSchema = z.object({
  cpmKecId: z.string().trim().min(1).max(16).optional(),
  cpmKecamatan: z.string().trim().min(1),
  cpmKodeKec: z.string().trim().min(1).max(4),
});

export const masterKelurahanPayloadSchema = z.object({
  cpmKelId: z.string().trim().min(1).max(16).optional(),
  cpmKelurahan: z.string().trim().min(1),
  cpmKodeKec: z.string().trim().min(1).max(4),
  cpmKodeKel: z.string().trim().min(1).max(4),
});

export const masterRekeningPayloadSchema = z.object({
  kodeRekening: z.string().trim().min(1).max(30),
  namaRekening: z.string().trim().min(1),
  jenisPajak: z.string().trim().min(1),
  isActive: z.boolean().optional().default(true),
});

export const objekPajakVerificationSchema = z
  .object({
    statusVerifikasi: z.enum(VERIFICATION_STATUS_OPTIONS),
    catatanVerifikasi: z.string().trim().max(1000).nullable().optional(),
    verifierName: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.statusVerifikasi === "rejected") {
      const note = data.catatanVerifikasi?.trim();
      if (!note) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["catatanVerifikasi"],
          message: "Catatan verifikasi wajib diisi saat status rejected",
        });
      }
    }
  });

export const qualityCheckInputSchema = z.object({
  nikKtpWp: z.string().trim().max(32).optional(),
  nikPengelola: z.string().trim().max(32).optional(),
  npwpBadanUsaha: z.string().trim().max(32).optional(),
  npwpd: z.string().trim().max(30).optional(),
  excludeWpId: z.number().int().positive().optional(),
  nopd: z.string().trim().max(30).optional(),
  nama: z.string().trim().max(255).optional(),
  alamat: z.string().trim().max(500).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type WajibPajak = typeof wajibPajak.$inferSelect;
export type WpBadanUsaha = typeof wpBadanUsaha.$inferSelect;
export type WpBadanUsahaInput = z.infer<typeof wpBadanUsahaInputSchema>;
export type CreateWajibPajakInput = z.infer<typeof createWajibPajakSchema>;
export type UpdateWajibPajakPayload = z.infer<typeof updateWajibPajakPayloadSchema>;

export type WajibPajakWithBadanUsaha = WajibPajak & {
  badanUsaha: WpBadanUsaha | null;
  displayName: string;
};

export type MasterKecamatan = typeof masterKecamatan.$inferSelect;
export type MasterKelurahan = typeof masterKelurahan.$inferSelect;
export type MasterRekeningPajak = typeof masterRekeningPajak.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;

export type MasterKecamatanPayload = z.infer<typeof masterKecamatanPayloadSchema>;
export type MasterKelurahanPayload = z.infer<typeof masterKelurahanPayloadSchema>;
export type MasterRekeningPayload = z.infer<typeof masterRekeningPayloadSchema>;
export type ObjekPajakVerificationPayload = z.infer<typeof objekPajakVerificationSchema>;
export type QualityCheckInput = z.infer<typeof qualityCheckInputSchema>;

export type InsertObjekPajak = z.infer<typeof insertObjekPajakSchema>;
export type ObjekPajakRow = typeof objekPajak.$inferSelect;

export type ObjekPajak = ObjekPajakRow & {
  detailPajak: ObjekPajakDetail | null;
  jenisPajak: string;
  noRekPajak: string;
  namaRekPajak: string;
  kecamatan: string | null;
  kelurahan: string | null;
  rekeningPajak: MasterRekeningPajak | null;
  kecamatanRef: MasterKecamatan | null;
  kelurahanRef: MasterKelurahan | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  mode?: "offset" | "cursor";
  cursor?: number | null;
  nextCursor?: number | null;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type WajibPajakListItem = WajibPajakWithBadanUsaha;

export type ObjekPajakListItem = {
  id: number;
  nopd: string;
  wpId: number;
  rekPajakId: number;
  namaOp: string;
  npwpOp: string | null;
  alamatOp: string;
  kecamatanId: string;
  kelurahanId: string;
  omsetBulanan: string | null;
  tarifPersen: string | null;
  pajakBulanan: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string;
  statusVerifikasi: string;
  catatanVerifikasi: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  jenisPajak: string;
  noRekPajak: string;
  namaRekPajak: string;
  kecamatan: string | null;
  kelurahan: string | null;
  hasDetail: boolean;
};

export type MapObjekPajakItem = {
  id: number;
  wpId: number;
  nopd: string;
  namaOp: string;
  jenisPajak: string;
  alamatOp: string;
  pajakBulanan: string | null;
  statusVerifikasi: string;
  latitude: number;
  longitude: number;
};

export type OpDetailPbjtMakanMinum = typeof opDetailPbjtMakanMinum.$inferSelect;
export type OpDetailPbjtPerhotelan = typeof opDetailPbjtPerhotelan.$inferSelect;
export type OpDetailPbjtHiburan = typeof opDetailPbjtHiburan.$inferSelect;
export type OpDetailPbjtParkir = typeof opDetailPbjtParkir.$inferSelect;
export type OpDetailPbjtTenagaListrik = typeof opDetailPbjtTenagaListrik.$inferSelect;
export type OpDetailPajakReklame = typeof opDetailPajakReklame.$inferSelect;
export type OpDetailPajakAirTanah = typeof opDetailPajakAirTanah.$inferSelect;
export type OpDetailPajakWalet = typeof opDetailPajakWalet.$inferSelect;

