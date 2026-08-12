import { describe, expect, it } from "vitest";
import { decodeAdminImage, decodeUpload } from "./adminUpload";
import { uploadAndRegisterAdminMedia } from "./adminMediaUpload";

describe("decodeAdminImage", () => {
  it("accepts a permitted image data URL and rejects an unsupported type", () => {
    const data = "data:image/png;base64,aGVsbG8=";
    expect(decodeAdminImage(data, "image/png").bytes.toString()).toBe("hello");
    expect(() => decodeAdminImage("data:text/plain;base64,aGVsbG8=", "text/plain")).toThrow("صيغة الصورة غير مدعومة");
  });

  it("accepts permitted download documents and rejects unsupported direct uploads", () => {
    const payload = "data:application/pdf;base64,aGVsbG8=";
    expect(decodeUpload(payload, "application/pdf")).toMatchObject({ extension: "pdf", category: "document" });
    expect(decodeUpload("data:application/msword;base64,aGVsbG8=", "application/msword")).toMatchObject({ extension: "doc", category: "document" });
    expect(decodeUpload("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,aGVsbG8=", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toMatchObject({ extension: "docx", category: "document" });
    expect(() => decodeUpload("data:text/plain;base64,aGVsbG8=", "text/plain")).toThrow("نوع الملف غير مسموح");
  });

  it("stores a permitted download, registers it, and audits it through injected dependencies only", async () => {
    const calls: Record<string, unknown>[] = [];
    const media = await uploadAndRegisterAdminMedia(
      {
        mimeType: "application/pdf",
        dataUrl: "data:application/pdf;base64,aGVsbG8=",
        originalName: "verification-download.pdf",
        usage: "تحميلات",
      },
      {
        now: () => 1700000000000,
        storagePut: async (key, bytes, mimeType) => {
          calls.push({ type: "storage", key, bytes: bytes.toString(), mimeType });
          return { key, url: "https://storage.example/verification-download.pdf" };
        },
        registerMedia: async input => {
          calls.push({ type: "register", input });
          return { id: 77 };
        },
        recordAdminAudit: async (action, entityType, entityId, details) => {
          calls.push({ type: "audit", action, entityType, entityId, details });
        },
      },
    );

    expect(media).toEqual({ id: 77 });
    expect(calls).toEqual([
      { type: "storage", key: "wajbat-plus/media/document/1700000000000.pdf", bytes: "hello", mimeType: "application/pdf" },
      {
        type: "register",
        input: {
          storageKey: "wajbat-plus/media/document/1700000000000.pdf",
          url: "https://storage.example/verification-download.pdf",
          originalName: "verification-download.pdf",
          mimeType: "application/pdf",
          sizeBytes: 5,
          category: "document",
          usage: "تحميلات",
        },
      },
      { type: "audit", action: "media_uploaded", entityType: "media_file", entityId: "77", details: { name: "verification-download.pdf" } },
    ]);
  });
});
