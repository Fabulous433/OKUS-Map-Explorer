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
  npwp: varchar("npwp", { length: 30 }).notNull(),
  nama: text("nama").notNull(),
  alamat: text("alamat").notNull(),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  telepon: varchar("telepon", { length: 20 }),
  email: varchar("email", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const objekPajak = pgTable("objek_pajak", {
  id: serial("id").primaryKey(),
  nop: varchar("nop", { length: 30 }).notNull(),
  wpId: integer("wp_id").references(() => wajibPajak.id),
  jenis: text("jenis").notNull(),
  alamat: text("alamat").notNull(),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  luasTanah: decimal("luas_tanah", { precision: 12, scale: 2 }),
  luasBangunan: decimal("luas_bangunan", { precision: 12, scale: 2 }),
  njop: decimal("njop", { precision: 15, scale: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
