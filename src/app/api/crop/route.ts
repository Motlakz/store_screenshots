import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { isValidAppId } from "@/lib/apps";

export const dynamic = "force-dynamic";

/**
 * Server-side crop + high-quality upscale for focus (crop) layers.
 *
 * The browser upscales an <img> with bilinear filtering, which turns small
 * crops to mush. sharp resamples with Lanczos3 and then applies an unsharp
 * mask, which recovers a lot of apparent detail on UI screenshots — text edges
 * especially. It cannot invent detail that was never captured, but at 3-4x it
 * is visibly better than what CSS does.
 *
 *   /api/crop?app=gutscribe&src=/screenshots/gutscribe/uploaded/home.jpg
 *            &x=10&y=30&w=25&h=18&out=648
 *
 * x/y/w/h are percentages of the source, matching ScreenshotFocusElement.crop.
 */

const MAX_OUT = 4096;

function clampPct(value: string | null, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const app = q.get("app");
  const src = q.get("src") || "";

  if (!isValidAppId(app)) {
    return NextResponse.json({ ok: false, error: "Invalid app id" }, { status: 400 });
  }
  // The source must live inside this app's own screenshot folder. Reject
  // anything else outright rather than trying to sanitise a traversal.
  const prefix = `/screenshots/${app}/`;
  if (!src.startsWith(prefix) || src.includes("..")) {
    return NextResponse.json({ ok: false, error: "Source outside app folder" }, { status: 400 });
  }

  const abs = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  const out = Math.max(1, Math.min(MAX_OUT, Number(q.get("out")) || 0));
  const x = clampPct(q.get("x"), 0);
  const y = clampPct(q.get("y"), 0);
  const w = Math.max(1, clampPct(q.get("w"), 100));
  const h = Math.max(1, clampPct(q.get("h"), 100));

  try {
    await fs.access(abs);
    const image = sharp(abs, { failOn: "none" });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ ok: false, error: "Unreadable image" }, { status: 422 });
    }

    // Percentages → source pixels, clamped so extract() can never exceed bounds.
    const left = Math.min(meta.width - 1, Math.round((meta.width * x) / 100));
    const top = Math.min(meta.height - 1, Math.round((meta.height * y) / 100));
    const width = Math.max(1, Math.min(meta.width - left, Math.round((meta.width * w) / 100)));
    const height = Math.max(1, Math.min(meta.height - top, Math.round((meta.height * h) / 100)));

    let pipe = image.extract({ left, top, width, height });

    if (out && out !== width) {
      pipe = pipe.resize(out, null, { kernel: "lanczos3", fit: "fill" });
      // Only sharpen when upscaling — sharpening a downscale just adds crunch.
      if (out > width) {
        const factor = out / width;
        pipe = pipe.sharpen({
          sigma: Math.min(2, 0.6 + factor * 0.2),
          m1: 0.5,
          m2: Math.min(3, 1.2 + factor * 0.3),
        });
      }
    }

    const body = await pipe.png({ compressionLevel: 6 }).toBuffer();
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": "image/png",
        // Deterministic for a given source + rect, so cache hard.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: false, error: "Source not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
