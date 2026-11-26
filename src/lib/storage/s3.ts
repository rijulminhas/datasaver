import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageProvider } from "@/lib/storage/types";

export interface S3StorageOptions {
  name: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// Everything is uploaded as opaque bytes. The real type is detected from the
// file's contents after upload, and storage never serves it as HTML/script.
const UPLOAD_CONTENT_TYPE = "application/octet-stream";

/** Adapter for any S3-compatible service (Backblaze B2, R2, AWS S3, MinIO). */
export class S3Storage implements StorageProvider {
  readonly name: string;
  readonly uploadOrigin: string;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.name = options.name;
    this.bucket = options.bucket;
    this.uploadOrigin = new URL(options.endpoint).origin;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      // Path-style keeps every URL on the endpoint's origin (simple CSP/CORS).
      forcePathStyle: true,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async createUploadUrl(key: string, { contentLength, expiresInSeconds }: { contentLength: number; expiresInSeconds: number }) {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: UPLOAD_CONTENT_TYPE,
        ContentLength: contentLength,
      }),
      {
        expiresIn: expiresInSeconds,
        // Bind the exact size and type into the signature.
        signableHeaders: new Set(["content-type", "content-length"]),
      }
    );

    return { url, method: "PUT" as const, headers: { "Content-Type": UPLOAD_CONTENT_TYPE } };
  }

  async createDownloadUrl(
    key: string,
    options: {
      fileName: string;
      contentType: string;
      expiresInSeconds: number;
      disposition?: "attachment" | "inline";
      cacheControl?: string;
      signingDate?: Date;
    }
  ) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition(options.fileName, options.disposition ?? "attachment"),
        ResponseContentType: options.contentType,
        ResponseCacheControl: options.cacheControl ?? "private, no-store",
      }),
      { expiresIn: options.expiresInSeconds, signingDate: options.signingDate }
    );
  }

  async getObjectSize(key: string) {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return result.ContentLength ?? 0;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async readObjectStart(key: string, length: number) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${length - 1}` })
    );
    return result.Body ? await result.Body.transformToByteArray() : new Uint8Array();
  }

  async deleteObject(key: string) {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
}

function isNotFound(error: unknown) {
  return error instanceof S3ServiceException && (error.$metadata.httpStatusCode === 404 || error.name === "NotFound" || error.name === "NoSuchKey");
}

/** RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 filename. */
export function contentDisposition(fileName: string, type: "attachment" | "inline" = "attachment") {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_") || "download";
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
