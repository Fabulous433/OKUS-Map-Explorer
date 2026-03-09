import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestJson, requestForm, requestBytes, jsonRequest } = server;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const { body: wpListBody, response: wpListRes } = await requestJson("/api/wajib-pajak?page=1&limit=25");
    assert.equal(wpListRes.status, 200);
    const wpItems = ((wpListBody as JsonRecord).items ?? []) as JsonRecord[];
    assert.ok(wpItems.length > 0, "Minimal ada satu WP untuk uji attachment");
    const wpId = requiredNumber(wpItems[0]?.id, "wpId wajib ada");

    const { body: opListBody, response: opListRes } = await requestJson("/api/objek-pajak?page=1&limit=25&includeUnverified=true");
    assert.equal(opListRes.status, 200);
    const opItems = ((opListBody as JsonRecord).items ?? []) as JsonRecord[];
    assert.ok(opItems.length > 0, "Minimal ada satu OP untuk uji attachment");
    const opId = requiredNumber(opItems[0]?.id, "opId wajib ada");

    const wpForm = new FormData();
    wpForm.set("documentType", "ktp");
    wpForm.set("notes", "scan ktp");
    wpForm.set("file", new Blob([Buffer.from("%PDF-1.4 test wp attachment")], { type: "application/pdf" }), "ktp-wp.pdf");

    const wpUpload = await requestForm(`/api/wajib-pajak/${wpId}/attachments`, "POST", wpForm);
    assert.equal(wpUpload.response.status, 201);
    const wpAttachment = wpUpload.body as JsonRecord;
    const wpAttachmentId = String(wpAttachment.id);
    assert.equal(wpAttachment.entityType, "wajib_pajak");
    assert.equal(wpAttachment.entityId, wpId);
    assert.equal(wpAttachment.documentType, "ktp");
    assert.equal(wpAttachment.mimeType, "application/pdf");

    const wpListAttachments = await requestJson(`/api/wajib-pajak/${wpId}/attachments`);
    assert.equal(wpListAttachments.response.status, 200);
    assert.ok(Array.isArray(wpListAttachments.body));
    const wpAttachmentRows = wpListAttachments.body as JsonRecord[];
    assert.ok(wpAttachmentRows.some((item) => String(item.id) === wpAttachmentId));

    const wpDownload = await requestBytes(`/api/wajib-pajak/${wpId}/attachments/${wpAttachmentId}/download`);
    assert.equal(wpDownload.response.status, 200);
    assert.equal(wpDownload.response.headers.get("content-type"), "application/pdf");
    assert.ok(wpDownload.body.length > 0);

    const opForm = new FormData();
    opForm.set("documentType", "foto_usaha");
    opForm.set("notes", "foto depan usaha");
    opForm.set("file", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43])], { type: "image/jpeg" }), "foto-op.jpg");

    const opUpload = await requestForm(`/api/objek-pajak/${opId}/attachments`, "POST", opForm);
    assert.equal(opUpload.response.status, 201);
    const opAttachment = opUpload.body as JsonRecord;
    const opAttachmentId = String(opAttachment.id);
    assert.equal(opAttachment.entityType, "objek_pajak");
    assert.equal(opAttachment.entityId, opId);
    assert.equal(opAttachment.documentType, "foto_usaha");
    assert.equal(opAttachment.mimeType, "image/jpeg");

    const invalidMimeForm = new FormData();
    invalidMimeForm.set("documentType", "dokumen_lain");
    invalidMimeForm.set("file", new Blob([Buffer.from("plain text")], { type: "text/plain" }), "invalid.txt");
    const invalidMime = await requestForm(`/api/wajib-pajak/${wpId}/attachments`, "POST", invalidMimeForm);
    assert.equal(invalidMime.response.status, 400);
    assert.equal((invalidMime.body as JsonRecord).message, "Format file tidak didukung");

    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const oversizeForm = new FormData();
    oversizeForm.set("documentType", "dokumen_lain");
    oversizeForm.set("file", new Blob([largeBuffer], { type: "application/pdf" }), "oversize.pdf");
    const oversize = await requestForm(`/api/objek-pajak/${opId}/attachments`, "POST", oversizeForm);
    assert.equal(oversize.response.status, 400);
    assert.equal((oversize.body as JsonRecord).message, "Ukuran file melebihi batas 5 MB");

    const deleteWp = await jsonRequest(`/api/wajib-pajak/${wpId}/attachments/${wpAttachmentId}`, "DELETE");
    assert.equal(deleteWp.response.status, 200);
    const wpListAfterDelete = await requestJson(`/api/wajib-pajak/${wpId}/attachments`);
    assert.equal(wpListAfterDelete.response.status, 200);
    assert.ok(Array.isArray(wpListAfterDelete.body));
    assert.equal((wpListAfterDelete.body as JsonRecord[]).some((item) => String(item.id) === wpAttachmentId), false);

    const deleteOp = await jsonRequest(`/api/objek-pajak/${opId}/attachments/${opAttachmentId}`, "DELETE");
    assert.equal(deleteOp.response.status, 200);
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] wp op attachments: PASS");
  })
  .catch((error) => {
    console.error("[integration] wp op attachments: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
