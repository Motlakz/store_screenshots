// Port GutScribe's finished Android deck to the iPhone and iPhone Duo decks.
// Positions map proportionally between canvases; sizes keep their look.
import fs from "node:fs";

const FILE = new URL("../projects/gutscribe.json", import.meta.url);
const state = JSON.parse(fs.readFileSync(FILE, "utf8"));
const src = state.slidesByDevice.android;
const SRC = { w: 1080, h: 1920 };

const TARGETS = {
  iphone: { w: 1320, h: 2868, tag: "ios" },
  "iphone-duo-outer": { w: 1398, h: 2034, ratio: 1398 / 2034, tag: "duo-out" },
  "iphone-duo-inner": { w: 2007, h: 2853, ratio: 2007 / 2853, tag: "duo-in" },
};

const r2 = (n) => Math.round(n * 100) / 100;

function remap(t, T, mode) {
  const sx = T.w / SRC.w, sy = T.h / SRC.h, s = Math.min(sx, sy);
  const cx = (t.x + t.width / 2) * sx, cy = (t.y + t.height / 2) * sy;
  let w, h;
  if (mode === "caption") { w = t.width * sx; h = t.height * s; }
  else if (mode === "device" && T.ratio) { h = t.height * sy; w = h * T.ratio; }
  else { w = t.width * s; h = t.height * s; }
  return { ...t, x: r2(cx - w / 2), y: r2(cy - h / 2), width: r2(w), height: r2(h) };
}

for (const [device, T] of Object.entries(TARGETS)) {
  state.slidesByDevice[device] = src.map((slide) => {
    const out = structuredClone(slide);
    out.id = `${slide.id}-${T.tag}`;
    if (out.transforms) {
      for (const k of Object.keys(out.transforms)) {
        const mode = k === "caption" ? "caption" : k.startsWith("device") ? "device" : "other";
        out.transforms[k] = remap(out.transforms[k], T, mode);
      }
    }
    for (const f of out.focusElements ?? []) f.transform = remap(f.transform, T, "other");
    // Porcelain is an Android-only finish; iOS gets Apple titanium hardware.
    for (const k of ["frame", "frameSecondary"]) {
      if (out[k]) out[k] = { ...out[k], style: "3d", color: "white-titanium" };
    }
    if (T.ratio) {
      // Duo screens are wider than the phone captures: letterbox them.
      out.screenshotFit = "contain";
      out.screenshotMatte = out.inverted ? "#15130F" : "#FAF7F2";
    }
    return out;
  });
}

fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + "\n");
console.log("seeded", Object.keys(TARGETS).join(", "), "with", src.length, "slides each");
