import fs from "fs/promises";
import path from "path";
import { and, eq } from "drizzle-orm";
import { db, storage } from "./storage";
import { masterKecamatan, masterKelurahan, masterRekeningPajak, users } from "@shared/schema";
import { hashPassword, validatePasswordPolicy } from "./auth";

type RawKecamatan = {
  CPM_KEC_ID: string;
  CPM_KECAMATAN: string;
  CPM_KODE_KEC: string;
};

type RawKelurahan = {
  CPM_KEL_ID: string;
  CPM_KELURAHAN: string;
  CPM_KODE_KEC: string;
  CPM_KODE_KEL: string;
};

function log(message: string, source = "seed") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}
function jenisPajakFromNamaRekening(namaRekening: string) {
  if (namaRekening.includes("Makanan")) return "PBJT Makanan dan Minuman";
  if (namaRekening.includes("Tenaga Listrik")) return "PBJT Tenaga Listrik";
  if (namaRekening.includes("Perhotelan")) return "PBJT Jasa Perhotelan";
  if (namaRekening.includes("Parkir")) return "PBJT Jasa Parkir";
  if (namaRekening.includes("Kesenian") || namaRekening.includes("Hiburan")) return "PBJT Jasa Kesenian dan Hiburan";
  if (namaRekening.includes("Mineral Bukan Logam")) return "Pajak MBLB";
  return namaRekening;
}

const REKENING_DOC_ROWS = [
  { kodeRekening: "4.1.01.09.01.0001", namaRekening: "Pajak Reklame" },
  { kodeRekening: "4.1.01.12.01.0001", namaRekening: "Pajak Air Tanah" },
  { kodeRekening: "4.1.01.13.01.0001", namaRekening: "Pajak Sarang Burung Walet" },
  { kodeRekening: "4.1.01.14.01.0001", namaRekening: "Pajak Mineral Bukan Logam dan Batuan" },
  { kodeRekening: "4.1.01.19.01.0001", namaRekening: "PBJT - Makanan dan/atau Minuman" },
  { kodeRekening: "4.1.01.19.02.0001", namaRekening: "PBJT - Tenaga Listrik" },
  { kodeRekening: "4.1.01.19.03.0001", namaRekening: "PBJT - Jasa Perhotelan" },
  { kodeRekening: "4.1.01.19.04.0001", namaRekening: "PBJT - Jasa Parkir" },
  { kodeRekening: "4.1.01.19.05.0001", namaRekening: "PBJT - Jasa Kesenian dan Hiburan" },
] as const;

const DEFAULT_AUTH_USERS = [
  { username: "admin", password: "admin123", role: "admin" as const },
  { username: "editor", password: "editor123", role: "editor" as const },
  { username: "viewer", password: "viewer123", role: "viewer" as const },
] as const;

export async function seedAuthUsers() {
  for (const item of DEFAULT_AUTH_USERS) {
    const passwordCheck = validatePasswordPolicy(item.password);
    if (!passwordCheck.valid) {
      throw new Error(`Default auth user "${item.username}" melanggar password policy: ${passwordCheck.errors.join("; ")}`);
    }

    const [existing] = await db.select().from(users).where(eq(users.username, item.username)).limit(1);
    const hashed = hashPassword(item.password);

    if (!existing) {
      await db.insert(users).values({
        username: item.username,
        password: hashed,
        role: item.role,
      });
      continue;
    }

    const needsRoleUpdate = existing.role !== item.role;
    const needsPasswordUpdate = !existing.password.startsWith("pbkdf2$");
    if (needsRoleUpdate || needsPasswordUpdate) {
      await db
        .update(users)
        .set({
          role: item.role,
          password: needsPasswordUpdate ? hashed : existing.password,
        })
        .where(eq(users.id, existing.id));
    }
  }
}

