import { FONTS } from "./style";
import type { Device, Orientation, SlideLayout, Theme, ThemeId } from "./types";

// ---------- Canvas dimensions (design at largest required resolution) ----------
export const CANVAS: Record<Device, { w: number; h: number; wL?: number; hL?: number }> = {
  iphone:        { w: 1320, h: 2868 },
  ipad:          { w: 2064, h: 2752 },
  android:       { w: 1080, h: 1920 },
  "android-7":   { w: 1200, h: 1920, wL: 1920, hL: 1200 },
  "android-10":  { w: 1600, h: 2560, wL: 2560, hL: 1600 },
  "feature-graphic": { w: 1024, h: 500 },
};

// ---------- Export sizes per device ----------
export type ExportSize = { label: string; w: number; h: number };

export const EXPORT_SIZES: Record<Device, ExportSize[]> = {
  iphone: [
    { label: '6.9"', w: 1320, h: 2868 },
    { label: '6.5"', w: 1284, h: 2778 },
    { label: '6.3"', w: 1206, h: 2622 },
    { label: '6.1"', w: 1125, h: 2436 },
  ],
  ipad: [
    { label: '13" iPad',       w: 2064, h: 2752 },
    { label: '12.9" iPad Pro', w: 2048, h: 2732 },
  ],
  android:       [{ label: "Phone",          w: 1080, h: 1920 }],
  "android-7":   [{ label: '7" Portrait',    w: 1200, h: 1920 }],
  "android-10":  [{ label: '10" Portrait',   w: 1600, h: 2560 }],
  "feature-graphic": [{ label: "Feature Graphic", w: 1024, h: 500 }],
};

// Landscape sizes (tablets only)
export const EXPORT_SIZES_LANDSCAPE: Partial<Record<Device, ExportSize[]>> = {
  "android-7":  [{ label: '7" Landscape',  w: 1920, h: 1200 }],
  "android-10": [{ label: '10" Landscape', w: 2560, h: 1600 }],
};

export function supportsLandscape(device: Device): boolean {
  return device in EXPORT_SIZES_LANDSCAPE;
}

export function getExportSizes(device: Device, orientation: Orientation): ExportSize[] {
  if (orientation === "landscape") {
    return EXPORT_SIZES_LANDSCAPE[device] || EXPORT_SIZES[device];
  }
  return EXPORT_SIZES[device];
}

// ---------- Frame aspect ratios ----------
export const MK_RATIO    = 1022 / 2082; // iPhone PNG mockup
export const TAB_P_RATIO = 0.667;        // tablet portrait
export const TAB_L_RATIO = 1.5;          // tablet landscape
export const IPAD_RATIO  = 0.770;        // iPad

// iPhone mockup screen overlay (pre-measured)
export const PHONE_SCREEN = {
  L: (52 / 1022) * 100,
  T: (46 / 2082) * 100,
  W: (918 / 1022) * 100,
  H: (1990 / 2082) * 100,
  RX: (126 / 918) * 100,
  RY: (126 / 1990) * 100,
};

// ---------- Width formula helpers ----------
export function phoneW(cW: number, cH: number, clamp = 0.84) {
  return Math.min(clamp, 0.72 * (cH / cW) * MK_RATIO);
}
export function phoneWSmall(cW: number, cH: number) {
  return phoneW(cW, cH, 0.66);
}
export function tabletPW(cW: number, cH: number, clamp = 0.80) {
  return Math.min(clamp, 0.72 * (cH / cW) * TAB_P_RATIO);
}
export function tabletLW(cW: number, cH: number, clamp = 0.62) {
  return Math.min(clamp, 0.75 * (cH / cW) * TAB_L_RATIO);
}
export function ipadW(cW: number, cH: number, clamp = 0.75) {
  return Math.min(clamp, 0.72 * (cH / cW) * IPAD_RATIO);
}

// ---------- Themes ----------
export const DEFAULT_THEME_ID: ThemeId = "clean-light";

