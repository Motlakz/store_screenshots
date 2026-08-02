"use client";
// Browser-side image storage for hosted mode, where there is no /api/upload to
// write files to.
//
// The obvious alternative — inlining screenshots as data URLs in the deck —
// doesn't survive contact with reality: base64 inflates bytes by a third, the
// deck lives in localStorage, and that's a ~5MB budget for the entire origin.
// A ten-screen deck blows it. IndexedDB holds blobs natively, has no
// meaningful size ceiling, and keeps the deck JSON small because slides store
// only a key.
//
// Deck paths look like `idb:<sha-256 prefix>`. lib/image-cache.ts resolves
// them, so render and export never learn this module exists.

const DB_NAME = "app-store-screenshots";
const DB_VERSION = 1;
const STORE = "images";

export const IDB_PREFIX = "idb:";

export function isIdbPath(path: string | undefined): path is string {
  return !!path && path.startsWith(IDB_PREFIX);
}

function keyOf(path: string): string {
  return path.slice(IDB_PREFIX.length);
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  // A failed open must not poison every later call — Safari private mode can
  // refuse once and allow the next.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = run(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

/**
 * Content hash, so dropping the same screenshot twice reuses one entry —
 * matching what /api/upload does with SHA-1 filenames on the server side.
 * crypto.subtle needs a secure context; localhost and https both qualify, and
 * the random fallback only costs a duplicate blob.
 */
async function hashBlob(blob: Blob): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest).slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `r${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Store a blob and return the `idb:` path to put in the slide. */
export async function putImage(blob: Blob): Promise<string | null> {
  try {
    const key = await hashBlob(blob);
    await tx("readwrite", (store) => store.put(blob, key));
    return `${IDB_PREFIX}${key}`;
  } catch {
    return null;
  }
}

export async function getImage(path: string): Promise<Blob | null> {
  if (!isIdbPath(path)) return null;
  try {
    const value = await tx<unknown>("readonly", (store) => store.get(keyOf(path)) as IDBRequest);
    return value instanceof Blob ? value : null;
  } catch {
    return null;
  }
}

/** Keys currently held, for reporting how much a browser is carrying. */
export async function listImageKeys(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    return keys.map(String);
  } catch {
    return [];
  }
}
