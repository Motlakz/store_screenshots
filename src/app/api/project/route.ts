import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PROJECTS_DIR, isValidAppId } from "@/lib/apps";
import { HOSTED_ERROR, editorMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

// One project file per app: projects/<appId>.json. The app id is validated
// against a strict slug charset before it ever touches the filesystem, so a
// crafted `?app=` can't escape the projects directory.
function projectPath(appId: string) {
  return path.join(process.cwd(), PROJECTS_DIR, `${appId}.json`);
}

function readAppId(req: Request): string | null {
  const raw = new URL(req.url).searchParams.get("app");
  return isValidAppId(raw) ? raw : null;
}

export async function GET(req: Request) {
  // Not listing decks in /api/apps would be pointless if this still served
  // them by id — the ids are guessable.
  if ((await editorMode()) === "hosted") {
    return NextResponse.json({ ok: false, error: HOSTED_ERROR }, { status: 503 });
  }
  const appId = readAppId(req);
  if (!appId) {
    return NextResponse.json({ ok: false, error: "Missing or invalid app id" }, { status: 400 });
  }
  try {
    const raw = await fs.readFile(projectPath(appId), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // The filename is the source of truth for identity — a stale appId inside
    // the file must never redirect saves to a different app.
    return NextResponse.json({ ok: true, state: { ...parsed, appId } });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: true, state: null });
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
  const appId = readAppId(req);
  if (!appId) {
    return NextResponse.json({ ok: false, error: "Missing or invalid app id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Expected a project object" }, { status: 400 });
  }
  try {
    const state = { ...(body as Record<string, unknown>), appId };
    const pretty = JSON.stringify(state, null, 2) + "\n";
    await fs.mkdir(path.join(process.cwd(), PROJECTS_DIR), { recursive: true });
    await fs.writeFile(projectPath(appId), pretty, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
