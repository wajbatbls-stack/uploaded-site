import { decodeUpload } from "./adminUpload";

type UploadInput = {
  mimeType: string;
  dataUrl: string;
  originalName: string;
  usage?: string;
};

type StoredMedia = { key: string; url: string };
type RegisteredMedia = { id: number };

type UploadDependencies = {
  storagePut: (key: string, bytes: Buffer, mimeType: string) => Promise<StoredMedia>;
  registerMedia: (input: {
    storageKey: string;
    url: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    category: "image" | "document" | "other";
    usage?: string;
  }) => Promise<RegisteredMedia>;
  recordAdminAudit: (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => Promise<unknown>;
  now?: () => number;
};

/**
 * Keeps the upload, media registration, and audit trail in one transaction-like
 * application flow. Dependencies are injected so this production path can be
 * verified without creating storage objects or database records in tests.
 */
export async function uploadAndRegisterAdminMedia(input: UploadInput, dependencies: UploadDependencies) {
  const upload = decodeUpload(input.dataUrl, input.mimeType);
  const timestamp = (dependencies.now ?? Date.now)();
  const storage = await dependencies.storagePut(
    `wajbat-plus/media/${upload.category}/${timestamp}.${upload.extension}`,
    upload.bytes,
    input.mimeType,
  );
  const media = await dependencies.registerMedia({
    storageKey: storage.key,
    url: storage.url,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: upload.bytes.length,
    category: upload.category,
    usage: input.usage,
  });
  await dependencies.recordAdminAudit("media_uploaded", "media_file", String(media.id), { name: input.originalName });
  return media;
}
