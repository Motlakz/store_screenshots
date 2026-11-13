// Port SpeakDiary's Android deck to the iPhone deck with a refreshed
// background set. Positions map proportionally between canvases; sizes keep
// their look. Re-running overwrites the iPhone deck.
//
// Background approach: every slide keeps a light, near-white band behind its
// headline (top for hero/device-bottom, bottom for device-top) and a deeper,
// more saturated pool behind the phone for depth. Each slide's right edge
// glows in the same color as the next slide's left edge, so the strip reads as
// one continuous sky when the App Store shows screens side by side.
import fs from "node:fs";

const FILE = new URL("../projects/speakdiary.json", import.meta.url);
const state = JSON.parse(fs.readFileSync(FILE, "utf8"));
const src = state.slidesByDevice.android;
const SRC = { w: 1080, h: 1920 };
const T = { w: 1320, h: 2868 };

const r2 = (n) => Math.round(n * 100) / 100;

// The iPhone canvas is taller (2.17:1 vs 1.78:1), so a plain proportional map
// leaves a dead band between headline and phone. Instead the caption keeps
// its size and hugs its own edge, and the phone + cards grow by K into the
// extra height, anchored to the opposite edge.
const S = T.w / SRC.w; // 1.222 — caption scale
const K = 1.2; // phone scale — the flat frame fills its box, unlike the 3D body
const K_UP = 1.4; // phone scale when the headline sits at the bottom
const GAP = 70; // minimum air between phone and a bottom headline (iOS px)
const DEFAULT_CAP = { x: 86, y: 96, width: 908, height: 400, rotation: 0, zIndex: 4 };

// Where slide i's headline sits on Android, which decides how its phone and
// cards anchor. Slides on the layout's default caption get the usual top rect.
function anchorOf(i) {
  const slide = src[i];
  if (!slide) return { top: true, cap: DEFAULT_CAP };
  const c = slide.transforms?.caption;
  const top = c ? c.y + c.height / 2 < SRC.h / 2 : slide.layout !== "device-top";
  return { top, cap: c ?? (top ? DEFAULT_CAP : undefined) };
}

function remap(t, mode, slideIndex) {
  // Connected canvas: an element parked on a neighbouring screen (x < 0 or
  // > w) maps within that screen, using that screen's anchoring, then shifts
  // by whole iPhone widths.
  const cx = t.x + t.width / 2;
  const n = mode === "caption" ? 0 : Math.floor(cx / SRC.w);
  const { top, cap } = anchorOf(slideIndex + n);
  if (mode === "caption") {
    // Centered on iOS: a few Android captions were nudged sideways by hand and
    // would clip on the wider canvas.
    const w = t.width * S, h = t.height * S;
    const y = top ? t.y * S : T.h - (SRC.h - t.y) * S;
    return { ...t, x: r2((T.w - w) / 2), y: r2(y), width: r2(w), height: r2(h) };
  }
  // Cards keep Android's horizontal composition (scale with width) and grow a
  // touch; the phone takes K, or K_UP when the headline sits at the bottom
  // and there is no top headline to clear.
  const g = mode === "focus" ? S * 1.06 : top ? K : K_UP;
  const w = t.width * g, h = t.height * g;
  const x = n * T.w + T.w / 2 + (cx - n * SRC.w - SRC.w / 2) * (mode === "focus" ? S : K) - w / 2;
  let y;
  if (!top && cap) {
    // Keep the Android gap above the headline, scaled; the phone grows upward
    // and never closer than GAP to the label.
    const ct2 = T.h - (SRC.h - cap.y) * S;
    const bottom = ct2 - (cap.y - (t.y + t.height)) * g;
    y = (mode === "focus" ? bottom : Math.min(bottom, ct2 - GAP)) - h;
  } else if (!top) y = t.y * g;
  else {
    // Keep the Android gap under the headline, scaled, so the phone grows down.
    const cb = cap.y + cap.height, cb2 = (cap.y + cap.height) * S;
    y = cb2 + (t.y - cb) * g;
  }
  return { ...t, x: r2(x), y: r2(y), width: r2(w), height: r2(h) };
}
const modeOf = (k) => (k === "caption" ? "caption" : k === "focus" ? "focus" : "other");

