import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { createServer } from "node:http";

async function run() {
  const app = express();
  const MemoryStore = createMemoryStore(session);
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(
    session({
      secret: "integration-test-secret",
      proxy: true,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86_400_000 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 1000 * 60 * 60,
      },
    }),
  );

  app.post("/login", async (req, res) => {
    req.session.user = {
      id: "1",
      username: "admin",
      role: "admin",
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    res.json({ ok: true });
  });

  app.get("/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json(req.session.user);
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start integration server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const login = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({}),
    });

    assert.equal(login.status, 200);

    const setCookie = login.headers.get("set-cookie");
    assert.ok(setCookie && setCookie.includes("connect.sid="), "Session cookie harus dikirim setelah login");

    const cookie = setCookie.split(";")[0];
    const me = await fetch(`${baseUrl}/me`, {
      headers: {
        cookie,
        "x-forwarded-proto": "https",
      },
    });

    assert.equal(me.status, 200);
    const body = (await me.json()) as { username?: string; role?: string };
    assert.equal(body.username, "admin");
    assert.equal(body.role, "admin");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

run()
  .then(() => {
    console.log("[integration] auth session behind proxy: PASS");
  })
  .catch((error) => {
    console.error("[integration] auth session behind proxy: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