export async function seedMasterWilayah() {
  const docsDir = path.resolve(process.cwd(), "docs");

  const rawKecamatan = await fs.readFile(path.join(docsDir, "PATDA_MST_KECAMATAN.json"), "utf-8");
  const rawKelurahan = await fs.readFile(path.join(docsDir, "PATDA_MST_KELURAHAN.json"), "utf-8");

  const kecamatanRows = JSON.parse(rawKecamatan) as RawKecamatan[];
  const kelurahanRows = JSON.parse(rawKelurahan) as RawKelurahan[];

  for (const row of kecamatanRows) {
    await db
      .insert(masterKecamatan)
      .values({
        cpmKecId: row.CPM_KEC_ID,
        cpmKecamatan: row.CPM_KECAMATAN,
        cpmKodeKec: row.CPM_KODE_KEC,
      })
      .onConflictDoNothing();
  }

  for (const row of kelurahanRows) {
    await db
      .insert(masterKelurahan)
      .values({
        cpmKelId: row.CPM_KEL_ID,
        cpmKelurahan: row.CPM_KELURAHAN,
        cpmKodeKec: row.CPM_KODE_KEC,
        cpmKodeKel: row.CPM_KODE_KEL,
      })
      .onConflictDoNothing();
  }
}

export async function seedMasterRekening() {
  for (const row of REKENING_DOC_ROWS) {
    await db
      .insert(masterRekeningPajak)
      .values({
        kodeRekening: row.kodeRekening,
        namaRekening: row.namaRekening,
        jenisPajak: jenisPajakFromNamaRekening(row.namaRekening),
      })
      .onConflictDoNothing();
  }
}

async function getKecamatanIdByName(nama: string) {
  const [row] = await db.select().from(masterKecamatan).where(eq(masterKecamatan.cpmKecamatan, nama));
  if (!row) throw new Error(`Master kecamatan tidak ditemukan: ${nama}`);
  return row.cpmKecId;
}

async function getKelurahanIdByName(nama: string, kecamatanId: string) {
  const [row] = await db
    .select({ kel: masterKelurahan })
    .from(masterKelurahan)
    .innerJoin(masterKecamatan, eq(masterKelurahan.cpmKodeKec, masterKecamatan.cpmKodeKec))
    .where(and(eq(masterKecamatan.cpmKecId, kecamatanId), eq(masterKelurahan.cpmKelurahan, nama)))
    .limit(1);

  if (!row) throw new Error(`Relasi kelurahan-kecamatan tidak ditemukan untuk: ${nama}`);

  return row.kel.cpmKelId;
}

async function getRekPajakIdByJenis(jenisPajak: string) {
  const [row] = await db.select().from(masterRekeningPajak).where(eq(masterRekeningPajak.jenisPajak, jenisPajak));
  if (!row) throw new Error(`Master rekening tidak ditemukan untuk jenis: ${jenisPajak}`);
  return row.id;
}

