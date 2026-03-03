import { storage } from "./storage";
import { log } from "./index";

export async function seedDatabase() {
  try {
    const existingWP = await storage.getAllWajibPajak();
    if (existingWP.length > 0) {
      log("Seed data already exists, skipping", "seed");
      return;
    }

    log("Seeding database with Pajak Daerah data...", "seed");

    const wp1 = await storage.createWajibPajak({
      npwpd: "PD.321.001.2024",
      nama: "H. Syarifudin",
      namaUsaha: "RM Pindang Meranjat Pak Syarif",
      alamat: "Jl. Pasar Muaradua No. 12",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      telepon: "08127654321",
      email: "rm.pindang.syarif@gmail.com",
      jenisPajak: "PBJT Makanan dan Minuman",
      latitude: "-4.5291",
      longitude: "104.0255",
      status: "active",
    });

    const wp2 = await storage.createWajibPajak({
      npwpd: "PD.321.002.2024",
      nama: "Ny. Ratna Dewi",
      namaUsaha: "Hotel Ranau Indah",
      alamat: "Jl. Raya Baturaja-Muaradua KM 5",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      telepon: "08234561234",
      email: "hotel.ranau@gmail.com",
      jenisPajak: "PBJT Jasa Perhotelan",
      latitude: "-4.5188",
      longitude: "104.0301",
      status: "active",
    });

    const wp3 = await storage.createWajibPajak({
      npwpd: "PD.321.003.2024",
      nama: "CV Berkah Jaya",
      namaUsaha: "Rumah Makan Sederhana Berkah",
      alamat: "Jl. Lintas Sumatera, Pasar Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      telepon: "08567890456",
      email: null,
      jenisPajak: "PBJT Makanan dan Minuman",
      latitude: "-4.5275",
      longitude: "104.0238",
      status: "active",
    });

    const wp4 = await storage.createWajibPajak({
      npwpd: "PD.321.004.2024",
      nama: "Bambang Hermanto",
      namaUsaha: "Penginapan Muaradua Asri",
      alamat: "Jl. Merdeka No. 45, Batu Belang Jaya",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      telepon: "08345678912",
      email: "penginapan.asri@email.com",
      jenisPajak: "PBJT Jasa Perhotelan",
      latitude: "-4.5220",
      longitude: "104.0278",
      status: "active",
    });

    const wp5 = await storage.createWajibPajak({
      npwpd: "PD.321.005.2024",
      nama: "PT Cahaya Reklame Selatan",
      namaUsaha: "Cahaya Advertising",
      alamat: "Jl. A. Yani No. 88, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      telepon: "08123456001",
      email: "cahaya.reklame@email.com",
      jenisPajak: "Pajak Reklame",
      latitude: "-4.5260",
      longitude: "104.0295",
      status: "active",
    });

    const wp6 = await storage.createWajibPajak({
      npwpd: "PD.321.006.2024",
      nama: "Ahmad Fauzi",
      namaUsaha: "Warung Sate Kambing Pak Fauzi",
      alamat: "Jl. Pasar Baru No. 7, Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      telepon: "08567001234",
      email: null,
      jenisPajak: "PBJT Makanan dan Minuman",
      latitude: "-4.5285",
      longitude: "104.0270",
      status: "active",
    });

    const wp7 = await storage.createWajibPajak({
      npwpd: "PD.321.007.2024",
      nama: "Hj. Siti Aminah",
      namaUsaha: "RM Nasi Padang Minang Jaya",
      alamat: "Jl. Lintas Sumatera No. 22, Batu Belang Jaya",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      telepon: "08190012345",
      email: "minang.jaya@gmail.com",
      jenisPajak: "PBJT Makanan dan Minuman",
      latitude: "-4.5205",
      longitude: "104.0312",
      status: "active",
    });

    const wp8 = await storage.createWajibPajak({
      npwpd: "PD.321.008.2024",
      nama: "CV Mitra Parkir Sejahtera",
      namaUsaha: "Parkir Pasar Muaradua",
      alamat: "Area Pasar Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      telepon: "08234500123",
      email: null,
      jenisPajak: "PBJT Jasa Parkir",
      latitude: "-4.5280",
      longitude: "104.0250",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.001.2024",
      wpId: wp1.id,
      jenisPajak: "PBJT Makanan dan Minuman",
      namaObjek: "RM Pindang Meranjat Pak Syarif",
      alamat: "Jl. Pasar Muaradua No. 12",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: "35000000",
      tarifPersen: "10",
      pajakBulanan: "3500000",
      rating: "4.5",
      reviewCount: 128,
      latitude: "-4.5291",
      longitude: "104.0255",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.002.2024",
      wpId: wp2.id,
      jenisPajak: "PBJT Jasa Perhotelan",
      namaObjek: "Hotel Ranau Indah",
      alamat: "Jl. Raya Baturaja-Muaradua KM 5",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      omsetBulanan: "80000000",
      tarifPersen: "10",
      pajakBulanan: "8000000",
      rating: "4.2",
      reviewCount: 87,
      latitude: "-4.5188",
      longitude: "104.0301",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.003.2024",
      wpId: wp3.id,
      jenisPajak: "PBJT Makanan dan Minuman",
      namaObjek: "Rumah Makan Sederhana Berkah",
      alamat: "Jl. Lintas Sumatera, Pasar Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: "25000000",
      tarifPersen: "10",
      pajakBulanan: "2500000",
      rating: "4.3",
      reviewCount: 64,
      latitude: "-4.5275",
      longitude: "104.0238",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.004.2024",
      wpId: wp4.id,
      jenisPajak: "PBJT Jasa Perhotelan",
      namaObjek: "Penginapan Muaradua Asri",
      alamat: "Jl. Merdeka No. 45, Batu Belang Jaya",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      omsetBulanan: "45000000",
      tarifPersen: "10",
      pajakBulanan: "4500000",
      rating: "3.8",
      reviewCount: 42,
      latitude: "-4.5220",
      longitude: "104.0278",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.005.2024",
      wpId: wp5.id,
      jenisPajak: "Pajak Reklame",
      namaObjek: "Billboard Jl. A. Yani - Coca Cola",
      alamat: "Jl. A. Yani No. 88, Muaradua",
      kelurahan: "Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: null,
      tarifPersen: "25",
      pajakBulanan: "1500000",
      rating: null,
      reviewCount: null,
      latitude: "-4.5260",
      longitude: "104.0295",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.006.2024",
      wpId: wp6.id,
      jenisPajak: "PBJT Makanan dan Minuman",
      namaObjek: "Warung Sate Kambing Pak Fauzi",
      alamat: "Jl. Pasar Baru No. 7, Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: "18000000",
      tarifPersen: "10",
      pajakBulanan: "1800000",
      rating: "4.7",
      reviewCount: 215,
      latitude: "-4.5285",
      longitude: "104.0270",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.007.2024",
      wpId: wp7.id,
      jenisPajak: "PBJT Makanan dan Minuman",
      namaObjek: "RM Nasi Padang Minang Jaya",
      alamat: "Jl. Lintas Sumatera No. 22, Batu Belang Jaya",
      kelurahan: "Batu Belang Jaya",
      kecamatan: "Muaradua",
      omsetBulanan: "42000000",
      tarifPersen: "10",
      pajakBulanan: "4200000",
      rating: "4.4",
      reviewCount: 156,
      latitude: "-4.5205",
      longitude: "104.0312",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.008.2024",
      wpId: wp8.id,
      jenisPajak: "PBJT Jasa Parkir",
      namaObjek: "Parkir Pasar Muaradua",
      alamat: "Area Pasar Muaradua",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: "15000000",
      tarifPersen: "10",
      pajakBulanan: "1500000",
      rating: null,
      reviewCount: null,
      latitude: "-4.5280",
      longitude: "104.0250",
      status: "active",
    });

    await storage.createObjekPajak({
      nopd: "OP.321.009.2024",
      wpId: wp5.id,
      jenisPajak: "Pajak Reklame",
      namaObjek: "Neon Box - Toko Elektronik Jaya",
      alamat: "Jl. Pasar Muaradua No. 35",
      kelurahan: "Pasar Muaradua",
      kecamatan: "Muaradua",
      omsetBulanan: null,
      tarifPersen: "25",
      pajakBulanan: "750000",
      rating: null,
      reviewCount: null,
      latitude: "-4.5278",
      longitude: "104.0262",
      status: "active",
    });

    log("Database seeded successfully with Pajak Daerah data!", "seed");
  } catch (err: any) {
    log(`Seed error: ${err.message}`, "seed");
  }
}
