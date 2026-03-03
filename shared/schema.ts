import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const wajibPajak = pgTable("wajib_pajak", {
  id: serial("id").primaryKey(),
  npwpd: varchar("npwpd", { length: 30 }).notNull(),
  nama: text("nama").notNull(),
  namaUsaha: text("nama_usaha"),
  alamat: text("alamat").notNull(),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  telepon: varchar("telepon", { length: 20 }),
  email: varchar("email", { length: 255 }),
  jenisPajak: text("jenis_pajak").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const objekPajak = pgTable("objek_pajak", {
  id: serial("id").primaryKey(),
  nopd: varchar("nopd", { length: 30 }).notNull(),
  wpId: integer("wp_id").references(() => wajibPajak.id),
  jenisPajak: text("jenis_pajak").notNull(),
  namaObjek: text("nama_objek").notNull(),
  alamat: text("alamat").notNull(),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  omsetBulanan: decimal("omset_bulanan", { precision: 15, scale: 2 }),
  tarifPersen: decimal("tarif_persen", { precision: 5, scale: 2 }),
  pajakBulanan: decimal("pajak_bulanan", { precision: 15, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  reviewCount: integer("review_count"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWajibPajakSchema = createInsertSchema(wajibPajak).omit({
  id: true,
  createdAt: true,
});

export const insertObjekPajakSchema = createInsertSchema(objekPajak).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWajibPajak = z.infer<typeof insertWajibPajakSchema>;
export type WajibPajak = typeof wajibPajak.$inferSelect;
export type InsertObjekPajak = z.infer<typeof insertObjekPajakSchema>;
export type ObjekPajak = typeof objekPajak.$inferSelect;

export type WikiLandmark = {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist?: number;
  description?: string;
  thumbnail?: string;
  extract?: string;
};