export async function seedDatabase() {
  try {
    await seedMasterWilayah();
    await seedMasterRekening();
    await seedAuthUsers();

    const existingWP = await storage.getAllWajibPajak();
    if (existingWP.length > 0) {
      log("Seed data already exists, skipping", "seed");
      return;
    }

    log("Seeding database with Pajak Daerah data...", "seed");

    const kecamatanMuaraduaId = await getKecamatanIdByName("Muaradua");
    const kelurahanPasarMuaraduaId = await getKelurahanIdByName("Pasar Muaradua", kecamatanMuaraduaId);
    const kelurahanBatuBelangJayaId = await getKelurahanIdByName("Batu Belang Jaya", kecamatanMuaraduaId);
    const kelurahanMuaraduaId = kelurahanPasarMuaraduaId;

    const rekMakananId = await getRekPajakIdByJenis("PBJT Makanan dan Minuman");
    const rekHotelId = await getRekPajakIdByJenis("PBJT Jasa Perhotelan");
    const rekReklameId = await getRekPajakIdByJenis("Pajak Reklame");

    const wp1 = await storage.createWajibPajak({
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: "H. Syarifudin",
      nikKtpWp: "1601081209800001",
      alamatWp: "Jl. Pasar Muaradua No. 12",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Pasar Muaradua",
      teleponWaWp: "08127654321",
      emailWp: "syarifudin@email.com",
      badanUsaha: null,
    });

    const wp2 = await storage.createWajibPajak({
      jenisWp: "badan_usaha",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: "Ny. Ratna Dewi",
      nikKtpWp: "1601085301850002",
      alamatWp: "Jl. Raya Baturaja-Muaradua KM 5",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "08234561234",
      emailWp: "ratna.dewi@email.com",
      badanUsaha: {
        namaBadanUsaha: "PT Ranau Indah Hospitality",
        npwpBadanUsaha: "01.234.567.8-321.000",
        alamatBadanUsaha: "Jl. Raya Baturaja-Muaradua KM 5",
        kecamatanBadanUsaha: "Muaradua",
        kelurahanBadanUsaha: "Batu Belang Jaya",
        teleponBadanUsaha: "0735321001",
        emailBadanUsaha: "hotel.ranau@gmail.com",
      },
    });

    const wp3 = await storage.createWajibPajak({
      jenisWp: "badan_usaha",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: "Bambang Hermanto",
      nikKtpWp: "1601081001820003",
      alamatWp: "Jl. Merdeka No. 45, Batu Belang Jaya",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "08345678912",
      emailWp: "b.hermanto@email.com",
      badanUsaha: {
        namaBadanUsaha: "CV Penginapan Muaradua Asri",
        npwpBadanUsaha: "02.111.222.3-321.000",
        alamatBadanUsaha: "Jl. Merdeka No. 45",
        kecamatanBadanUsaha: "Muaradua",
        kelurahanBadanUsaha: "Batu Belang Jaya",
        teleponBadanUsaha: "0735321002",
        emailBadanUsaha: "penginapan.asri@email.com",
      },
    });

    const wp4 = await storage.createWajibPajak({
      jenisWp: "orang_pribadi",
      peranWp: "pengelola",
      statusAktif: "active",
      namaPengelola: "Ahmad Fauzi",
      nikPengelola: "1601081109900004",
      alamatPengelola: "Jl. Pasar Baru No. 7, Muaradua",
      kecamatanPengelola: "Muaradua",
      kelurahanPengelola: "Pasar Muaradua",
      teleponWaPengelola: "08567001234",
      badanUsaha: null,
    });

    const wp6 = await storage.createWajibPajak({
      jenisWp: "badan_usaha",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: "PT Cahaya Reklame Selatan",
      nikKtpWp: "1601080101800006",
      alamatWp: "Jl. A. Yani No. 88, Muaradua",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Muaradua",
      teleponWaWp: "08123456001",
      emailWp: "owner@cahayareklame.co.id",
      badanUsaha: {
        namaBadanUsaha: "PT Cahaya Reklame Selatan",
        npwpBadanUsaha: "03.555.888.1-321.000",
        alamatBadanUsaha: "Jl. A. Yani No. 88",
        kecamatanBadanUsaha: "Muaradua",
        kelurahanBadanUsaha: "Muaradua",
        teleponBadanUsaha: "0735321003",
        emailBadanUsaha: "cahaya.reklame@email.com",
      },
    });

    const wp8 = await storage.createWajibPajak({
      jenisWp: "orang_pribadi",
      peranWp: "pengelola",
      statusAktif: "active",
      namaPengelola: "Dedi Saputra",
      nikPengelola: "1601080404940008",
      alamatPengelola: "Jl. Pasar Muaradua No. 35",
      kecamatanPengelola: "Muaradua",
      kelurahanPengelola: "Pasar Muaradua",
      teleponWaPengelola: "081290000456",
      badanUsaha: null,
    });

    await storage.createObjekPajak({
      nopd: "19.01.01.0001",
      wpId: wp1.id,
      rekPajakId: rekMakananId,
      namaOp: "RM Pindang Meranjat Pak Syarif",
      npwpOp: null,
      alamatOp: "Jl. Pasar Muaradua No. 12",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanPasarMuaraduaId,
      omsetBulanan: "35000000",
      tarifPersen: "10",
      pajakBulanan: "3500000",
      latitude: "-4.5291",
      longitude: "104.0255",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisUsaha: "Rumah Makan",
        kapasitasTempat: 80,
      },
    });

    await storage.createObjekPajak({
      nopd: "19.03.01.0001",
      wpId: wp2.id,
      rekPajakId: rekHotelId,
      namaOp: "Hotel Ranau Indah",
      npwpOp: null,
      alamatOp: "Jl. Raya Baturaja-Muaradua KM 5",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanBatuBelangJayaId,
      omsetBulanan: "80000000",
      tarifPersen: "10",
      pajakBulanan: "8000000",
      latitude: "-4.5188",
      longitude: "104.0301",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisUsaha: "Hotel",
        jumlahKamar: 45,
      },
    });

    await storage.createObjekPajak({
      nopd: "19.01.01.0002",
      wpId: wp3.id,
      rekPajakId: rekMakananId,
      namaOp: "Rumah Makan Sederhana Berkah",
      npwpOp: null,
      alamatOp: "Jl. Lintas Sumatera, Pasar Muaradua",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanPasarMuaraduaId,
      omsetBulanan: "25000000",
      tarifPersen: "10",
      pajakBulanan: "2500000",
      latitude: "-4.5275",
      longitude: "104.0238",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisUsaha: "Rumah Makan",
        kapasitasTempat: 60,
      },
    });

    await storage.createObjekPajak({
      nopd: "19.01.01.0003",
      wpId: wp4.id,
      rekPajakId: rekMakananId,
      namaOp: "Warung Sate Kambing Pak Fauzi",
      npwpOp: null,
      alamatOp: "Jl. Pasar Baru No. 7, Muaradua",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanPasarMuaraduaId,
      omsetBulanan: "18000000",
      tarifPersen: "10",
      pajakBulanan: "1800000",
      latitude: "-4.5285",
      longitude: "104.0270",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisUsaha: "Warung",
        kapasitasTempat: 40,
      },
    });

    await storage.createObjekPajak({
      nopd: "09.00.00.0001",
      wpId: wp6.id,
      rekPajakId: rekReklameId,
      namaOp: "Billboard Jl. A. Yani - Coca Cola",
      npwpOp: null,
      alamatOp: "Jl. A. Yani No. 88, Muaradua",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanMuaraduaId,
      omsetBulanan: null,
      tarifPersen: "25",
      pajakBulanan: "1500000",
      latitude: "-4.5260",
      longitude: "104.0295",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisReklame: "Billboard",
        ukuranReklame: 24,
        statusReklame: "baru",
      },
    });

    await storage.createObjekPajak({
      nopd: "09.00.00.0002",
      wpId: wp8.id,
      rekPajakId: rekReklameId,
      namaOp: "Neon Box - Toko Elektronik Jaya",
      npwpOp: null,
      alamatOp: "Jl. Pasar Muaradua No. 35",
      kecamatanId: kecamatanMuaraduaId,
      kelurahanId: kelurahanPasarMuaraduaId,
      omsetBulanan: null,
      tarifPersen: "25",
      pajakBulanan: "750000",
      latitude: "-4.5278",
      longitude: "104.0262",
      status: "active",
      statusVerifikasi: "verified",
      catatanVerifikasi: null,
      verifiedAt: new Date(),
      verifiedBy: "seed",
      detailPajak: {
        jenisReklame: "Neon Box",
        ukuranReklame: 8,
        statusReklame: "perpanjangan",
      },
    });

    log("Database seeded successfully with Pajak Daerah data!", "seed");
  } catch (err: any) {
    log(`Seed error: ${err.message}`, "seed");
  }
}
