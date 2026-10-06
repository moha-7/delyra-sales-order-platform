import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PutFileInput, StorageDriver, StoredFile } from "@/lib/storage/storage";

class LocalStorageDriver implements StorageDriver {
  async put(input: PutFileInput): Promise<StoredFile> {
    const bytes = Buffer.from(input.bytes);
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const storageKey = buildStorageKey(input);
    const targetPath = pathForKey(storageKey);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);

    return {
      storageKey,
      sizeBytes: bytes.byteLength,
      checksumSha256,
    };
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const targetPath = pathForKey(storageKey);
    return readFile(/* turbopackIgnore: true */ targetPath);
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await unlink(pathForKey(storageKey));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}

let cachedStorageDriver: StorageDriver | null = null;

export function storageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver !== "local") {
    throw new Error(`Unsupported STORAGE_DRIVER "${driver}".`);
  }

  cachedStorageDriver ??= new LocalStorageDriver();
  return cachedStorageDriver;
}

function storageRoot(): string {
  return process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), "storage");
}

function pathForKey(storageKey: string): string {
  const root = storageRoot();
  const normalizedKey = storageKey.replace(/\\/g, "/");

  if (normalizedKey.includes("..") || path.isAbsolute(normalizedKey)) {
    throw new Error("Invalid storage key.");
  }

  const fullPath = path.join(/* turbopackIgnore: true */ root, normalizedKey);
  const relativePath = path.relative(root, fullPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid storage path.");
  }

  return fullPath;
}

function buildStorageKey(input: PutFileInput): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const originalName = cleanSegment(input.originalName || "file");

  return [
    cleanSegment(input.entityType),
    cleanSegment(input.entityId),
    year,
    month,
    `${randomUUID()}-${originalName}`,
  ].join("/");
}

function cleanSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "item";
}