// Seam colors shared by neighbouring slides (index = seam after slide i).
const SEAM = ["#FFCFC0", "#C6D3FF", "#FFDDBE", "#D3C4FF", "#BFE6D2", "#FFD0CC", "#D6CCFF"];
const seamLeft = (i) => (i > 0 ? [{ color: SEAM[i - 1], x: 0, y: 52, w: 34, h: 22 }] : []);
const seamRight = (i) => (i < SEAM.length ? [{ color: SEAM[i], x: 100, y: 52, w: 34, h: 22 }] : []);

// Keyed by the Android slide id. `stops` run top → bottom.
const BACKGROUNDS = {
  // Hero: lilac dawn, violet halo behind the phone.
  "01-home": {
    stops: ["#FBF8FF 0%", "#F1E8FF 34%", "#E2D2FF 70%", "#D4C0FF 100%"],
    glows: [
      { color: "#C9AEFF", x: 52, y: 70, w: 62, h: 30 },
      { color: "#FFD3E6", x: 6, y: 26, w: 40, h: 16 },
    ],
  },
  // Device-top: deeper peach crown, airy cream floor under the headline.
  "02-prompts": {
    stops: ["#FFD9CC 0%", "#FFE6DC 40%", "#FFF3EC 72%", "#FFFAF6 100%"],
    glows: [
      { color: "#FFBFD3", x: 62, y: 22, w: 58, h: 24 },
      { color: "#FFE9C9", x: 18, y: 48, w: 36, h: 14 },
    ],
  },
  // Device-bottom: periwinkle, cool and clear for the charts.
  "04-insights": {
    stops: ["#F7F9FF 0%", "#E8EEFF 34%", "#D6E0FF 70%", "#C7D3FF 100%"],
    glows: [
      { color: "#BFDDFF", x: 26, y: 74, w: 52, h: 24 },
      { color: "#DCCBFF", x: 84, y: 88, w: 46, h: 20 },
    ],
  },
  // Device-top: apricot crown fading to cream for the bottom headline.
  "05-journal": {
    stops: ["#FFDCC2 0%", "#FFE8D6 40%", "#FFF4EA 72%", "#FFFAF4 100%"],
    glows: [
      { color: "#FFC6D4", x: 78, y: 26, w: 50, h: 22 },
      { color: "#FFE3B8", x: 20, y: 18, w: 40, h: 16 },
    ],
  },
  // Hero: Lumi's violet, richest pool on the deck.
  "03-lumi": {
    stops: ["#F8F5FF 0%", "#EAE2FF 34%", "#D8CBFF 70%", "#C7B6FF 100%"],
    glows: [
      { color: "#B9A0FF", x: 50, y: 70, w: 64, h: 30 },
      { color: "#E9D3FF", x: 90, y: 30, w: 34, h: 14 },
    ],
  },
  // Hero: mint meadow with a butter-sun corner.
  "06-goals": {
    stops: ["#F6FCF8 0%", "#E4F5EA 34%", "#CFEEDC 70%", "#BFE6D0 100%"],
    glows: [
      { color: "#FFE7B2", x: 88, y: 14, w: 44, h: 16 },
      { color: "#B2E2C8", x: 46, y: 80, w: 60, h: 26 },
    ],
  },
  // Device-bottom: warm blush into a calm lavender base.
  "07-security": {
    stops: ["#FFF7F2 0%", "#FBE8EE 34%", "#ECE0FA 70%", "#DCD6FF 100%"],
    glows: [
      { color: "#F7C8DD", x: 18, y: 76, w: 46, h: 22 },
      { color: "#C9CFFF", x: 86, y: 86, w: 46, h: 20 },
    ],
  },
  // Device-bottom: dusk lilac with a golden horizon — the letter's sunset.
  "08-drift": {
    stops: ["#FAF7FF 0%", "#ECE8FF 36%", "#E2E2FF 66%", "#FFE6CC 100%"],
    glows: [
      { color: "#CFE0FF", x: 72, y: 58, w: 46, h: 20 },
      { color: "#FFD9B0", x: 30, y: 96, w: 60, h: 16 },
    ],
  },
};

