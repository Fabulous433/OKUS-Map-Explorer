import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWajibPajakSchema, insertObjekPajakSchema } from "@shared/schema";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/wajib-pajak", async (_req, res) => {
    const data = await storage.getAllWajibPajak();
    res.json(data);
  });

  app.post("/api/wajib-pajak", async (req, res) => {
    const parsed = insertWajibPajakSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const created = await storage.createWajibPajak(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/wajib-pajak/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getWajibPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Wajib Pajak tidak ditemukan" });
    }
    const partialSchema = insertWajibPajakSchema.partial();
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const updated = await storage.updateWajibPajak(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/wajib-pajak/:id", async (req, res) => {
    await storage.deleteWajibPajak(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/wajib-pajak/export", async (_req, res) => {
    const data = await storage.getAllWajibPajak();
    const rows = data.map((wp) => ({
      npwpd: wp.npwpd,
      nama: wp.nama,
      nama_usaha: wp.namaUsaha || "",
      alamat: wp.alamat,
      kelurahan: wp.kelurahan || "",
      kecamatan: wp.kecamatan || "",
      telepon: wp.telepon || "",
      email: wp.email || "",
      jenis_pajak: wp.jenisPajak,
      latitude: wp.latitude || "",
      longitude: wp.longitude || "",
      status: wp.status,
    }));
    const csv = stringify(rows, { header: true });
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
      const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const wpData = {
          npwpd: row.npwpd || "",
          nama: row.nama || "",
          namaUsaha: row.nama_usaha || null,
          alamat: row.alamat || "",
          kelurahan: row.kelurahan || null,
          kecamatan: row.kecamatan || null,
          telepon: row.telepon || null,
          email: row.email || null,
          jenisPajak: row.jenis_pajak || "",
          latitude: row.latitude || null,
          longitude: row.longitude || null,
          status: row.status || "active",
        };
        const parsed = insertWajibPajakSchema.safeParse(wpData);
        if (!parsed.success) {
          failed++;
          errors.push(`Baris ${i + 2}: ${parsed.error.issues.map(e => e.message).join(", ")}`);
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

  app.get("/api/objek-pajak", async (_req, res) => {
    const data = await storage.getAllObjekPajak();
    res.json(data);
  });

  app.get("/api/objek-pajak/export", async (_req, res) => {
    const data = await storage.getAllObjekPajak();
    const rows = data.map((op) => ({
      nopd: op.nopd,
      wp_id: op.wpId || "",
      jenis_pajak: op.jenisPajak,
      nama_objek: op.namaObjek,
      alamat: op.alamat,
      kelurahan: op.kelurahan || "",
      kecamatan: op.kecamatan || "",
      omset_bulanan: op.omsetBulanan || "",
      tarif_persen: op.tarifPersen || "",
      pajak_bulanan: op.pajakBulanan || "",
      rating: op.rating || "",
      review_count: op.reviewCount || "",
      detail_pajak: op.detailPajak ? JSON.stringify(op.detailPajak) : "",
      latitude: op.latitude || "",
      longitude: op.longitude || "",
      status: op.status,
    }));
    const csv = stringify(rows, { header: true });
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
      const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const opData = {
          nopd: row.nopd || "",
          wpId: row.wp_id ? parseInt(row.wp_id) : null,
          jenisPajak: row.jenis_pajak || "",
          namaObjek: row.nama_objek || "",
          alamat: row.alamat || "",
          kelurahan: row.kelurahan || null,
          kecamatan: row.kecamatan || null,
          omsetBulanan: row.omset_bulanan || null,
          tarifPersen: row.tarif_persen || null,
          pajakBulanan: row.pajak_bulanan || null,
          rating: row.rating || null,
          reviewCount: row.review_count ? parseInt(row.review_count) : null,
          detailPajak: row.detail_pajak ? JSON.parse(row.detail_pajak) : null,
          latitude: row.latitude || null,
          longitude: row.longitude || null,
          status: row.status || "active",
        };
        const parsed = insertObjekPajakSchema.safeParse(opData);
        if (!parsed.success) {
          failed++;
          errors.push(`Baris ${i + 2}: ${parsed.error.issues.map(e => e.message).join(", ")}`);
          continue;
        }
        try {
          await storage.createObjekPajak(parsed.data);
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
    const op = await storage.getObjekPajak(parseInt(req.params.id));
    if (!op) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }
    res.json(op);
  });

  app.post("/api/objek-pajak", async (req, res) => {
    const parsed = insertObjekPajakSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const created = await storage.createObjekPajak(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/objek-pajak/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getObjekPajak(id);
    if (!existing) {
      return res.status(404).json({ message: "Objek Pajak tidak ditemukan" });
    }
    const partialSchema = insertObjekPajakSchema.partial();
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const updated = await storage.updateObjekPajak(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/objek-pajak/:id", async (req, res) => {
    await storage.deleteObjekPajak(parseInt(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
