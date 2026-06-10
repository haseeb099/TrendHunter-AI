import { TRPCError } from "@trpc/server";

export function userUploadPrefix(userId: number): string {
  return `users/${userId}`;
}

export function buildUserUploadKey(userId: number, folder: string, filename: string): string {
  return `${userUploadPrefix(userId)}/${folder}/${filename}`;
}

export function assertUserOwnsUploadKey(userId: number, key: string): void {
  const normalized = key.replace(/^\/+/, "").replace(/\\/g, "/");
  const prefix = `${userUploadPrefix(userId)}/`;
  if (!normalized.startsWith(prefix)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
}
