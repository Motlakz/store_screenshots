// Turns a Theme's optional style layer into concrete values the canvas can
// render. Themes that set only the six flat colors resolve to the original
// look, so nothing that existed before this file changes appearance.

import type {
  Theme,
  ThemeBackground,
  ThemeDecor,
  ThemeDevice,
  ThemeEmphasis,
  ThemeFont,
} from "./types";

// Font stacks. The var(--font-*) names are bound in app/layout.tsx.
export const FONTS = {
  sans: "var(--font-inter), Inter, system-ui, sans-serif",
  rounded: "var(--font-quicksand), Quicksand, Inter, system-ui, sans-serif",
  display: "var(--font-montserrat), Montserrat, Inter, system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
  script: "var(--font-caveat), Caveat, 'Segoe Script', cursive",
  serif: "var(--font-instrument-serif), 'Instrument Serif', Georgia, serif",
  slab: "var(--font-alfa), 'Alfa Slab One', Cooper Black, Georgia, serif",
} as const;

/**
 * Every face the editor can apply, including the ones themes use but the UI
 * never previously exposed. The three system entries need no download, so they
 * render even offline.
 */
export const FONT_CHOICES: Array<{ id: string; label: string; family: string; note?: string }> = [
  { id: "sans", label: "Inter", family: FONTS.sans, note: "Neutral sans" },
  { id: "rounded", label: "Quicksand", family: FONTS.rounded, note: "Soft rounded sans" },
  { id: "display", label: "Montserrat", family: FONTS.display, note: "Confident geometric display" },
  { id: "brand-mono", label: "JetBrains Mono", family: FONTS.mono, note: "Timers and field-note labels" },
  { id: "serif", label: "Instrument Serif", family: FONTS.serif, note: "Thin editorial serif" },
  { id: "slab", label: "Alfa Slab One", family: FONTS.slab, note: "Heavy display slab" },
  { id: "script", label: "Caveat", family: FONTS.script, note: "Brush-pen script" },
  { id: "system", label: "System UI", family: "system-ui, -apple-system, sans-serif" },
  { id: "georgia", label: "Georgia", family: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "System monospace", family: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export function fontById(id: string | undefined): { id: string; label: string; family: string } | null {
  if (!id) return null;
  return FONT_CHOICES.find((f) => f.id === id) ?? null;
}

/** Reverse lookup so a theme's raw family string maps back to a picker entry. */
export function fontIdForFamily(family: string | undefined): string | null {
  if (!family) return null;
  return FONT_CHOICES.find((f) => f.family === family)?.id ?? null;
}

export type ResolvedStyle = {
  headline: Required<Pick<ThemeFont, "family" | "weight" | "scale" | "lineHeight">> & ThemeFont;
  label: Required<Pick<ThemeFont, "family" | "weight" | "scale">> & ThemeFont;
  emphasis: ThemeEmphasis | null;
  device: ThemeDevice;
  decor: ThemeDecor;
};

export function resolveStyle(theme: Theme): ResolvedStyle {
  return {
    headline: {
      family: FONTS.sans,
      weight: 700,
      scale: 1,
      lineHeight: 0.96,
      letterSpacing: -0.012,
      ...theme.headline,
    },
    label: {
      family: FONTS.sans,
      weight: 600,
      scale: 1,
      transform: "uppercase",
      ...theme.label,
    },
    emphasis: theme.emphasis ?? null,
    device: theme.device ?? {},
    // Blurred orbs stay the default so pre-existing themes look untouched.
    decor: theme.decor ?? { blobs: true },
  };
}

/** Nudge a hex color lighter (positive) or darker (negative) by percent. */
export function shade(hex: string, percent: number): string {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round((255 * percent) / 100);
  const clamp = (v: number) => Math.max(0, Math.min(255, v + amt));
  const r = clamp((num >> 16) & 0xff);
  const g = clamp((num >> 8) & 0xff);
  const b = clamp(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function toCss(bg: ThemeBackground): string {
  if (bg.kind === "solid") return bg.color;
  if (bg.kind === "gradient") {
    const angle = bg.angle ?? 180;
    return `linear-gradient(${angle}deg, ${bg.stops.join(", ")})`;
  }
  // "solids" is resolved per slide by backgroundCss(); this is the fallback.
  return bg.colors[0] ?? "#ffffff";
}

/**
 * CSS background for one slide. `slideIndex` drives the per-slide solid
 * rotation used by the editorial style; every other kind ignores it.
 */
export function backgroundCss(
  theme: Theme,
  inverted: boolean,
  slideIndex = 0,
  override?: ThemeBackground,
): string {
  const spec = override ?? (inverted ? theme.backgroundAlt ?? theme.background : theme.background);
  if (spec) {
    if (spec.kind === "solids" && spec.colors.length > 0) {
      return spec.colors[slideIndex % spec.colors.length];
    }
    return toCss(spec);
  }
  // Legacy default: a barely-there vertical wash off the flat color.
  const base = inverted ? theme.bgAlt : theme.bg;
  return `linear-gradient(160deg, ${base} 0%, ${shade(base, inverted ? -8 : -6)} 100%)`;
}

/**
 * Foreground text color for a slide. Solid-rotation backgrounds need the
 * contrast picked per slide, since one of the blocks is cream and the rest dark.
 */
/**
 * The dominant surface color behind a slide — what contrast decisions run
 * against. Gradients are judged by their first stop.
 */
export function surfaceColorFor(
  theme: Theme,
  inverted: boolean,
  slideIndex = 0,
  override?: ThemeBackground,
): string {
  const spec = override ?? (inverted ? theme.backgroundAlt ?? theme.background : theme.background);
  if (!spec) return inverted ? theme.bgAlt : theme.bg;
  if (spec.kind === "solid") return spec.color;
  if (spec.kind === "solids") {
    return spec.colors[slideIndex % spec.colors.length] ?? theme.bg;
  }
  return stopColorOf(spec.stops[0]) ?? theme.bg;
}

function stopColorOf(stop: string | undefined): string | null {
  if (!stop) return null;
  const m = /#[0-9a-fA-F]{3,8}/.exec(stop);
  return m ? m[0] : null;
}

/**
 * Pick whichever of the theme's two inks reads better on `surface`. Comparing
 * contrast rather than assuming fg pairs with light (or dark) is what keeps
 * arbitrary user-picked backgrounds legible.
 */
export function inkFor(theme: Theme, surface: string): string {
  const s = luminance(surface);
  return Math.abs(luminance(theme.fg) - s) >= Math.abs(luminance(theme.fgAlt) - s)
    ? theme.fg
    : theme.fgAlt;
}

export function foregroundFor(
  theme: Theme,
  inverted: boolean,
  slideIndex = 0,
  override?: ThemeBackground,
): string {
  return inkFor(theme, surfaceColorFor(theme, inverted, slideIndex, override));
}

/** Perceived brightness, 0–1. */
export function luminance(hex: string): number {
  const c = (hex || "").replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return 1;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.6;
}

/**
 * Emphasis color for a slide. The editorial style always renders its script
 * phrase in coral except on the coral block, where coral-on-coral would vanish.
 */
/**
 * Keep `color` usable on this slide's surface. With a per-slide solid rotation
 * an accent eventually lands on its own block (coral script on the coral
 * block), so swap to the readable ink when that happens.
 */
export function readableOn(
  theme: Theme,
  color: string,
  inverted: boolean,
  slideIndex = 0,
  override?: ThemeBackground,
): string {
  const surface = surfaceColorFor(theme, inverted, slideIndex, override);
  // Too close to the surface to read — fall back to the theme's ink.
  if (nearlyEqual(surface, color)) return inkFor(theme, surface);
  return color;
}

export function emphasisColorFor(
  theme: Theme,
  emphasis: ThemeEmphasis,
  inverted: boolean,
  slideIndex = 0,
  override?: ThemeBackground,
): string {
  return readableOn(theme, emphasis.color, inverted, slideIndex, override);
}

function nearlyEqual(a: string, b: string): boolean {
  const norm = (h: string) => {
    const c = h.replace("#", "").toLowerCase();
    return c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  };
  const x = parseInt(norm(a), 16);
  const y = parseInt(norm(b), 16);
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  const d = (m: number, n: number, s: number) => Math.abs(((m >> s) & 0xff) - ((n >> s) & 0xff));
  return d(x, y, 16) + d(x, y, 8) + d(x, y, 0) < 90;
}

/** Inline SVG data URI for the paper-grain overlay. */
export function grainCss(opacity: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='120' height='120' filter='url(#n)' opacity='${opacity}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
