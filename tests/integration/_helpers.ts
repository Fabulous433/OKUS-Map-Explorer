import express from "express";
import { createServer, type Server } from "node:http";

import { registerRoutes } from "../../server/routes";
import { ensureDatabaseConnection } from "../../server/storage";
import { seedDatabase } from "../../server/seed";

export type JsonRecord = Record<string, unknown>;

export type IntegrationServer = {
  baseUrl: string;
  requestJson: (path: string, init?: RequestInit) => Promise<{ response: Response; body: unknown }>;
  requestText: (path: string, init?: RequestInit) => Promise<{ response: Response; body: string }>;
  jsonRequest: (path: string, method: string, body?: unknown) => Promise<{ response: Response; body: unknown }>;
  close: () => Promise<void>;
};

export async function createIntegrationServer(): Promise<IntegrationServer> {
  await ensureDatabaseConnection();
  await seedDatabase();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

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

  const requestJson = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, init);
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json() : null;
    return { response, body };
  };

  const requestText = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${baseUrl}${path}`, init);
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
