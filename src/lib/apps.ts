// Multi-app support. One editor instance hosts many apps; each app owns its
// project file (projects/<id>.json) and its screenshot folder
// (public/screenshots/<id>/). Nothing is shared between apps except the code,
// so generating a deck for one app can never overwrite another's.

export const DEFAULT_APP_ID = "speakdiary";

// Directory (relative to the repo root) holding one JSON project per app.
export const PROJECTS_DIR = "projects";

// App ids are used as both a filename and a URL segment, so keep them to a
// conservative slug charset.
const APP_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isValidAppId(id: unknown): id is string {
  return typeof id === "string" && APP_ID_RE.test(id);
}

export function slugifyAppId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

// Public URL prefixes for an app's assets.
export function appScreenshotPrefix(appId: string): string {
  return `/screenshots/${appId}`;
}

export function appUploadPrefix(appId: string): string {
  return `/screenshots/${appId}/uploaded`;
}

export function appIconPath(appId: string): string {
  return `/screenshots/${appId}/app-icon.png`;
}

// Turn an id back into a readable default name ("lovetestai" -> "Lovetestai").
export function titleFromAppId(id: string): string {
  const words = id.split("-").filter(Boolean);
  if (words.length === 0) return id;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export type AppSummary = {
  id: string;
  appName: string;
};

/**
 * Where this instance keeps projects.
 *
 * - `local`  — `projects/<id>.json` on disk, the editor's original model.
 * - `hosted` — the browser. Nothing is read from or written to `projects/`, so
 *   a public deployment shows a visitor their own apps and none of yours.
 *
 * Decided server-side by lib/mode.ts and handed to the client by /api/apps.
 */
export type EditorMode = "local" | "hosted";
