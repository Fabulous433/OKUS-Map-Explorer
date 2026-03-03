import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWajibPajakSchema, insertObjekPajakSchema } from "@shared/schema";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/landmarks", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;

      if (!north || !south || !east || !west) {
        return res.json([]);
      }

      const lat = (parseFloat(north as string) + parseFloat(south as string)) / 2;
      const lon = (parseFloat(east as string) + parseFloat(west as string)) / 2;

      const latDiff = Math.abs(parseFloat(north as string) - parseFloat(south as string));
      const lonDiff = Math.abs(parseFloat(east as string) - parseFloat(west as string));
      const radius = Math.max(latDiff, lonDiff) * 111000 / 2;
      const clampedRadius = Math.min(Math.max(radius, 5000), 10000);

      const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${Math.round(clampedRadius)}&gslimit=50&format=json`;

      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.query || !geoData.query.geosearch) {
        return res.json([]);
      }

      const landmarks = geoData.query.geosearch;
      const pageIds = landmarks.map((l: any) => l.pageid).join("|");

      if (!pageIds) {
        return res.json([]);
      }

      const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=extracts|pageimages&exintro=true&explaintext=true&exsentences=3&piprop=thumbnail&pithumbsize=400&format=json`;

      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const pages = detailData.query?.pages || {};

      const results = landmarks.map((l: any) => {
        const page = pages[l.pageid] || {};
        return {
          pageid: l.pageid,
          title: l.title,
          lat: l.lat,
          lon: l.lon,
          dist: l.dist,
          extract: page.extract || "",
          thumbnail: page.thumbnail?.source || null,
        };
      });

      res.json(results);
    } catch (err: any) {
      log(`Wikipedia API error: ${err.message}`, "wikipedia");
      res.json([]);
    }
  });

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

  app.delete("/api/wajib-pajak/:id", async (req, res) => {
    await storage.deleteWajibPajak(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/objek-pajak", async (_req, res) => {
    const data = await storage.getAllObjekPajak();
    res.json(data);
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