export const THEMES: Record<string, Theme> = {
  "clean-light": {
    id: "clean-light",
    name: "Clean Light",
    bg: "#F6F1EA",
    bgAlt: "#171717",
    fg: "#171717",
    fgAlt: "#F6F1EA",
    accent: "#5B7CFA",
    muted: "#6B7280",
  },
  "dark-bold": {
    id: "dark-bold",
    name: "Dark Bold",
    bg: "#0B1020",
    bgAlt: "#F8FAFC",
    fg: "#F8FAFC",
    fgAlt: "#0B1020",
    accent: "#8B5CF6",
    muted: "#94A3B8",
  },
  "warm-editorial": {
    id: "warm-editorial",
    name: "Warm Editorial",
    bg: "#F7E8DA",
    bgAlt: "#2B1D17",
    fg: "#2B1D17",
    fgAlt: "#F7E8DA",
    accent: "#D97706",
    muted: "#7C5A47",
  },
  "ocean-fresh": {
    id: "ocean-fresh",
    name: "Ocean Fresh",
    bg: "#E0F2FE",
    bgAlt: "#0C4A6E",
    fg: "#0C4A6E",
    fgAlt: "#E0F2FE",
    accent: "#0284C7",
    muted: "#475569",
  },
  "bloom-roast": {
    id: "bloom-roast",
    name: "Bloom Roast",
    bg: "#F2ECE2",
    bgAlt: "#24352F",
    fg: "#1D2420",
    fgAlt: "#FFF7EA",
    accent: "#B8794A",
    muted: "#65736B",
  },

  // ---------- Named styles ----------
  // Confidently human, slightly imperfect. One solid color block per slide,
  // one brush-script phrase per headline, always coral.
  "hand-drawn-editorial": {
    id: "hand-drawn-editorial",
    name: "Hand-Drawn Editorial",
    bg: "#1B2336",
    bgAlt: "#F5EFDF",
    fg: "#F5EFDF",
    fgAlt: "#1B2336",
    accent: "#E55846",
    muted: "#8B7BFF",
    background: { kind: "solids", colors: ["#1B2336", "#F5EFDF", "#E55846", "#8B7BFF"] },
    headline: { family: FONTS.sans, weight: 500, lineHeight: 1.02, letterSpacing: -0.015 },
    label: { family: FONTS.sans, weight: 600, transform: "lowercase", scale: 0.95 },
    emphasis: {
      family: FONTS.script,
      color: "#F26A50",
      weight: 700,
      scale: 1.22,
      rotation: -3,
      lineHeight: 0.9,
    },
    device: { tilt: -14, shadow: "0 42px 90px rgba(27, 35, 54, 0.38)" },
    decor: { motifs: ["squiggle", "star", "arrow"], motifColor: "#E55846", wordmark: true },
  },

  // Cream, mustard and mint. Sticker UI with hard black ink and offset shadows.
  "retro-rubberhose": {
    id: "retro-rubberhose",
    name: "Retro Rubberhose",
    bg: "#F4E6CC",
    bgAlt: "#1A1A1A",
    fg: "#1A1A1A",
    fgAlt: "#F4E6CC",
    accent: "#F2BB46",
    muted: "#BFD9B6",
    background: { kind: "gradient", stops: ["#F4E6CC 0%", "#F0DEBE 100%"], angle: 165 },
    backgroundAlt: { kind: "solid", color: "#F3A6B7" },
    headline: { family: FONTS.slab, weight: 400, lineHeight: 1.0, letterSpacing: -0.005 },
    label: { family: FONTS.sans, weight: 700, transform: "uppercase", scale: 0.9 },
    emphasis: { family: FONTS.slab, color: "#F2BB46", weight: 400, scale: 1.0 },
    device: {
      bezel: "#F4E6CC",
      bezelStroke: "#1A1A1A",
      bezelStrokeWidth: 3,
      tilt: 0,
      shadow: "0 3px 0 #1A1A1A, 10px 12px 0 rgba(26,26,26,0.16)",
    },
    // Grain on every background; no pure white, no cold colors.
    decor: { grain: 0.07, motifs: ["squiggle", "star"], motifColor: "#1A1A1A" },
  },

  // The photography IS the brand — everything here is restraint around it.
  "moody-curated": {
    id: "moody-curated",
    name: "Moody Curated",
    bg: "#1A2026",
    bgAlt: "#0E0E10",
    fg: "#F4EBDD",
    fgAlt: "#F4EBDD",
    accent: "#C99566",
    muted: "#8A8073",
    background: {
      kind: "gradient",
      stops: ["#2A2119 0%", "#1A2026 55%", "#0E0E10 100%"],
      angle: 165,
    },
    headline: {
      family: FONTS.serif,
      weight: 400,
      lineHeight: 1.08,
      letterSpacing: -0.005,
    },
    label: { family: FONTS.sans, weight: 500, transform: "uppercase", scale: 0.85 },
    emphasis: { family: FONTS.serif, color: "#E8B97A", weight: 400, italic: true, scale: 1.0 },
    device: { bezel: "#0E0E10", tilt: 0, shadow: "0 50px 120px rgba(0,0,0,0.55)" },
    decor: { vignette: 0.45, grain: 0.05, scrim: true },
  },

  // Canonical cotton-candy version of the style SpeakDiary ships.
  "dreamy-pastel": {
    id: "dreamy-pastel",
    name: "Dreamy Pastel",
    bg: "#DDEBFA",
    bgAlt: "#FBE3D7",
    fg: "#1B2240",
    fgAlt: "#1B2240",
    accent: "#5B3FC8",
    muted: "#8A8FA3",
    background: {
      kind: "gradient",
      stops: ["#DDEBFA 0%", "#F5E0F0 45%", "#FCEFD6 100%"],
      angle: 180,
    },
    backgroundAlt: {
      kind: "gradient",
      stops: ["#FBE3D7 0%", "#F7C9D6 50%", "#F3B6CC 100%"],
      angle: 180,
    },
    headline: { family: FONTS.rounded, weight: 650, lineHeight: 0.98, letterSpacing: -0.012 },
    label: { family: FONTS.rounded, weight: 600, transform: "uppercase" },
    emphasis: { family: FONTS.serif, color: "#B49BE6", weight: 400, italic: true, scale: 1.08 },
    decor: { dreamy: true, motifs: ["heart", "sparkle", "paw"], motifColor: "#F39A9A" },
  },
};

