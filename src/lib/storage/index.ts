import "server-only";

import { z } from "zod";

import { S3Storage } from "@/lib/storage/s3";
import type { StorageProvider } from "@/lib/storage/types";

const envSchema = z.object({
  STORAGE_PROVIDER_NAME: z.string().min(1).max(32).default("backblaze-b2"),
  STORAGE_S3_ENDPOINT: z.url(),
  STORAGE_S3_REGION: z.string().min(1),
  STORAGE_S3_BUCKET: z.string().min(1),
  STORAGE_S3_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1),
});

let instance: StorageProvider | null = null;

/**
 * The configured storage provider. Credentials come only from server env
 * vars and never reach the client. To switch providers, change env vars (any
 * S3-compatible service) or add another StorageProvider implementation here.
 */
export function getStorage(): StorageProvider {
  if (instance) return instance;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Storage is not configured. Check env vars: ${missing}`);
  }

  const env = parsed.data;
  instance = new S3Storage({
    name: env.STORAGE_PROVIDER_NAME,
    endpoint: env.STORAGE_S3_ENDPOINT,
    region: env.STORAGE_S3_REGION,
    bucket: env.STORAGE_S3_BUCKET,
    accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY,
  });
  return instance;
}
