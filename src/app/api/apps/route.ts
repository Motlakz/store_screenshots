import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  DEFAULT_APP_ID,
  PROJECTS_DIR,
  isValidAppId,
  slugifyAppId,
  titleFromAppId,
  type AppSummary,
} from "@/lib/apps";
import { makeDefaultProject } from "@/lib/defaults";
import { HOSTED_ERROR, editorMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

// Pre-multi-app checkouts kept a single deck at the repo root. Seed it as the
// default app the first time so an old clone doesn't open to an empty editor.
const LEGACY_PROJECT_FILE = "app-store-screenshots.json";

function projectsDir() {
  return path.join(process.cwd(), PROJECTS_DIR);
}

function projectPath(appId: string) {
  return path.join(projectsDir(), `${appId}.json`);
}

function screenshotsDir(appId: string) {
  return path.join(process.cwd(), "public", "screenshots", appId);
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeProject(appId: string, state: unknown) {
  await fs.mkdir(projectsDir(), { recursive: true });
  await fs.writeFile(projectPath(appId), JSON.stringify(state, null, 2) + "\n", "utf8");
}

// Every app owns a screenshots folder plus an uploads bucket inside it, so
// dropped images land next to that app's curated shots and nowhere else.
async function ensureAssetDirs(appId: string) {
  await fs.mkdir(path.join(screenshotsDir(appId), "uploaded"), { recursive: true });
}

async function migrateLegacyProject() {
  if (await exists(projectPath(DEFAULT_APP_ID))) return;
  const legacy = path.join(process.cwd(), LEGACY_PROJECT_FILE);
  if (!(await exists(legacy))) return;
  try {
    const parsed = JSON.parse(await fs.readFile(legacy, "utf8")) as Record<string, unknown>;
    await writeProject(DEFAULT_APP_ID, { ...parsed, appId: DEFAULT_APP_ID });
    await ensureAssetDirs(DEFAULT_APP_ID);
  } catch {
    /* a malformed legacy file shouldn't block the app list */
  }
}

async function listApps(): Promise<AppSummary[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(projectsDir());
  } catch {
    return [];
  }
  const apps: AppSummary[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const id = entry.slice(0, -".json".length);
    if (!isValidAppId(id)) continue;
    let appName = titleFromAppId(id);
    try {
      const parsed = JSON.parse(await fs.readFile(projectPath(id), "utf8")) as { appName?: unknown };
      if (typeof parsed.appName === "string" && parsed.appName.trim()) appName = parsed.appName;
    } catch {
      /* keep the id-derived name if the file is unreadable */
    }
    apps.push({ id, appName });
  }
  return apps.sort((a, b) => a.appName.localeCompare(b.appName));
}

// The client reads `mode` from here and configures its whole persistence layer
// from it, so this is also the one place that tells the browser where its
// projects live.
export async function GET() {
  try {
    const mode = await editorMode();
    if (mode === "hosted") {
      // Deliberately does not read projects/ at all. The bundle still contains
      // whatever decks were committed; not enumerating them is what keeps them
      // off a public deployment.
      return NextResponse.json({ ok: true, mode, apps: [] });
    }
    await migrateLegacyProject();
    return NextResponse.json({ ok: true, mode, apps: await listApps() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/**
 * Removes an app by deleting its project file.
 *
 * `public/screenshots/<id>/` is deliberately left alone. The deck is a few KB
 * of JSON that the editor can rebuild; the screenshots are the irreplaceable
 * part, often the only copy on the machine. Deleting them behind a dropdown X
 * is not a risk worth taking, so the confirm dialog says they stay.
 */
export async function DELETE(req: Request) {
  if ((await editorMode()) === "hosted") {
    return NextResponse.json({ ok: false, error: HOSTED_ERROR }, { status: 503 });
  }
  const raw = new URL(req.url).searchParams.get("app");
  if (!isValidAppId(raw)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid app id" }, { status: 400 });
  }
  try {
    await fs.unlink(projectPath(raw));
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Already gone is the outcome the caller wanted.
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if ((await editorMode()) === "hosted") {
    return NextResponse.json({ ok: false, error: HOSTED_ERROR }, { status: 503 });
  }
  let body: { id?: unknown; appName?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; appName?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const appName =
    typeof body.appName === "string" && body.appName.trim() ? body.appName.trim() : "";
  const rawId = typeof body.id === "string" && body.id.trim() ? body.id : appName;
  const id = slugifyAppId(rawId);

  if (!isValidAppId(id)) {
    return NextResponse.json(
      { ok: false, error: "Name must contain at least one letter or number" },
      { status: 400 },
    );
  }
  if (await exists(projectPath(id))) {
    return NextResponse.json({ ok: false, error: `App "${id}" already exists` }, { status: 409 });
  }

  try {
    await writeProject(id, makeDefaultProject(id, appName || titleFromAppId(id)));
    await ensureAssetDirs(id);
    return NextResponse.json({ ok: true, app: { id, appName: appName || titleFromAppId(id) } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
