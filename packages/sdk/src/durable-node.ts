import { checkpointSnapshot, DurableOperationError, validateCheckpointKey } from "./durable.js";
import type { CheckpointStore, DurableCheckpoint } from "./durable.js";

// Narrow structural Node interfaces keep browser-safe SDK builds free of a Node type dependency.
// Builtins load only when this explicitly Node-only factory is invoked.
interface FileHandle {
  readFile(options: { encoding: "utf8" }): Promise<string>;
  writeFile(data: string, options: { encoding: "utf8" }): Promise<void>;
  stat(): Promise<{ size: number }>;
  sync(): Promise<void>;
  close(): Promise<void>;
}
interface NodeFS {
  stat(path: string): Promise<{ mode: number; isDirectory(): boolean }>;
  open(path: string, flags: string, mode?: number): Promise<FileHandle>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
}
interface NodePath { resolve(path: string): string; join(...parts: string[]): string; isAbsolute(path: string): boolean }
export interface FileCheckpointStoreOptions {
  /** Pre-existing private local directory, with no group/other permission bits. */
  directory: string;
  /** Per checkpoint JSON size cap. Default 1 MiB. */
  maxBytes?: number;
}
function errno(cause: unknown): string | undefined {
  return cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
}

/**
 * Disk checkpoints with exclusive per-key lock files, file+directory fsync, and atomic rename.
 * A crashed writer's lock is NEVER stolen automatically. Reconcile/remove it only after all writers stop.
 * Intended for trusted private local filesystems, not NFS, hostile directories, or distributed consensus.
 */
export async function createFileCheckpointStore(options: FileCheckpointStoreOptions): Promise<CheckpointStore> {
  if (!options || typeof options.directory !== "string" || options.directory.length === 0 || options.directory.includes("\0") ||
    options.maxBytes !== undefined && (!Number.isInteger(options.maxBytes) || options.maxBytes < 1 || options.maxBytes > 100 * 1024 * 1024)) throw new DurableOperationError("configuration");
  const maximum = options.maxBytes ?? 1024 * 1024;
  const fsModule = "node:fs/promises";
  const pathModule = "node:path";
  let fs: NodeFS, path: NodePath;
  try { fs = await import(fsModule) as NodeFS; path = await import(pathModule) as NodePath; }
  catch { throw new DurableOperationError("configuration"); }
  if (!path.isAbsolute(options.directory)) throw new DurableOperationError("configuration");
  const directory = path.resolve(options.directory);
  try {
    const stat = await fs.stat(directory);
    if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) throw new DurableOperationError("configuration");
  } catch (cause) { if (cause instanceof DurableOperationError) throw cause; throw new DurableOperationError("storage_failure"); }
  async function file(key: string) {
    validateCheckpointKey(key);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const name = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return path.join(directory, name);
  }
  async function loadFile(prefix: string): Promise<DurableCheckpoint | null> {
    let handle: FileHandle;
    try { handle = await fs.open(prefix + ".json", "r"); }
    catch (cause) { if (errno(cause) === "ENOENT") return null; throw cause; }
    try {
      if ((await handle.stat()).size > maximum) throw new Error();
      const text = await handle.readFile({ encoding: "utf8" });
      if (new TextEncoder().encode(text).byteLength > maximum) throw new Error();
      return checkpointSnapshot(JSON.parse(text) as DurableCheckpoint);
    } finally { await handle.close(); }
  }
  async function syncDirectory() {
    const handle = await fs.open(directory, "r");
    try { await handle.sync(); } finally { await handle.close(); }
  }
  return {
    async load(key) {
      const prefix = await file(key);
      try { return await loadFile(prefix); }
      catch { throw new DurableOperationError("storage_failure"); }
    },
    async compareAndSet(key, expected, next) {
      const prefix = await file(key);
      const snapshot = checkpointSnapshot(next);
      if (expected !== null && (!Number.isSafeInteger(expected) || expected < 1) || snapshot.revision !== (expected ?? 0) + 1) throw new DurableOperationError("configuration");
      const serialized = JSON.stringify(snapshot);
      if (new TextEncoder().encode(serialized).byteLength > maximum) throw new DurableOperationError("storage_failure");
      let lock: FileHandle;
      try { lock = await fs.open(prefix + ".lock", "wx", 0o600); }
      catch (cause) {
        if (errno(cause) === "EEXIST") throw new DurableOperationError("checkpoint_conflict");
        throw new DurableOperationError("storage_failure");
      }
      const temp = prefix + "." + globalThis.crypto.randomUUID() + ".tmp";
      let pending: FileHandle | undefined;
      try {
        const current = await loadFile(prefix);
        if ((current?.revision ?? null) !== expected) return false;
        pending = await fs.open(temp, "wx", 0o600);
        await pending.writeFile(serialized, { encoding: "utf8" });
        await pending.sync();
        await pending.close(); pending = undefined;
        await fs.rename(temp, prefix + ".json");
        await syncDirectory();
        return true;
      } catch (cause) {
        if (cause instanceof DurableOperationError) throw cause;
        throw new DurableOperationError("storage_failure");
      } finally {
        try { await pending?.close(); } catch { /* Retain primary outcome. */ }
        try { await fs.unlink(temp); } catch { /* Renamed or not created. */ }
        try { await lock.close(); await fs.unlink(prefix + ".lock"); await syncDirectory(); }
        catch { throw new DurableOperationError("storage_failure"); }
      }
    },
  };
}
