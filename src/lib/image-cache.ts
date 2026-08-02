"use client";
// Pre-loads images as base64 data URIs so html-to-image exports without
// non-deterministic image fetch races. Always use img(path) in render.

import { getImage, isIdbPath } from "./image-store";

const cache = new Map<string, string>();
const failed = new Set<string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchAsDataUrl(path: string): Promise<string | null> {
  try {
    // Hosted mode keeps screenshots in IndexedDB rather than on a server.
    // Resolving them here means every consumer — the canvas, the sidebar
    // thumbnails, the export snapshot — treats them like any other path.
    if (isIdbPath(path)) {
      const blob = await getImage(path);
      return blob ? await blobToDataUrl(blob) : null;
    }
    const resp = await fetch(path);
    if (!resp.ok) return null;
    return await blobToDataUrl(await resp.blob());
  } catch {
    return null;
  }
}

export async function preloadImages(
  paths: string[],
  options: { retryFailed?: boolean } = {},
): Promise<void> {
  await Promise.all(
    paths
      .filter(Boolean)
      .filter((p) => !cache.has(p) && (options.retryFailed || !failed.has(p)))
      .map(async (p) => {
        const data = await fetchAsDataUrl(p);
        if (data) {
          cache.set(p, data);
          failed.delete(p);
        } else {
          failed.add(p);
        }
      }),
  );
}

export function img(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  if (failed.has(path)) return "";
  const hit = cache.get(path);
  if (hit) return hit;
  // An `idb:` key is not a URL. Until the blob is resolved into the cache,
  // render nothing rather than letting the browser request a bogus src.
  return isIdbPath(path) ? "" : path;
}

export function setImage(path: string, dataUrl: string) {
  cache.set(path, dataUrl);
  failed.delete(path);
}

export function didFail(path: string | undefined): boolean {
  if (!path) return false;
  if (path.startsWith("data:")) return false;
  return failed.has(path);
}
