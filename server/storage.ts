import {
  type User,
  type InsertUser,
  type WajibPajak,
  type InsertWajibPajak,
  type ObjekPajak,
  type InsertObjekPajak,
  users,
  wajibPajak,
  objekPajak,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllWajibPajak(): Promise<WajibPajak[]>;
  getWajibPajak(id: number): Promise<WajibPajak | undefined>;
  createWajibPajak(wp: InsertWajibPajak): Promise<WajibPajak>;
  deleteWajibPajak(id: number): Promise<void>;

  getAllObjekPajak(): Promise<ObjekPajak[]>;
  getObjekPajak(id: number): Promise<ObjekPajak | undefined>;
  createObjekPajak(op: InsertObjekPajak): Promise<ObjekPajak>;
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

  async getAllWajibPajak(): Promise<WajibPajak[]> {
    return db.select().from(wajibPajak);
  }

  async getWajibPajak(id: number): Promise<WajibPajak | undefined> {
    const [wp] = await db.select().from(wajibPajak).where(eq(wajibPajak.id, id));
    return wp;
  }

  async createWajibPajak(wp: InsertWajibPajak): Promise<WajibPajak> {
    const [created] = await db.insert(wajibPajak).values(wp).returning();
    return created;
  }

  async deleteWajibPajak(id: number): Promise<void> {
    await db.delete(wajibPajak).where(eq(wajibPajak.id, id));
  }

  async getAllObjekPajak(): Promise<ObjekPajak[]> {
    return db.select().from(objekPajak);
  }

  async getObjekPajak(id: number): Promise<ObjekPajak | undefined> {
    const [op] = await db.select().from(objekPajak).where(eq(objekPajak.id, id));
    return op;
  }

  async createObjekPajak(op: InsertObjekPajak): Promise<ObjekPajak> {
    const [created] = await db.insert(objekPajak).values(op).returning();
    return created;
  }

  async deleteObjekPajak(id: number): Promise<void> {
    await db.delete(objekPajak).where(eq(objekPajak.id, id));
  }
}

export const storage = new DatabaseStorage();
