import express from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import createMemoryStore from "memorystore";
import { sql } from "drizzle-orm";

import { registerRoutes } from "../../server/routes";
import { createRequestContextMiddleware } from "../../server/observability";
import { db, ensureDatabaseConnection } from "../../server/storage";
import { seedDatabase } from "../../server/seed";

export type JsonRecord = Record<string, unknown>;

export type IntegrationServer = {
  baseUrl: string;
  requestJson: (path: string, init?: RequestInit) => Promise<{ response: Response; body: unknown }>;
  requestText: (path: string, init?: RequestInit) => Promise<{ response: Response; body: string }>;
  jsonRequest: (path: string, method: string, body?: unknown) => Promise<{ response: Response; body: unknown }>;
  loginAs: (username?: string, password?: string) => Promise<{ response: Response; body: unknown }>;
  logout: () => Promise<{ response: Response; body: string }>;
  close: () => Promise<void>;
};

type CreateIntegrationServerOptions = {
  productionProxy?: boolean;
};

export async function createIntegrationServer(options: CreateIntegrationServerOptions = {}): Promise<IntegrationServer> {
  await ensureDatabaseConnection();
  await db.execute(sql`alter table users add column if not exists role varchar(20) not null default 'viewer'`);
  await seedDatabase();

  const MemoryStore = createMemoryStore(session);
  const app = express();
  if (options.productionProxy) {
    app.set("trust proxy", 1);
  }
  app.use(createRequestContextMiddleware());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "integration-test-secret",
      proxy: options.productionProxy ?? false,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86_400_000 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: options.productionProxy ?? false,
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  let cookieHeader = "";

  const updateCookieHeader = (response: Response) => {
    const withGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = withGetSetCookie.getSetCookie?.() ?? [];

    if (setCookies.length > 0) {
      const sessionPair = setCookies
        .map((item) => item.split(";")[0]?.trim())
        .find((item) => item?.startsWith("connect.sid="));
      if (sessionPair) {
        cookieHeader = sessionPair;
      }
      return;
    }

    const rawSetCookie = response.headers.get("set-cookie");
    if (!rawSetCookie) return;
    const match = rawSetCookie.match(/connect\.sid=[^;]+/);
    if (match?.[0]) {
      cookieHeader = match[0];
    }
  };

  const withCookie = (init?: RequestInit): RequestInit => {
    const headers = new Headers(init?.headers ?? {});
    if (options.productionProxy && !headers.has("x-forwarded-proto")) {
      headers.set("x-forwarded-proto", "https");
    }
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    return {
      ...init,
      headers,
    };
  };

  const requestJson = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, withCookie(init));
    updateCookieHeader(response);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json() : null;
    return { response, body };
  };

  const requestText = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, withCookie(init));
    updateCookieHeader(response);
    const body = await response.text();
    return { response, body };
  };

  const jsonRequest = async (path: string, method: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    return requestJson(path, init);
  };

  const loginAs = async (username = "admin", password = "admin123") => {
    return jsonRequest("/api/auth/login", "POST", { username, password });
  };

  const logout = async () => {
    const result = await requestText("/api/auth/logout", { method: "POST" });
    cookieHeader = "";
    return result;
  };

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return {
    baseUrl,
    requestJson,
    requestText,
    jsonRequest,
    loginAs,
    logout,
    close,
  };
}

export function requiredNumber(value: unknown, message: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(message);
  }

  return parsed;
}

export function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
}
