import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type ExternalStorage = { client: S3Client; bucket: string; publicBaseUrl: string };

function getExternalStorage(): ExternalStorage | null {
  const { s3Bucket, s3Region, s3AccessKeyId, s3SecretAccessKey, s3PublicBaseUrl } = ENV;
  if (![s3Bucket, s3Region, s3AccessKeyId, s3SecretAccessKey, s3PublicBaseUrl].every(Boolean)) return null;
  return {
    client: new S3Client({
      region: s3Region,
      endpoint: ENV.s3Endpoint || undefined,
      forcePathStyle: Boolean(ENV.s3Endpoint),
      credentials: { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey },
    }),
    bucket: s3Bucket,
    publicBaseUrl: s3PublicBaseUrl.replace(/\/+$/, ""),
  };
}

function getForgeConfig() {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error("Storage config missing: configure external S3 or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  }
  return { forgeUrl: ENV.forgeApiUrl.replace(/\/+$/, ""), forgeKey: ENV.forgeApiKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  const external = getExternalStorage();
  if (external) {
    await external.client.send(new PutObjectCommand({ Bucket: external.bucket, Key: key, Body: data, ContentType: contentType }));
    return { key, url: `${external.publicBaseUrl}/${key}` };
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status})`);
  const { url: s3Url } = await presignResp.json() as { url: string };
  if (!s3Url) throw new Error("Storage service returned an empty upload URL");
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  const external = getExternalStorage();
  return { key, url: external ? `${external.publicBaseUrl}/${key}` : `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string) {
  const key = normalizeKey(relKey);
  const external = getExternalStorage();
  if (external) return getSignedUrl(external.client, new GetObjectCommand({ Bucket: external.bucket, Key: key }), { expiresIn: 3600 });
  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!resp.ok) throw new Error(`Storage presign failed (${resp.status})`);
  const { url } = await resp.json() as { url: string };
  if (!url) throw new Error("Storage service returned an empty download URL");
  return url;
}
