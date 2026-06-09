import fs from "node:fs/promises";

import path from "node:path";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ENV } from "./_core/env";



function normalizeKey(relKey: string): string {

  return relKey.replace(/^\/+/, "");

}



function appendHashSuffix(relKey: string): string {

  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  const lastDot = relKey.lastIndexOf(".");

  if (lastDot === -1) return `${relKey}_${hash}`;

  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;

}



function getS3Client() {

  return new S3Client({

    region: ENV.s3Region,

    credentials: {

      accessKeyId: ENV.s3AccessKeyId,

      secretAccessKey: ENV.s3SecretAccessKey,

    },

  });

}



export function isS3Configured() {

  return Boolean(ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);

}



export function getStorageBackend(): "s3" | "local" {

  return isS3Configured() ? "s3" : "local";

}



function defaultS3PublicUrl(key: string): string {

  return `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;

}



function publicUrlForKey(key: string): string {

  if (ENV.s3PublicBaseUrl) {

    return `${ENV.s3PublicBaseUrl.replace(/\/$/, "")}/${key}`;

  }

  if (isS3Configured()) {

    return defaultS3PublicUrl(key);

  }

  return `/storage/${key}`;

}



async function putLocal(key: string, data: Buffer, _contentType: string) {

  const uploadsRoot = path.resolve(process.cwd(), ENV.uploadsDir);

  const filePath = path.join(uploadsRoot, key);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await fs.writeFile(filePath, data);

}



export async function storagePut(

  relKey: string,

  data: Buffer | Uint8Array | string,

  contentType = "application/octet-stream"

): Promise<{ key: string; url: string }> {

  const key = appendHashSuffix(normalizeKey(relKey));

  const body =

    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);



  if (isS3Configured()) {

    const client = getS3Client();

    await client.send(

      new PutObjectCommand({

        Bucket: ENV.s3Bucket,

        Key: key,

        Body: body,

        ContentType: contentType,

      })

    );

    if (!ENV.s3PublicBaseUrl) {
      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 }
      );
      return { key, url: signedUrl };
    }

    return { key, url: publicUrlForKey(key) };

  }



  await putLocal(key, body, contentType);

  return { key, url: publicUrlForKey(key) };

}



export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {

  const key = normalizeKey(relKey);



  if (isS3Configured() && !ENV.s3PublicBaseUrl) {

    const client = getS3Client();

    const url = await getSignedUrl(

      client,

      new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),

      { expiresIn: 60 * 60 }

    );

    return { key, url };

  }



  return { key, url: publicUrlForKey(key) };

}



export function getLocalUploadsRoot() {

  return path.resolve(process.cwd(), ENV.uploadsDir);

}



export function getStorageStatus() {

  return {

    backend: getStorageBackend(),

    s3Configured: isS3Configured(),

    publicBaseUrl: ENV.s3PublicBaseUrl || (isS3Configured() ? defaultS3PublicUrl("") : null),

    uploadsDir: ENV.uploadsDir,

  };

}


