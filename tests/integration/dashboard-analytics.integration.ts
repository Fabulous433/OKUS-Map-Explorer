import assert from "node:assert/strict";

import { createIntegrationServer, type JsonRecord } from "./_helpers";
import { readFirstSheetRows } from "./_excel";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, requestText, requestBytes, loginAs } = server;

  try {
    const unauthExport = await requestText("/api/dashboard/summary/export");
    assert.equal(unauthExport.response.status, 401, "Export dashboard wajib login");

    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const invalidGroupBy = await requestJson("/api/dashboard/summary?groupBy=month");
    assert.equal(invalidGroupBy.response.status, 400, "groupBy invalid harus ditolak");

    const invalidPartialWindow = await requestJson("/api/dashboard/summary?from=2026-01-01");
    assert.equal(invalidPartialWindow.response.status, 400, "from/to harus berpasangan");

    const analytics = await requestJson(
      "/api/dashboard/summary?includeUnverified=true&from=2024-01-01&to=2026-12-31&groupBy=week",
    );
    assert.equal(analytics.response.status, 200);
    const analyticsBody = analytics.body as JsonRecord;
    assert.ok(Array.isArray(analyticsBody.byJenis), "byJenis wajib array");
    assert.ok(Array.isArray(analyticsBody.trend), "trend wajib array");
    assert.ok(analyticsBody.filters, "filters wajib ada");

    const filters = analyticsBody.filters as JsonRecord;
    const trendWindow = filters.trendWindow as JsonRecord;
    assert.equal(trendWindow.groupBy, "week");
    assert.equal(trendWindow.from, "2024-01-01");
    assert.equal(trendWindow.to, "2026-12-28");

    const firstTrend = ((analyticsBody.trend as JsonRecord[])[0] ?? {}) as JsonRecord;
    assert.equal(typeof firstTrend.periodStart, "string");
    assert.equal(typeof firstTrend.createdOp, "number");
    assert.equal(typeof firstTrend.verifiedOp, "number");

    const exportResult = await requestBytes(
      "/api/dashboard/summary/export?includeUnverified=true&from=2024-01-01&to=2026-12-31&groupBy=week",
    );
    assert.equal(exportResult.response.status, 200);
    assert.ok(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(
        exportResult.response.headers.get("content-type") ?? "",
      ),
      "Export harus XLSX",
    );
    assert.match(exportResult.response.headers.get("content-disposition") ?? "", /dashboard_summary\.xlsx/i);
    const exportRows = readFirstSheetRows(exportResult.body);
    const header = (exportRows[0] ?? []).map((value) => String(value));
    assert.ok(header.includes("section"), "Header XLSX wajib memuat kolom section");
    const sectionIndex = header.indexOf("section");
    const sections = exportRows.slice(1).map((row) => String(row[sectionIndex] ?? ""));
    assert.ok(sections.includes("by_jenis"), "XLSX wajib memuat section by_jenis");
    assert.ok(sections.includes("trend"), "XLSX wajib memuat section trend");
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] dashboard analytics + export: PASS");
  })
  .catch((error) => {
    console.error("[integration] dashboard analytics + export: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
