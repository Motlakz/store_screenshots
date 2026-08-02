// Server-only. Decides whether this instance is the local filesystem editor or
// a hosted one. Never import from a client component — it pulls in node:fs.
//
// The distinction matters because `projects/` ships inside the deployment
// bundle. Left unguarded, a public deploy lists every deck in this repo to
// every visitor, and every write fails against a read-only filesystem. Hosted
// mode makes the browser the whole persistence layer instead: no reads out of
// `projects/`, no writes anywhere, and each visitor keeps their own apps.

import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { PROJECTS_DIR, type EditorMode } from "./apps";

let probed: EditorMode | null = null;

async function writable(target: string): Promise<boolean> {
  try {
    await fs.access(target, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mode follows the actual capability of the filesystem rather than a build
 * flag, so a deploy nobody remembered to configure still fails safe: a
 * read-only `projects/` (Vercel, Netlify, any immutable container) resolves to
 * hosted and hides the decks. `SCREENSHOTS_MODE=local|hosted` overrides it for
 * the cases the probe reads wrong — most usefully a self-hosted box with a
 * writable disk, where you want local behavior *and* should know there is no
 * auth in front of it.
 */
export async function editorMode(): Promise<EditorMode> {
  const forced = process.env.SCREENSHOTS_MODE;
  if (forced === "hosted" || forced === "local") return forced;
  if (probed) return probed;

  const dir = path.join(process.cwd(), PROJECTS_DIR);
  if (await writable(dir)) {
    probed = "local";
  } else if (await exists(dir)) {
    // Present but not writable — a bundled read-only deployment.
    probed = "hosted";
  } else {
    // A fresh checkout that hasn't created projects/ yet. Whether we can make
    // it is the real question.
    probed = (await writable(process.cwd())) ? "local" : "hosted";
  }
  return probed;
}

/** Standard refusal for the write endpoints when there's no disk to write to. */
export const HOSTED_ERROR =
  "This editor is running in hosted mode — projects live in your browser, not on the server.";
