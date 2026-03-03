import { storage } from "./storage";
import { db } from "./storage";
import { wajibPajak, objekPajak } from "@shared/schema";
import { log } from "./index";

export async function seedDatabase() {
  try {
    const existingWP = await storage.getAllWajibPajak();
    if (existingWP.length > 0) {
      log("Seed data already exists, skipping", "seed");
      return;
    }

    log("Seeding database with initial data...", "seed");

    const wp1 = await storage.createWajibPajak({
      npwp: "01.234.567.8-321.000",
      nama: "H. Ahmad Sudirman",
      alamat: "Jl. Merdeka No. 15, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      telepon: "08123456789",
      email: "ahmad.sudirman@email.com",
      latitude: "-4.4234",
      longitude: "104.0312",
      status: "active",
    });

    const wp2 = await storage.createWajibPajak({
      npwp: "02.345.678.9-321.000",
      nama: "Siti Rahmawati",
      alamat: "Jl. Pahlawan No. 8, Baturaja",
      kelurahan: "Sukaraya",
      kecamatan: "Buay Madang",
      telepon: "08234567890",
      email: "siti.rahma@email.com",
      latitude: "-4.3867",
      longitude: "104.0145",
      status: "active",
    });

    const wp3 = await storage.createWajibPajak({
      npwp: "03.456.789.0-321.000",
      nama: "Bambang Prakoso",
      alamat: "Desa Simpang Sender, Kisam Tinggi",
      kelurahan: "Simpang Sender",
      kecamatan: "Kisam Tinggi",
      telepon: "08345678901",
      email: null,
      latitude: "-4.5123",
      longitude: "103.9876",
      status: "active",
    });

    const wp4 = await storage.createWajibPajak({
      npwp: "04.567.890.1-321.000",
      nama: "CV Sejahtera Abadi",
      alamat: "Jl. Lintas Sumatera KM 12",
      kelurahan: "Tanjung Baru",
      kecamatan: "Banding Agung",
      telepon: "08456789012",
      email: "cv.sejahtera@email.com",
      latitude: "-4.4567",
      longitude: "104.0567",
      status: "active",
    });

    const wp5 = await storage.createWajibPajak({
      npwp: "05.678.901.2-321.000",
      nama: "Dewi Lestari",
      alamat: "Jl. Kartini No. 23, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      telepon: "08567890123",
      email: "dewi.lestari@email.com",
      latitude: "-4.4198",
      longitude: "104.0289",
      status: "inactive",
    });

    await storage.createObjekPajak({
      nop: "16.08.010.001.001-0001.0",
      wpId: wp1.id,
      jenis: "Tanah & Bangunan",
      alamat: "Jl. Merdeka No. 15, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      luasTanah: "500",
      luasBangunan: "200",
      njop: "350000000",
      latitude: "-4.4234",
      longitude: "104.0312",
      status: "active",
    });

    await storage.createObjekPajak({
      nop: "16.08.020.002.002-0002.0",
      wpId: wp2.id,
      jenis: "Tanah Pertanian",
      alamat: "Dusun 3, Buay Madang",
      kelurahan: "Sukaraya",
      kecamatan: "Buay Madang",
      luasTanah: "2000",
      luasBangunan: null,
      njop: "180000000",
      latitude: "-4.3890",
      longitude: "104.0180",
      status: "active",
    });

    await storage.createObjekPajak({
      nop: "16.08.030.003.003-0003.0",
      wpId: wp3.id,
      jenis: "Perkebunan",
      alamat: "Desa Simpang Sender",
      kelurahan: "Simpang Sender",
      kecamatan: "Kisam Tinggi",
      luasTanah: "5000",
      luasBangunan: "50",
      njop: "750000000",
      latitude: "-4.5145",
      longitude: "103.9900",
      status: "active",
    });

    await storage.createObjekPajak({
      nop: "16.08.040.004.004-0004.0",
      wpId: wp4.id,
      jenis: "Ruko",
      alamat: "Jl. Lintas Sumatera KM 12",
      kelurahan: "Tanjung Baru",
      kecamatan: "Banding Agung",
      luasTanah: "150",
      luasBangunan: "300",
      njop: "520000000",
      latitude: "-4.4590",
      longitude: "104.0590",
      status: "active",
    });

    await storage.createObjekPajak({
      nop: "16.08.010.005.005-0005.0",
      wpId: wp1.id,
      jenis: "Tanah Kosong",
      alamat: "Jl. Diponegoro No. 50, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      luasTanah: "800",
      luasBangunan: null,
      njop: "120000000",
      latitude: "-4.4210",
      longitude: "104.0350",
      status: "active",
    });

    log("Database seeded successfully!", "seed");
  } catch (err: any) {
    log(`Seed error: ${err.message}`, "seed");
  }
}