// iOS-only line breaks for es/fr. Same words as Android, rebroken so each
// headline stays at two lines (about 20 characters each) on the iPhone
// canvas; Android's breaks wrapped to three and ran into the phone.
const HEADLINES = {
  "02-prompts": { es: "Encuentra palabras\ncuando se sienten *lejos*.", fr: "Trouvez les mots\nquand ils se font *rares*." },
  "04-insights": { fr: "Voyez ce que vos\njours vous *révèlent*." },
  "05-journal": { es: "Un ritmo que se\nsiente muy *tuyo*.", fr: "Un rythme qui\nvous ressemble\n*vraiment*." },
  "03-lumi": { es: "Háblalo con una\nguía más *amable*.", fr: "Parlez-en avec une\naide plus *douce*." },
  "06-goals": { es: "Metas pequeñas.\nUn impulso *amable*.", fr: "De petits objectifs.\nUn élan *tout doux*." },
  "07-security": { es: "Seguridad en la\nque puedes *confiar*.", fr: "Une sécurité\nvraiment *fiable*." },
  "08-drift": { es: "Tus palabras,\ndonde deban *llegar*." },
};

// Headlines that genuinely need a third line: lift the whole composition
// (headline, phone, cards) by one line so nothing runs off the bottom.
const LIFT = { "05-journal": { fr: 130 } };

// Extra per-locale crops. The fr/es home captures are scrolled, so their
// greeting row collides with the Android status bar; trim both off.
const CROPS = {
  "01-home": { fr: { top: 0.036 }, es: { top: 0.062 } },
};

state.slidesByDevice.iphone = src.map((slide, i) => {
  const out = structuredClone(slide);
  out.id = `${slide.id}-ios`;
  delete out.textElements;

  // Write the default caption out so iOS places it the same way.
  if (!slide.transforms?.caption && anchorOf(i).top) out.transforms = { ...out.transforms, caption: structuredClone(DEFAULT_CAP) };
  const m = (t, k) => remap(t, modeOf(k), i);
  for (const k of Object.keys(out.transforms ?? {})) out.transforms[k] = m(out.transforms[k], k);
  for (const byEl of Object.values(out.transformsByLocale ?? {})) {
    for (const k of Object.keys(byEl)) byEl[k] = m(byEl[k], k);
  }
  for (const f of out.focusElements ?? []) {
    f.transform = m(f.transform, "focus");
    for (const loc of Object.keys(f.transformByLocale ?? {})) f.transformByLocale[loc] = m(f.transformByLocale[loc], "focus");
  }
  // The flat mockup reads as a real iPhone; the WebGL 3D body does not.
  for (const k of ["frame", "frameSecondary"]) {
    if (out[k]) out[k] = { ...out[k], style: "flat", color: "white-titanium" };
  }

  // Android captures end in a back/home/recents bar (~5% of 1610px). Trim it
  // in every locale on iOS; deeper Android crops (e.g. fr's 12%) win.
  const crop = { ...(out.screenshotCropByLocale ?? {}) };
  for (const loc of state.locales) crop[loc] = { ...crop[loc], bottom: Math.max(crop[loc]?.bottom ?? 0, 0.05) };
  for (const [loc, extra] of Object.entries(CROPS[slide.id] ?? {})) crop[loc] = { ...crop[loc], ...extra };
  out.screenshotCropByLocale = crop;
  out.headline = { ...out.headline, ...HEADLINES[slide.id] };
  for (const [loc, dy] of Object.entries(LIFT[slide.id] ?? {})) {
    const up = (t) => ({ ...t, y: r2(t.y - dy) });
    const byEl = (out.transformsByLocale ??= {})[loc] ?? {};
    for (const [k, t] of Object.entries(out.transforms ?? {})) byEl[k] = up(byEl[k] ?? t);
    out.transformsByLocale[loc] = byEl;
    for (const f of out.focusElements ?? []) {
      if (f.locales && !f.locales.includes(loc)) continue;
      (f.transformByLocale ??= {})[loc] = up(f.transformByLocale[loc] ?? f.transform);
    }
  }

  const bg = BACKGROUNDS[slide.id];
  if (bg) {
    out.background = {
      kind: "gradient",
      angle: 180,
      stops: bg.stops,
      // Seams last so the hero pools paint over them where they overlap.
      glows: [...bg.glows, ...seamLeft(i), ...seamRight(i)],
    };
  }
  return out;
});

fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + "\n");
console.log("seeded iphone with", src.length, "slides");