// Shared starters plus the active app's own palettes. App themes win on id
// collision, so an app can override a shared theme without touching this file.
export function resolveThemes(appThemes?: Theme[]): Record<string, Theme> {
  if (!appThemes || appThemes.length === 0) return THEMES;
  const merged: Record<string, Theme> = { ...THEMES };
  for (const theme of appThemes) {
    if (theme && typeof theme.id === "string" && theme.id) merged[theme.id] = theme;
  }
  return merged;
}

export function themeById(themeId: string | undefined, appThemes?: Theme[]): Theme {
  const themes = resolveThemes(appThemes);
  return themes[themeId || ""] || themes[DEFAULT_THEME_ID];
}

export function hasTheme(themeId: string | undefined, appThemes?: Theme[]): boolean {
  return !!themeId && !!resolveThemes(appThemes)[themeId];
}

// One cache entry per app so switching apps never reads another's cached deck.
const STORAGE_PREFIX = "app-store-screenshots:project:v2";

export function storageKey(appId: string): string {
  return `${STORAGE_PREFIX}:${appId}`;
}

// Remembers which app was open so a reload lands back where you left off.
export const ACTIVE_APP_STORAGE_KEY = "app-store-screenshots:active-app";

// Manual vs auto saving is a workstyle preference, not project data, so it
// lives per browser rather than in any app's project file.
export const SAVE_MODE_STORAGE_KEY = "app-store-screenshots:save-mode";

// Hosted mode only: the list of apps this browser owns. Local mode derives the
// same list from the filenames in projects/, so it never reads this.
export const LOCAL_APPS_STORAGE_KEY = "app-store-screenshots:apps";

export const PROJECT_SCHEMA_VERSION = 2;

export const DEVICE_LABEL: Record<Device, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  android: "Android Phone",
  "android-7": 'Android 7" Tablet',
  "android-10": 'Android 10" Tablet',
  "feature-graphic": "Feature Graphic",
};

// Friendly labels for slide layouts (used in dropdowns)
export const LAYOUT_LABEL: Record<SlideLayout, string> = {
  hero: "Hero",
  "device-bottom": "Device bottom",
  "device-top": "Device top",
  "two-devices": "Two devices",
  "no-device": "No device",
  "split-landscape": "Split (landscape)",
  "feature-graphic": "Feature graphic",
};

// Short description shown under each layout name
export const LAYOUT_HINT: Record<SlideLayout, string> = {
  hero: "Headline above, device at bottom",
  "device-bottom": "Headline top, device anchored below",
  "device-top": "Flipped — device on top",
  "two-devices": "Layered back + front phones",
  "no-device": "Big standalone headline",
  "split-landscape": "Caption left, device right",
  "feature-graphic": "1024×500 Play Store banner",
};
