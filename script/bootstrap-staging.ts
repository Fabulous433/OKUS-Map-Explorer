import { ensureDatabaseConnection } from "../server/storage";
import { seedAuthUsers, seedMasterRekening, seedMasterWilayah } from "../server/seed";

type Scope = "all" | "auth" | "master";

function printHelp() {
  console.log(`Usage: tsx script/bootstrap-staging.ts [options]

Options:
  --scope all|auth|master

Examples:
  tsx script/bootstrap-staging.ts
  tsx script/bootstrap-staging.ts --scope auth
  tsx script/bootstrap-staging.ts --scope master
`);
}

function parseScope(argv: string[]): Scope {
  const scopeIndex = argv.findIndex((arg) => arg === "--scope");
  if (scopeIndex === -1) {
    return "all";
  }

  const rawValue = argv[scopeIndex + 1]?.trim().toLowerCase();
  if (!rawValue || (rawValue !== "all" && rawValue !== "auth" && rawValue !== "master")) {
    throw new Error("Invalid --scope value. Gunakan all|auth|master");
  }

  return rawValue as Scope;
}

async function run() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const scope = parseScope(process.argv.slice(2));
  await ensureDatabaseConnection();

  if (scope === "all" || scope === "master") {
    await seedMasterWilayah();
    await seedMasterRekening();
    console.log("[bootstrap-staging] master data seeded");
  }

  if (scope === "all" || scope === "auth") {
    await seedAuthUsers();
    console.log("[bootstrap-staging] auth users seeded");
  }

  console.log(`[bootstrap-staging] completed (scope=${scope})`);
}

run().catch((error) => {
  console.error("[bootstrap-staging] failed");
  console.error(error);
  process.exitCode = 1;
});
